import {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref} from "react"
import {Box, Button, CircularProgress, CssBaseline, GlobalStyles, LinearProgress, Stack, Typography} from "@mui/material"
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew"
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos"
import {SnackbarProvider, useSnackbar} from "notistack"
import type {DialogSpec, FormSchema} from "./schema"
import {resolveTexts} from "./texts"
import {FormStore, useFormVersion, type Scalar} from "./store"
import {applyDefaults, collectValues, findStep, isPageValid, pageDialogs, pageProgress} from "./logic"
import {ensureSession, getDataset, insertDataset, loadDraft, resumeByValue, saveDraft, updateDataset, uploadFile} from "./api"
import type {DraftPayload} from "./store"
import {DirectionScope} from "./theme/DirectionScope"
import {contentAnimSx} from "./theme/animations"
import {FormContextProvider} from "./context"
import ItemList from "./fields/ItemList"
import AlertDialog from "./ui/AlertDialog"
import BottomSheet from "./ui/BottomSheet"
import LoadingHover from "./ui/LoadingHover"
import RichContent from "./ui/RichContent"
import {pushSnackbar} from "./ui/CustomSnackbar"
import loadingUrl from "./assets/loading.svg?no-inline"
import timeUrl from "./assets/time.svg?no-inline"

/** Imperative API for reading/writing field values (including `hidden` fields). */
export interface MultiStepFormHandle {
    getValue(name: string): Scalar | undefined
    setValue(name: string, value: Scalar): void
    getValues(): Record<string, Scalar>
    setValues(partial: Record<string, Scalar>): void
}

export interface MultiStepFormProps {
    schema?: FormSchema
    schemaUrl?: string
    apiBase?: string
    /**
     * Value for the table `resumeColumn` (e.g. phone from a landing page).
     * When the browser session is missing/expired, the form resumes or creates the row via POST /resume.
     */
    resumeValue?: string
    onFinished?: (result: { id?: number; key?: string }) => void
    /** Called once after the form session is ready (draft/resume hydrated). */
    onReady?: (api: MultiStepFormHandle) => void
}

export const MultiStepForm = forwardRef<MultiStepFormHandle, MultiStepFormProps>(function MultiStepForm(props, ref) {
    return <FormShell {...props} formRef={ref}/>
})

function FormShell(props: MultiStepFormProps & { formRef?: Ref<MultiStepFormHandle> }) {
    const {schema, schemaUrl, formRef} = props
    const [loaded, setLoaded] = useState<FormSchema | null>(schema ?? null)
    const [error, setError] = useState<string>()
    const dir = loaded?.dir === "ltr" ? "ltr" : "rtl"

    useEffect(() => {
        if (schema) {
            setLoaded(schema)
            setError(undefined)
        }
    }, [schema])

    useEffect(() => {
        if (schema || !schemaUrl) return
        let cancel = false
        fetch(schemaUrl)
            .then((res) => {
                if (!res.ok) throw new Error("Schema request failed")
                return res.json() as Promise<FormSchema>
            })
            .then((data) => {
                if (!cancel) {
                    setLoaded(data)
                    setError(undefined)
                }
            })
            .catch(() => {
                if (!cancel) setError("Schema could not be loaded.")
            })
        return () => {
            cancel = true
        }
    }, [schema, schemaUrl])

    return (
        <DirectionScope dir={dir}>
            <SnackbarProvider
                maxSnack={3}
                anchorOrigin={{vertical: "top", horizontal: "center"}}
                classes={{containerRoot: "msf-snackbar-container"}}
            >
                <FormSession {...props} formRef={formRef} loaded={loaded} error={error} dir={dir}/>
            </SnackbarProvider>
        </DirectionScope>
    )
}

