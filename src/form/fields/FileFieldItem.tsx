import {type ChangeEvent, type SyntheticEvent, useRef, useState} from "react"
import {
    Box,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from "@mui/material"
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera"
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import type {FileFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import BottomSheet from "../ui/BottomSheet"
import CaptureCamera from "../camera/CaptureCamera"
import NativeCameraCapture, {type NativeCameraCaptureHandle} from "../camera/NativeCameraCapture"
import RichContent from "../ui/RichContent"
import FieldHelper from "./FieldHelper"

const IMAGE_EXT = [".jpg", ".jpeg", ".heic"]
const VIDEO_EXT = [".mp4", ".mov", ".webm"]

export default function FileFieldItem({item}: { item: FileFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const inputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const nativeRef = useRef<NativeCameraCaptureHandle>(null)
    const [sheet, setSheet] = useState(false)
    const [camera, setCamera] = useState(false)
    const [playing, setPlaying] = useState(false)
    const [notice, setNotice] = useState<string>()
    const error = itemError(item, store, texts, validators)
    const file = store.files[item.name]
    const preview = file?.previewUrl
    const sources = item.sources ?? ["camera", "gallery"]
    const cameraMode = item.camera === "native" ? "native" : "advanced"
    const envWidth = typeof window !== "undefined" && window.innerWidth > 420 ? "420px" : "100%"

    function remember(blob: Blob) {
        if (file?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(file.previewUrl)
        store.setFile(item.name, {
            blob,
            previewUrl: URL.createObjectURL(blob),
            dirty: true,
            onServer: file?.onServer,
        })
        setPlaying(false)
    }

    function rejectName(name: string) {
        const blocked = (item.rejectNameIncludes ?? ["camscanner"]).map((part) => part.toLowerCase())
        const lower = name.toLowerCase()
        return blocked.some((part) => part && lower.includes(part))
    }

    function acceptFile(next: File) {
        if (rejectName(next.name)) {
            setNotice(texts.invalid)
            return
        }
        if (item.maxFileSize && next.size > item.maxFileSize) {
            setNotice(texts.invalid)
            return
        }
        const ext = `.${next.name.toLowerCase().split(".").pop() ?? ""}`
        if (item.isVideo) {
            const video = VIDEO_EXT.includes(ext) || next.type.toLowerCase().startsWith("video/")
            if (!video) {
                setNotice(texts.invalid)
                return
            }
        } else if (!IMAGE_EXT.includes(ext)) {
            setNotice(texts.invalid)
            return
        }
        remember(next)
    }

    async function openChooser() {
        if (item.dialogs?.onActivate) {
            const ok = await ask(item.dialogs.onActivate)
            if (!ok) return
        }
        setSheet(true)
    }

    function onGallery(event: ChangeEvent<HTMLInputElement>) {
        const next = event.target.files?.[0]
        event.target.value = ""
        setSheet(false)
        if (next) acceptFile(next)
    }

    function remove(event: SyntheticEvent) {
        event.stopPropagation()
        if (file?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(file.previewUrl)
        store.setFile(item.name, undefined)
        setPlaying(false)
    }

    const hints = {
        capture: {
            top: item.captureHintTop ? <RichContent value={item.captureHintTop}/> : null,
            bottom: item.captureHintBottom ? <RichContent value={item.captureHintBottom}/> : null,
        },
        confirm: {
            top: item.confirmHintTop ? <RichContent value={item.confirmHintTop}/> : null,
            bottom: item.confirmHintBottom ? <RichContent value={item.confirmHintBottom}/> : null,
        },
    }

    return (
        <Box className="msf-file" data-msf-part="file" sx={{mt: "12px", mb: 0, width: "100%"}}>
            {cameraMode === "native" ? (
                <NativeCameraCapture
                    ref={nativeRef}
                    isVideo={!!item.isVideo}
                    rearCamera={item.useRear !== false}
                    confirmHints={hints.confirm}
                    onConfirm={(blob) => remember(blob)}
                />
            ) : (
                <CaptureCamera
                    envWidth={envWidth}
                    lunch={camera}
                    lunchSetter={setCamera}
                    isVideo={!!item.isVideo}
                    rearCamera={item.useRear !== false}
                    allowChangeCamera={item.allowChangeCamera !== false}
                    captureHints={hints.capture}
                    confirmHints={hints.confirm}
                    constraints={{
                        width: item.width,
                        height: item.height,
                        aspectRatio: item.aspectRatio,
                    }}
                    onMediaReady={(blob) => {
                        if (blob) remember(blob)
                    }}
                />
            )}
            <BottomSheet open={sheet} onClose={() => setSheet(false)} title={item.isVideo ? texts.uploadVideo : texts.uploadImage}>
                <List className="msf-sheet-list" disablePadding>
                    {sources.includes("camera") ? (
                        <ListItemButton className="msf-sheet-item" onClick={() => {
                            setSheet(false)
                            if (cameraMode === "native") nativeRef.current?.open()
                            else setCamera(true)
                        }}>
                            <ListItemIcon><PhotoCameraIcon/></ListItemIcon>
                            <ListItemText primary={item.isVideo ? texts.cameraVideo : texts.cameraImage} primaryTypographyProps={{fontWeight: 600}}/>
                        </ListItemButton>
                    ) : null}
                    {sources.includes("gallery") ? (
                        <ListItemButton className="msf-sheet-item" onClick={() => inputRef.current?.click()}>
                            <ListItemIcon><PhotoLibraryIcon/></ListItemIcon>
                            <ListItemText primary={texts.galleryPick} primaryTypographyProps={{fontWeight: 600}}/>
                        </ListItemButton>
                    ) : null}
                </List>
            </BottomSheet>
            <Box
                className="msf-file-tile"
                onClick={() => {
                    if (!preview || !item.isVideo) void openChooser()
                }}
                sx={{
                    width: "100%",
                    boxSizing: "border-box",
                    p: preview ? 0 : "8px",
                    overflow: preview ? "hidden" : undefined,
                    minHeight: 164,
                    borderRadius: "12px",
                    bgcolor: "rgb(245, 247, 247)",
                    border: error ? "1px solid red" : "1px dashed rgb(225, 227, 227)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "stretch",
                }}
            >
                <Box
                    component="input"
                    ref={inputRef}
                    className="msf-file-input"
                    type="file"
                    accept={item.isVideo ? "video/*,.mp4,.mov,.webm" : ".jpg,.jpeg,.heic"}
                    onChange={onGallery}
                    sx={{display: "none"}}
                />
                <Box className="msf-file-placeholder" sx={{
                    display: preview ? "none" : "flex",
                    width: "100%",
                    flexGrow: 1,
                    p: item.imagePlaceholder ? "8px 0" : "37px 0",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    "& .custom-placeholder": {maxWidth: 140, mb: "12px"},
                }}>
                    {item.imagePlaceholder ? (
                        <Box className="custom-placeholder" component="img" src={item.imagePlaceholder} alt="" sx={{width: "100%", maxWidth: 140, mb: "12px"}}/>
                    ) : (
                        <BadgeOutlinedIcon fontSize="large"/>
                    )}
                    <Typography className="msf-file-label" sx={{
                        userSelect: "none",
                        m: "4px 0 0",
                        p: "4px 16px",
                        bgcolor: "#0065dc",
                        color: "white",
                        borderRadius: "16px",
                        fontSize: 14,
                        fontWeight: 500,
                    }}>{item.placeholder}</Typography>
                </Box>
                <Box className="msf-file-preview" sx={{
                    position: "relative",
                    display: preview ? "flex" : "none",
                    flexGrow: 1,
                    justifyContent: "center",
                    p: "24px",
                }}>
                    <IconButton className="msf-file-delete" onClick={remove} color="error" size="small" sx={{
                        width: 32,
                        height: 32,
                        position: "absolute",
                        bottom: 12,
                        right: 12,
                        borderRadius: "50%",
                        bgcolor: "white",
                        boxShadow: "rgba(0, 0, 0, 0.1) 0 0 4px 1px",
                    }}>
                        <DeleteOutlineIcon/>
                    </IconButton>
                    {item.isVideo ? (
                        <Box sx={{position: "relative", display: "flex"}}>
                            <Box component="video" ref={videoRef} src={preview} sx={{width: "100%", maxWidth: 200, maxHeight: 114}}/>
                            <IconButton className="msf-file-play" onClick={(event) => {
                                event.stopPropagation()
                                void videoRef.current?.play()
                                setPlaying(true)
                            }} sx={{
                                display: playing ? "none" : "flex",
                                position: "absolute",
                                top: "calc(50% - 27px)",
                                left: "calc(50% - 27px)",
                                height: 54,
                                width: 54,
                                borderRadius: "50%",
                                bgcolor: "#f5f7f785",
                                color: "#0065dc",
                            }}>
                                <PlayArrowIcon/>
                            </IconButton>
                        </Box>
                    ) : (
                        <Box component="img" className="msf-file-image" src={preview} alt="" sx={{maxWidth: 200, maxHeight: 114}}/>
                    )}
                </Box>
            </Box>
            <FieldHelper error={error || notice}/>
        </Box>
    )
}
