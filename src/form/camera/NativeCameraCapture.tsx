import {Cached, CheckOutlined} from "@mui/icons-material";
import {type ChangeEvent, forwardRef, useImperativeHandle, useRef, useState} from "react";
import {Box, Button, Stack, Typography} from "@mui/material";
import type {CameraHints} from "./CaptureCamera";

export interface NativeCameraCaptureHandle {
    open: () => void
}

interface NativeCameraCaptureProps {
    confirmHints?: CameraHints
    isVideo?: boolean
    onConfirm: (blob: Blob) => void,
    rearCamera?: boolean
}

const NativeCameraCapture = forwardRef<NativeCameraCaptureHandle, NativeCameraCaptureProps>(
    function NativeCameraCapture({confirmHints, isVideo, onConfirm, rearCamera = true}, ref) {
        const inputRef = useRef<HTMLInputElement | null>(null)
        const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined)
        const [blob, setBlob] = useState<Blob | undefined>(undefined)

        const clearPreview = () => {
            setPreviewUrl((prev) => {
                if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev)
                return undefined
            })
            setBlob(undefined)
        }

        const open = () => {
            clearPreview()
            inputRef.current?.click()
        }

        useImperativeHandle(ref, () => ({open}), [])

        const handleFileChange = (ev: ChangeEvent<HTMLInputElement>) => {
            const file = ev.target.files?.[0]
            ev.target.value = ""
            if (file) {
                setBlob(file)
                setPreviewUrl(URL.createObjectURL(file))
            } else {
                clearPreview()
            }
        }

        const handleSave = () => {
            if (!blob) return
            const next = blob
            clearPreview()
            onConfirm(next)
        }

        const envWidth = (window.innerWidth > 420) ? "420px" : `${window.innerWidth}px`

        return (
            <>
                <Box
                    component="input"
                    ref={inputRef}
                    sx={{display: "none"}}
                    onChange={handleFileChange}
                    type="file"
                    accept={"image/*;capture=camera"}
                    capture={rearCamera ? 'environment' : 'user'}
                />
                {previewUrl != null && blob != null && (
                    <Stack className="msf-camera msf-camera-native" sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 700,
                        mx: "auto",
                        width: envWidth,
                        overflow: 'hidden',
                        bgcolor: 'white'
                    }}>
                        <Typography component="h3" sx={{
                            textAlign: "center",
                            fontSize: "1.17em",
                            fontWeight: "bold",
                            m: "1em 0 1rem",
                        }}>
                            {confirmHints?.top}
                        </Typography>

                        {isVideo ? (
                            <Box component="video" src={previewUrl} controls
                                 sx={{
                                     maxWidth: "100%",
                                     maxHeight: "100%",
                                     mb: "-8px",
                                     borderRadius: "16px",
                                     m: "0 16px",
                                     objectFit: "cover",
                                     objectPosition: 'center',
                                 }}/>
                        ) : (
                            <Box component="img" src={previewUrl} alt="taken-picture"
                                 sx={{
                                     flex: 1,
                                     minHeight: 0,
                                     width: 'calc(100% - 32px)',
                                     height: '100%',
                                     objectFit: 'cover',
                                     objectPosition: '50%',
                                     borderRadius: '16px',
                                     m: '0 16px',
                                 }}/>
                        )}

                        <Box sx={{
                            px: 1
                        }}>
                            {confirmHints?.bottom}
                        </Box>

                        <Stack direction="row" spacing={1}
                               sx={{
                                   gridRow: 2,
                                   gridColumn: 1,
                                   height: 52,
                                   mx: 2,
                                   my: 2
                               }}>
                            <Button onClick={handleSave} variant="contained" color="primary"
                                    startIcon={<CheckOutlined/>}>
                                {isVideo ? "ارسال ویدیو" : "ارسال تصویر"}
                            </Button>
                            <Button onClick={open} variant="outlined" color="primary" startIcon={<Cached/>}>
                                {isVideo ? "گرفتن ویدیو جدید" : "گرفتن مجدد تصویر"}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </>
        )
    }
)

export default NativeCameraCapture
