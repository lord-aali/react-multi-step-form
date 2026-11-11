import {useSyncExternalStore} from "react"

export type Scalar = string | number | boolean | null

export interface FileState {
    blob?: Blob
    previewUrl?: string
    onServer?: boolean
    dirty?: boolean
}

export interface DraftPayload {
    id: string
    page: number
    rowKey?: string
    rowId?: number
    values: Record<string, Scalar>
    files: Record<string, boolean>
}

export class FormStore {
    values: Record<string, Scalar> = {}
    files: Record<string, FileState> = {}
    page = 0
    rowKey?: string
    rowId?: number
    serverErrors: Record<string, string> = {}
    showErrors = false
    touched: Record<string, true> = {}
    private version = 0
    private listeners = new Set<() => void>()

    constructor(public apiBase = "/api") {}

    subscribe = (listener: () => void) => {
        this.listeners.add(listener)
        return () => {
            this.listeners.delete(listener)
        }
    }

    getVersion = () => this.version

    private bump() {
        this.version += 1
        this.listeners.forEach((listener) => listener())
    }

    get(name: string): Scalar | undefined {
        return this.values[name]
    }

    set(name: string, value: Scalar) {
        this.values = {...this.values, [name]: value}
        if (this.serverErrors[name]) {
            const next = {...this.serverErrors}
            delete next[name]
            this.serverErrors = next
        }
        this.bump()
    }

    markTouched(name: string) {
        if (this.touched[name]) return
        this.touched = {...this.touched, [name]: true}
        this.bump()
    }

    setFile(name: string, file: FileState | undefined) {
        const next = {...this.files}
        if (!file) delete next[name]
        else next[name] = file
        this.files = next
        if (this.serverErrors[name]) {
            const errors = {...this.serverErrors}
            delete errors[name]
            this.serverErrors = errors
        }
        this.bump()
    }

    setServerErrors(errors: Record<string, string>) {
        this.serverErrors = errors
        this.showErrors = true
        this.bump()
    }

    setShowErrors(show: boolean) {
        this.showErrors = show
        this.bump()
    }

    setPage(page: number) {
        this.page = page
        this.showErrors = false
        this.touched = {}
        this.bump()
    }

    setRow(key: string, id?: number) {
        this.rowKey = key
        this.rowId = id
        this.bump()
    }

    mergeValues(partial: Record<string, Scalar>) {
        this.values = {...this.values, ...partial}
        this.bump()
    }

    hydrate(draft: DraftPayload) {
        this.values = {...this.values, ...draft.values}
        this.page = Number.isFinite(draft.page) ? draft.page : 0
        this.rowKey = draft.rowKey
        this.rowId = draft.rowId
        const files: Record<string, FileState> = {}
        if (draft.rowKey) {
            for (const [name, present] of Object.entries(draft.files ?? {})) {
                if (!present) continue
                files[name] = {
                    onServer: true,
                    dirty: false,
                    previewUrl: `${this.apiBase}/datasets/${encodeURIComponent(draft.id)}/${draft.rowKey}/files/${encodeURIComponent(name)}`,
                }
            }
        }
        this.files = files
        this.showErrors = false
        this.touched = {}
        this.bump()
    }

    draft(id: string): DraftPayload {
        const files: Record<string, boolean> = {}
        for (const [name, file] of Object.entries(this.files)) {
            if (file.onServer || file.blob) files[name] = true
        }
        return {
            id,
            page: this.page,
            rowKey: this.rowKey,
            rowId: this.rowId,
            values: {...this.values},
            files,
        }
    }
}

export function useFormVersion(store: FormStore) {
    return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion)
}