function FormSession({
    apiBase: apiBaseProp,
    resumeValue,
    onFinished,
    onReady,
    formRef,
    loaded,
    error,
    dir,
}: MultiStepFormProps & {
    formRef?: Ref<MultiStepFormHandle>
    loaded: FormSchema | null
    error?: string
    dir: "rtl" | "ltr"
}) {
    const {enqueueSnackbar} = useSnackbar()
    const apiBase = apiBaseProp ?? loaded?.apiBase ?? "/api"
    const storeRef = useRef<FormStore | null>(null)
    if (!storeRef.current || storeRef.current.apiBase !== apiBase) {
        storeRef.current = new FormStore(apiBase)
    }
    const store = storeRef.current
    useFormVersion(store)

    const [ready, setReady] = useState(false)
    const [busy, setBusy] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [finished, setFinished] = useState(false)
    const [anim, setAnim] = useState("active")
    const [pending, setPending] = useState<{ spec: DialogSpec; resolve: (ok: boolean) => void } | null>(null)
    const lastSavedRef = useRef<string>("")
    const readyNotified = useRef(false)
    const ask = useCallback((spec: DialogSpec) => {
        return new Promise<boolean>((resolve) => {
            setPending({spec, resolve})
        })
    }, [])

    const api = useMemo<MultiStepFormHandle>(() => ({
        getValue: (name) => store.get(name),
        setValue: (name, value) => store.set(name, value),
        getValues: () => ({...store.values}),
        setValues: (partial) => store.mergeValues(partial),
    }), [store])

    useImperativeHandle(formRef, () => api, [api])

    useEffect(() => {
        readyNotified.current = false
    }, [loaded])

    useEffect(() => {
        if (!ready || readyNotified.current) return
        readyNotified.current = true
        onReady?.(api)
    }, [ready, api, onReady])

    function closePrompt(ok: boolean) {
        pending?.resolve(ok)
        setPending(null)
    }

    const texts = useMemo(() => resolveTexts(loaded?.texts), [loaded])
    const validators = {}

    useEffect(() => {
        if (!loaded) return
        let cancel = false
        applyDefaults(loaded, store)
        lastSavedRef.current = ""
        ;(async () => {
            try {
                await ensureSession(apiBase)
                const landingValue = resumeValue?.trim()
                if (landingValue) {
                    const resumed = await resumeByValue(apiBase, loaded.id, landingValue)
                    if (!cancel && resumed.status === "ok" && resumed.data) {
                        applyResume(store, loaded.id, resumed.data.draft, resumed.data.row)
                        lastSavedRef.current = store.saveFingerprint(loaded.id)
                        return
                    }
                }

                const draft = await loadDraft(apiBase)
                if (cancel || draft.status !== "ok" || !draft.data || draft.data.id !== loaded.id) return

                if (draft.data.rowKey) {
                    const row = await getDataset(apiBase, loaded.id, draft.data.rowKey)
                    if (!cancel && row.status === "ok" && row.data) {
                        hydrateFromDataset(store, loaded.id, draft.data, row.data)
                    } else if (!cancel) {
                        store.hydrate(draft.data)
                    }
                } else if (!cancel) {
                    store.hydrate(draft.data)
                }
                if (!cancel) lastSavedRef.current = store.saveFingerprint(loaded.id)
            } catch {
            } finally {
                if (!cancel) setReady(true)
            }
        })()
        return () => {
            cancel = true
        }
    }, [loaded, apiBase, store, resumeValue])

    const page = loaded?.pages[store.page]
    const pageValid = loaded && page ? isPageValid(page, store, texts, validators) : false
    const nextIndex = loaded ? findStep(loaded.pages, store.page, 1, store.values) : -1
    const prevIndex = loaded ? findStep(loaded.pages, store.page, -1, store.values) : -1
    const isLast = nextIndex < 0
    const progress = loaded ? pageProgress(loaded.pages, store.page, store.values) : 0

    async function animateTo(index: number, direction: "next" | "prev") {
        setBusy(true)
        setAnim(direction === "next" ? "leave-right" : "leave-left")
        await wait(300)
        store.setPage(index)
        setAnim(direction === "next" ? "enter-left" : "enter-right")
        await wait(300)
        setAnim("active")
        setBusy(false)
    }

    async function persist(finalStep: boolean): Promise<"ok" | "invalid" | "offline"> {
        if (!loaded) return "invalid"
        const fingerprint = store.saveFingerprint(loaded.id)
        const changed = fingerprint !== lastSavedRef.current || finalStep
        if (!changed && store.rowKey && !store.hasDirtyFiles()) {
            return "ok"
        }

        const values = collectValues(loaded, store)
        values.page = store.page
        if (finalStep) values.submitted = true
        try {
            let key = store.rowKey
            if (!key) {
                const resumeColumn = loaded.resumeColumn
                const resumeRaw = resumeColumn ? values[resumeColumn] : null
                const resumeVal = resumeRaw === null || resumeRaw === undefined ? "" : String(resumeRaw).trim()

                if (resumeColumn && resumeVal) {
                    const resumed = await resumeByValue(apiBase, loaded.id, resumeVal)
                    if (resumed.status !== "ok" || !resumed.data?.key) {
                        if (resumed.errors) store.setServerErrors(resumed.errors)
                        pushSnackbar(enqueueSnackbar, "error", resumed.message || texts.fixErrors)
                        return "invalid"
                    }
                    if (resumed.data.resumed || resumed.data.sessionPresent) {
                        applyResume(store, loaded.id, resumed.data.draft, resumed.data.row)
                        // Keep non-empty values the user just entered on this step.
                        const keep: Record<string, string | number | boolean | null> = {}
                        for (const [name, value] of Object.entries(values)) {
                            if (value !== null && value !== "") keep[name] = value as string | number | boolean
                        }
                        if (Object.keys(keep).length) store.mergeValues(keep)
                    } else {
                        store.setRow(resumed.data.key, resumed.data.id)
                    }
                    key = store.rowKey || resumed.data.key
                    const merged = collectValues(loaded, store)
                    merged.page = store.page
                    if (finalStep) merged.submitted = true
                    const updated = await updateDataset(apiBase, loaded.id, key, merged)
                    if (updated.status !== "ok") {
                        if (updated.errors) store.setServerErrors(updated.errors)
                        pushSnackbar(enqueueSnackbar, "error", updated.message || texts.fixErrors)
                        return "invalid"
                    }
                    await saveDraft(apiBase, store.draft(loaded.id))
                } else {
                    const created = await insertDataset(apiBase, loaded.id, values)
                    if (created.status !== "ok" || !created.data?.key) {
                        if (created.errors) store.setServerErrors(created.errors)
                        pushSnackbar(enqueueSnackbar, "error", created.message || texts.fixErrors)
                        return "invalid"
                    }
                    key = created.data.key
                    store.setRow(key, created.data.id)
                    await saveDraft(apiBase, store.draft(loaded.id))
                }
            } else if (changed) {
                const updated = await updateDataset(apiBase, loaded.id, key, values)
                if (updated.status !== "ok") {
                    if (updated.errors) store.setServerErrors(updated.errors)
                    pushSnackbar(enqueueSnackbar, "error", updated.message || texts.fixErrors)
                    return "invalid"
                }
            }
            const active = Object.entries(store.files)
                .filter(([, file]) => file.dirty && file.blob)
                .map(([name]) => name)
            for (const name of active) {
                const file = store.files[name]
                if (!file?.blob || !key) continue
                const uploaded = await uploadFile(apiBase, loaded.id, key, name, file.blob)
                if (uploaded.status !== "ok") {
                    if (uploaded.errors) store.setServerErrors(uploaded.errors)
                    pushSnackbar(enqueueSnackbar, "error", uploaded.message || texts.fixErrors)
                    return "invalid"
                }
                store.setFile(name, {...file, dirty: false, onServer: true})
            }
            lastSavedRef.current = store.saveFingerprint(loaded.id)
            return "ok" as const
        } catch {
            return "offline" as const
        }
    }

    async function saveWithRetry(finalStep: boolean) {
        const first = await persist(finalStep)
        if (first === "ok") return true
        if (first === "invalid") return false
        pushSnackbar(enqueueSnackbar, "error", texts.networkError)
        return (await persist(finalStep)) === "ok"
    }

    async function handleNext() {
        if (!loaded || !page || busy) return
        store.setShowErrors(true)
        if (!isPageValid(page, store, texts, validators)) return
        for (const spec of pageDialogs(page, store, "beforeNext")) {
            const ok = await ask(spec)
            if (!ok) return
        }
        setUploading(true)
        const saved = await saveWithRetry(isLast)
        setUploading(false)
        if (!saved) return
        if (isLast) {
            setFinished(true)
            onFinished?.({id: store.rowId, key: store.rowKey})
            return
        }
        await animateTo(nextIndex, "next")
    }

    async function handlePrev() {
        if (!page || busy || prevIndex < 0) return
        for (const spec of pageDialogs(page, store, "beforePrev")) {
            const ok = await ask(spec)
            if (!ok) return
        }
        await animateTo(prevIndex, "prev")
    }

    const forwardIcon = dir === "rtl" ? <ArrowBackIosNewIcon sx={{fontSize: 14}}/> : <ArrowForwardIosIcon sx={{fontSize: 14}}/>
    const backIcon = dir === "rtl" ? <ArrowForwardIosIcon sx={{fontSize: 14}}/> : <ArrowBackIosNewIcon sx={{fontSize: 14}}/>

    return (
        <>
            <CssBaseline/>
            <GlobalStyles styles={{
                ".msf-snackbar-container": {
                    direction: dir,
                },
                ".msf-snackbar-container .notistack-Snackbar": {
                    width: "100%",
                    maxWidth: 420,
                    boxSizing: "border-box",
                    direction: dir,
                },
                ".msf-snackbar-container .notistack-MuiContent": {
                    width: "100%",
                    backgroundColor: "unset",
                    padding: 0,
                    boxShadow: "unset",
                    direction: dir,
                },
                ".msf-snackbar-container .msf-snackbar": {
                    width: "100%",
                    direction: dir,
                },
                ".MuiPaper-root[role=dialog]": {borderRadius: "16px"},
            }}/>
            <FormContextProvider value={{store, texts, dir, validators, ask}}>
                <Box
                    className={`msf msf-shell msf-page-index-${store.page}${isLast ? " msf-page-final" : ""}`}
                    dir={dir}
                    data-msf-part="shell"
                    data-page={store.page}
                    sx={{
                        height: "100dvh",
                        maxWidth: 420,
                        mx: "auto",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        position: "relative",
                        bgcolor: "background.default",
                    }}
                >
                    {!ready || !loaded || !page ? (
                        <Box className="msf-loading" sx={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 500,
                            bgcolor: "white",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                        }}>
                            <Box component="img" src={loadingUrl} alt="" sx={{width: 42}}/>
                            <Typography>{error || texts.loading}</Typography>
                        </Box>
                    ) : finished ? (
                        <Stack className="msf-finished" data-msf-part="finished" sx={{px: 3, height: "80vh", alignItems: "center", justifyContent: "center", textAlign: "center"}}>
                            <Box component="img" className="msf-finished-icon" src={timeUrl} alt="" sx={{width: 80, mb: 3}}/>
                            <Typography className="msf-finished-title" variant="h3" sx={{fontWeight: 700, fontSize: 24, mb: 2}}>{texts.finishedTitle}</Typography>
                            <Box className="msf-finished-body" sx={{p: 1, borderRadius: 2, bgcolor: "#FFFAF0"}}>
                                <Typography sx={{fontWeight: 300}}>{texts.finishedBody}</Typography>
                            </Box>
                        </Stack>
                    ) : (
                        <Box sx={{flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "1fr 120px"}}>
                            <Box className="msf-page" data-msf-part="page" data-page-id={page.id} sx={{overflow: "auto", ...contentAnimSx(anim)}}>
                                <Box sx={{px: 2, pt: 2, pb: 1.5}}>
                                    {page.title ? (
                                        <Typography className="msf-page-title" component="h1" sx={{my: "12px", mb: 1, fontWeight: 600, fontSize: 24}}>{page.title}</Typography>
                                    ) : null}
                                    {page.description ? (
                                        <Box className="msf-page-description" sx={{m: 0, fontWeight: 300, fontSize: 16, lineHeight: "24px"}}>
                                            <RichContent value={page.description} values={store.values}/>
                                        </Box>
                                    ) : null}
                                </Box>
                                <Box className="msf-page-body" data-msf-part="page-body" sx={{px: 2, py: 1.5}}>
                                    <ItemList items={page.items}/>
                                </Box>
                            </Box>
                            <Box className="msf-footer" data-msf-part="footer">
                                <Box sx={{p: 2}}>
                                    <LinearProgress
                                        className="msf-progress"
                                        variant="determinate"
                                        value={progress}
                                        sx={{height: 6, borderRadius: 3}}
                                    />
                                </Box>
                                <Stack direction="row" sx={{px: 0.5, py: 1, "& .MuiButton-root": {flex: 1, height: 52}}}>
                                    {prevIndex >= 0 ? (
                                        <Button
                                            className="msf-btn msf-btn-prev"
                                            variant="text"
                                            color="inherit"
                                            disabled={busy}
                                            onClick={() => void handlePrev()}
                                            startIcon={busy ? <CircularProgress size={16}/> : backIcon}
                                            sx={{fontWeight: 700, minWidth: 100}}
                                        >
                                            {page.prevLabel || (isLast ? texts.edit : texts.prev)}
                                        </Button>
                                    ) : <Box sx={{flex: 1}}/>}
                                    <Button
                                        className="msf-btn msf-btn-next"
                                        variant="contained"
                                        color={isLast ? "success" : "primary"}
                                        disabled={busy || !pageValid}
                                        onClick={() => void handleNext()}
                                        endIcon={busy ? <CircularProgress size={16} color="inherit"/> : forwardIcon}
                                        sx={{fontWeight: 700, minWidth: 140, borderRadius: "25px"}}
                                    >
                                        {page.nextLabel || (isLast ? texts.submit : texts.next)}
                                    </Button>
                                </Stack>
                            </Box>
                        </Box>
                    )}
                    <LoadingHover open={uploading} message={texts.uploading}/>
                    {pending?.spec.presentation === "alert" ? (
                        <AlertDialog
                            open
                            title={pending.spec.title}
                            message={pending.spec.body}
                            onClose={() => closePrompt(false)}
                            actions={(
                                <>
                                    <Button className="msf-dialog-cancel" onClick={() => closePrompt(false)}>{pending.spec.cancelText || texts.cancel}</Button>
                                    <Button className="msf-dialog-confirm" variant="contained" onClick={() => closePrompt(true)}>{pending.spec.confirmText || texts.confirm}</Button>
                                </>
                            )}
                        />
                    ) : null}
                    {pending?.spec.presentation === "sheet" ? (
                        <BottomSheet open onClose={() => closePrompt(false)} title={pending.spec.title}>
                            <Box className="msf-sheet-message" sx={{mb: 2}}>
                                <RichContent value={pending.spec.body} values={store.values}/>
                            </Box>
                            <Stack direction="row" spacing={1}>
                                <Button className="msf-sheet-cancel" fullWidth variant="text" onClick={() => closePrompt(false)}>{pending.spec.cancelText || texts.cancel}</Button>
                                <Button className="msf-sheet-confirm" fullWidth variant="contained" onClick={() => closePrompt(true)}>{pending.spec.confirmText || texts.confirm}</Button>
                            </Stack>
                        </BottomSheet>
                    ) : null}
                </Box>
            </FormContextProvider>
        </>
    )
}

function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function hydrateFromDataset(
    store: FormStore,
    formId: string,
    draft: { page?: number; rowKey?: string; rowId?: number; files?: Record<string, boolean> },
    row: Record<string, unknown>,
) {
    const values: Record<string, string | number | boolean | null> = {}
    const files: Record<string, boolean> = {}
    for (const [name, value] of Object.entries(row)) {
        if (name === "id" || name === "key") continue
        if (typeof value === "string" && (value.includes("/datasets/") && value.includes("/files/"))) {
            files[name] = true
            continue
        }
        if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            values[name] = value
        }
    }
    const page = Number(values.page)
    store.hydrate({
        id: formId,
        page: Number.isFinite(page) ? page : (draft.page ?? 0),
        rowKey: draft.rowKey || String(row.key ?? ""),
        rowId: draft.rowId ?? (typeof row.id === "number" ? row.id : undefined),
        values,
        files: {...(draft.files ?? {}), ...files},
    })
}

function applyResume(
    store: FormStore,
    formId: string,
    draft: DraftPayload,
    row: Record<string, unknown>,
) {
    if (draft?.rowKey) {
        store.hydrate(draft)
        return
    }
    hydrateFromDataset(store, formId, draft, row)
}
