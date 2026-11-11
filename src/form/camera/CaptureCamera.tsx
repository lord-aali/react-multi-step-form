import React, {useCallback, useEffect, useRef, useState} from "react";
import {
    Autorenew, Cached,
    CheckOutlined,
    Close,
    FiberManualRecord,
    PlayArrow, Stop
} from "@mui/icons-material";
import CustomSnackbar from "../ui/CustomSnackbar";
import {Box, ButtonBase, Stack, Typography} from "@mui/material";
import type {SxProps, Theme} from "@mui/material/styles";
import {
    bindStreamToVideoElement,
    measureDeliveredFps,
    openUserMedia,
    parseAspectRatio,
    SMOOTH_TIER_COUNT,
    stopStream,
} from "./openUserMedia";
import {startCameraVideoRecording, type CameraRecorder} from "./recordCameraVideo";

const TARGET_DELIVERED_FPS = 22

const cornerSx: SxProps<Theme> = {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "white",
    borderWidth: "3px",
}

const circleButtonSx: SxProps<Theme> = {
    width: 43,
    height: 43,
    border: "unset",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    m: "0 auto",
    bgcolor: "#efefef",
    color: "black",
}

const captureIconSx: SxProps<Theme> = {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    "& *": {fontSize: "32px", color: "red"},
}

export interface CameraHints {
    top: React.ReactNode,
    bottom: React.ReactNode
}

export interface CameraConstraints {
    width?: number,
    height?: number,
    aspectRatio?: string
}

interface props {
    envWidth: string,
    rearCamera?: boolean,
    allowChangeCamera?: boolean,
    lunch: boolean,
    isVideo?: boolean,
    captureHints?: CameraHints,
    confirmHints?: CameraHints,
    constraints?: CameraConstraints,
    lunchSetter: React.Dispatch<boolean>,
    onMediaReady: (blob: Blob | undefined, mimeType: string) => void
}

function CaptureCamera({
                           envWidth,
                           lunch,
                           isVideo,
                           allowChangeCamera,
                           captureHints,
                           confirmHints,
                           constraints,
                           rearCamera,
                           lunchSetter,
                           onMediaReady
                       }: props) {
    const [useRearCamera, setUseRearCamera] = useState(!!rearCamera)
    const [stream, setStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null)
    const [errorMessage, setErrorMessage] = useState<React.ReactNode>()
    const videoRef = useRef<HTMLVideoElement>(null)
    const recordedVideoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const orientedRecorderRef = useRef<CameraRecorder | null>(null)
    const tierCacheRef = useRef<Record<string, number>>({})
    const [takenImage, setTakenImage] = useState<string | undefined>(undefined)
    const [takenVideo, setTakenVideo] = useState<string | undefined>(undefined)
    const [confirmState, setConfirmState] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [mediaBlob, setMediaBlob] = useState<Blob>()
    const [recordedMimeType, setRecordedMimeType] = useState("video/mp4")
    const [canvasAspectRatio] = useState(constraints?.aspectRatio ? constraints.aspectRatio : "4/3")
    const aspectRatioValue = parseAspectRatio(canvasAspectRatio) ?? 4 / 3
    const previewFrameSx = {
        aspectRatio: canvasAspectRatio,
        width: `min(100%, calc(100cqh * ${aspectRatioValue}))`,
        height: `min(100%, calc(100cqw / ${aspectRatioValue}))`,
        maxWidth: "100%",
        maxHeight: "100%",
    } as const

    const stopCamera = useCallback(() => {
        stopStream(streamRef.current)
        streamRef.current = null
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
        setStream(null)
    }, [])

    const setLiveVideoRef = useCallback((node: HTMLVideoElement | null) => {
        videoRef.current = node
        if (node && streamRef.current?.active) {
            void bindStreamToVideoElement(node, streamRef.current)
        }
    }, [])

    useEffect(() => {
        if (!lunch) {
            setConfirmState(false)
            stopCamera()
            return
        }
        if (confirmState) {
            return
        }

        let alive = true
        let localStream: MediaStream | null = null

        const baseOptions = {
            preferRear: useRearCamera,
            audio: !!isVideo,
            width: constraints?.width,
            height: constraints?.height,
            aspectRatio: parseAspectRatio(constraints?.aspectRatio),
            frameRate: 30,
            smoothVideo: !!isVideo,
        }

        const openProbed = async (): Promise<MediaStream> => {
            const cacheKey = useRearCamera ? "rear" : "front"
            const cachedTier = tierCacheRef.current[cacheKey]
            if (!isVideo || cachedTier !== undefined) {
                return openUserMedia({...baseOptions, sizeTier: cachedTier ?? 0})
            }

            let best: {tier: number; fps: number} | null = null
            for (let tier = 0; tier < SMOOTH_TIER_COUNT; tier++) {
                const candidate = await openUserMedia({...baseOptions, sizeTier: tier})
                const video = videoRef.current
                if (!alive || !video) {
                    if (!alive) stopStream(candidate)
                    else tierCacheRef.current[cacheKey] = tier
                    return candidate
                }
                streamRef.current = candidate
                await bindStreamToVideoElement(video, candidate)
                const fps = await measureDeliveredFps(video)
                console.info("[camera] tier", tier, "settings", candidate.getVideoTracks()[0]?.getSettings?.(), "delivered fps", fps)

                if (fps === null || fps >= TARGET_DELIVERED_FPS) {
                    tierCacheRef.current[cacheKey] = tier
                    return candidate
                }
                if (!best || fps > best.fps) best = {tier, fps}
                stopStream(candidate)
                streamRef.current = null
                video.srcObject = null
                if (!alive) throw new Error("cancelled")
            }

            const bestTier = best?.tier ?? SMOOTH_TIER_COUNT - 1
            tierCacheRef.current[cacheKey] = bestTier
            return openUserMedia({...baseOptions, sizeTier: bestTier})
        }

        openProbed()
            .then(async (mediaStream) => {
                if (!alive) {
                    stopStream(mediaStream)
                    return
                }
                localStream = mediaStream
                streamRef.current = mediaStream
                setStream(mediaStream)
                if (videoRef.current) {
                    await bindStreamToVideoElement(videoRef.current, mediaStream)
                }
            })
            .catch((err) => {
                if (!alive) return
                console.error("error:", err)
                showPermissionError()
            })

        return () => {
            alive = false
            orientedRecorderRef.current?.stop()
            orientedRecorderRef.current = null
            stopStream(localStream)
            if (streamRef.current === localStream) {
                streamRef.current = null
            }
        }
    }, [
        lunch,
        confirmState,
        stopCamera,
        isVideo,
        useRearCamera,
        constraints?.width,
        constraints?.height,
        constraints?.aspectRatio,
    ])

    useEffect(() => {
        if (!confirmState) {
            setTakenImage(undefined)
            setIsPlaying(false)
        }
    }, [confirmState]);

    useEffect(() => {
        return () => {
            if (takenImage && takenImage.startsWith("blob:")) {
                URL.revokeObjectURL(takenImage);
            }
        };
    }, [takenImage]);

    function takePhoto() {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!stream || !video || !canvas) {
            return;
        }

        const width = video.videoWidth || 640
        const height = video.videoHeight || 480
        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        if (context == null) {
            return
        }

        context.save()
        if (!useRearCamera) {
            context.translate(width, 0)
            context.scale(-1, 1)
        }
        context.drawImage(video, 0, 0, width, height)
        context.restore()

        canvas.toBlob(function (blob) {
            if (blob == null) {
                return
            }
            setMediaBlob(blob)
            setTakenImage(URL.createObjectURL(blob))
        }, 'image/jpeg', 0.9)

        setConfirmState(true)
    }

    const handleStartVideoRecording = useCallback(() => {
        const liveVideo = videoRef.current
        if (!stream || !liveVideo) {
            return
        }
        if (!liveVideo.videoWidth || !liveVideo.videoHeight) {
            setErrorMessage(<CustomSnackbar message={{type: "error", message: "دوربین هنوز آماده نیست."}}/>)
            return
        }

        setConfirmState(false)
        setTakenVideo(undefined)
        orientedRecorderRef.current?.stop()

        try {
            orientedRecorderRef.current = startCameraVideoRecording({
                cameraStream: stream,
                video: liveVideo,
                onStop: (blob, mimeType) => {
                    orientedRecorderRef.current = null
                    setRecordedMimeType(mimeType)
                    setMediaBlob(blob)
                    setTakenVideo(URL.createObjectURL(blob))
                    setIsRecording(false)
                    setConfirmState(true)
                    stopCamera()
                },
                onError: (err) => {
                    console.error("Error creating MediaRecorder:", err)
                    orientedRecorderRef.current = null
                    setIsRecording(false)
                    setErrorMessage(<CustomSnackbar message={{
                        type: "error",
                        message: "فرمت قابل قبولی برای ضبط یافت نشد.",
                    }}/>)
                },
            })
            setIsRecording(true)
        } catch (e) {
            console.error("Error starting recording:", e)
            setErrorMessage(<CustomSnackbar message={{type: "error", message: "خطا در شروع ضبط ویدیو."}}/>)
        }
    }, [stream, stopCamera])

    const handleStopRecording = useCallback(() => {
        if (!isRecording) return
        orientedRecorderRef.current?.stop()
    }, [isRecording])

    function handleSaveMedia() {
        if (onMediaReady !== undefined) {
            if (isVideo) {
                onMediaReady(mediaBlob, recordedMimeType || "video/mp4")
            } else {
                onMediaReady(mediaBlob, "image/jpeg")
            }
        }
        setConfirmState(false)
        lunchSetter(false)
    }

    function handleCaptureClick() {
        if (isVideo) {
            if (isRecording) {
                handleStopRecording()
            } else {
                handleStartVideoRecording()
            }
        } else {
            if (!confirmState) {
                takePhoto()
                stopCamera()
                setConfirmState(true)
            }
        }
    }

    function handleRetake() {
        setTakenImage(undefined)
        setTakenVideo(undefined)
        setConfirmState(false)
    }

    function handleChangeCamera() {
        setUseRearCamera((prev) => !prev)
    }

    function playRecordedVideo(play: boolean) {
        let video = recordedVideoRef?.current
        if (video === null) {
            return
        }
        if (play) {
            video?.play()
            setIsPlaying(true)
            recordedVideoRef?.current?.addEventListener("ended", function () {
                setIsPlaying(false)
            })
        } else {
            video?.pause()
            setIsPlaying(false)
        }
    }

    function showPermissionError() {
        setErrorMessage(<CustomSnackbar message={{type: "error", message: "مجوز داده نشد."}}/>)
    }

    if (!lunch) {
        return null
    }

    return (
        <Box className="msf-camera" sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 700,
            mx: "auto",
            width: envWidth,
        }}>
            <canvas ref={canvasRef} style={{display: "none"}}/>
            {errorMessage}
            <Box sx={{
                display: confirmState ? "flex" : "none",
                flexDirection: "column",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: "white",
                color: "black",
            }}>
                <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}>
                    <Typography component="h3" sx={{
                        textAlign: "center",
                        fontSize: "1.17em",
                        fontWeight: "bold",
                        m: "1em 0 0",
                        px: 2,
                        flexShrink: 0,
                    }}>
                        {confirmHints?.top}
                    </Typography>
                    <Box sx={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        px: 2,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        containerType: "size",
                    }}>
                        <Box sx={{
                            position: "relative",
                            ...previewFrameSx,
                            overflow: "hidden",
                            borderRadius: "16px",
                            bgcolor: "#f7f7f7",
                        }}>
                            <Box component="img" src={takenImage} alt="taken-picture" sx={{
                                display: isVideo ? "none" : "block",
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}/>
                            <Box sx={{
                                display: isVideo ? "block" : "none",
                                position: "absolute",
                                inset: 0,
                            }}>
                                <Box component="video" onClick={function () {
                                    playRecordedVideo(false)
                                }} ref={recordedVideoRef} src={takenVideo} autoPlay={false}
                                     sx={{
                                         width: "100%",
                                         height: "100%",
                                         objectFit: "cover",
                                         transform: useRearCamera ? undefined : "scaleX(-1)",
                                     }}/>
                                <ButtonBase onClick={function () {
                                    playRecordedVideo(true)
                                }} sx={{
                                    display: isPlaying ? "none" : "flex",
                                    position: "absolute",
                                    top: "calc(50% - 27px)",
                                    left: "calc(50% - 27px)",
                                    height: 54,
                                    width: 54,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    border: "unset",
                                    borderRadius: "50%",
                                    bgcolor: "#f5f7f785",
                                    cursor: "pointer",
                                    "& *": {fontSize: "2rem", color: "#0065dc"},
                                }}><PlayArrow/></ButtonBase>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{
                        flexShrink: 0,
                        maxHeight: "28%",
                        overflow: "auto",
                        px: 1,
                    }}>
                        {confirmHints?.bottom}
                    </Box>
                </Box>
                <Stack sx={{p: "8px 16px", height: 150, flexShrink: 0}}>
                    <ButtonBase className="msf-camera-confirm" onClick={handleSaveMedia} sx={{
                        borderRadius: "28px",
                        height: 56,
                        fontSize: "1rem",
                        bgcolor: "#0065dc",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        mb: "8px",
                        flexShrink: 0,
                        color: "white",
                        "& .MuiSvgIcon-root": {m: "0 8px", color: "white"},
                    }}>
                        <CheckOutlined/>
                        {(isVideo) ? "ارسال ویدیو" : "ارسال تصویر"}
                    </ButtonBase>
                    <ButtonBase className="msf-camera-retake" onClick={handleRetake} sx={{
                        borderRadius: "28px",
                        height: 56,
                        fontSize: "1rem",
                        bgcolor: "#f7f7f7",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        m: 0,
                        flexShrink: 0,
                        color: "black",
                        "& .MuiSvgIcon-root": {m: "0 8px", color: "black"},
                    }}>
                        <Cached/>
                        {(isVideo) ? "گرفتن ویدیو جدید" : "گرفتن مجدد تصویر"}
                    </ButtonBase>
                </Stack>
            </Box>
            <Box sx={{
                display: confirmState ? "none" : "flex",
                position: "relative",
                bgcolor: "#202020",
                flexDirection: "column",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                color: "white",
            }}>
                <Box sx={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    pb: "100px",
                    overflow: "hidden",
                }}>
                    <Box sx={{
                        width: "100%",
                        p: "0 8px",
                        fontSize: "1rem",
                        fontWeight: 500,
                        mt: "1.5dvh",
                        flexShrink: 0,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column",
                        "& p": {m: 0, textAlign: "center", p: "0 16px"},
                    }}>
                        {captureHints?.top}
                    </Box>
                    <Box sx={{
                        flex: 1,
                        minHeight: 0,
                        width: "100%",
                        p: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        containerType: "size",
                    }}>
                        <Box sx={{
                            bgcolor: "black",
                            position: "relative",
                            ...previewFrameSx,
                            overflow: "hidden",
                            borderRadius: "16px",
                        }}>
                            <video
                                ref={setLiveVideoRef}
                                muted
                                autoPlay
                                playsInline
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    transform: useRearCamera ? undefined : "scaleX(-1)",
                                    backgroundColor: "#000",
                                }}
                            />
                            <Box sx={{
                                ...cornerSx,
                                top: 0,
                                left: 0,
                                borderTopStyle: "solid",
                                borderLeftStyle: "solid",
                                borderTopLeftRadius: "16px",
                                zIndex: 1,
                            }}/>
                            <Box sx={{
                                ...cornerSx,
                                top: 0,
                                right: 0,
                                borderTopStyle: "solid",
                                borderRightStyle: "solid",
                                borderTopRightRadius: "16px",
                                zIndex: 1,
                            }}/>
                            <Box sx={{
                                ...cornerSx,
                                bottom: 0,
                                left: 0,
                                borderBottomStyle: "solid",
                                borderLeftStyle: "solid",
                                borderBottomLeftRadius: "16px",
                                zIndex: 1,
                            }}/>
                            <Box sx={{
                                ...cornerSx,
                                bottom: 0,
                                right: 0,
                                borderBottomStyle: "solid",
                                borderRightStyle: "solid",
                                borderBottomRightRadius: "16px",
                                zIndex: 1,
                            }}/>
                        </Box>
                    </Box>
                    <Box sx={{
                        width: "100%",
                        p: "0 8px",
                        fontSize: "0.95rem",
                        fontWeight: 300,
                        flexShrink: 0,
                        maxHeight: "30%",
                        overflow: "auto",
                    }}>
                        {captureHints?.bottom}
                    </Box>
                </Box>
                <Box sx={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-around",
                    alignItems: "center",
                    height: 100,
                    flexShrink: 0,
                }}>
                    <Box sx={{
                        display: "grid",
                        gridTemplateRows: "1fr",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        justifyContent: "space-around",
                        alignItems: "center",
                        width: "100%",
                        p: "8px 32px",
                    }}>
                        {(allowChangeCamera === false) ? "" :
                            <ButtonBase onClick={handleChangeCamera} sx={circleButtonSx}>
                                <Autorenew/>
                            </ButtonBase>}
                        <ButtonBase className="msf-camera-shutter" onClick={handleCaptureClick}
                                    sx={{...circleButtonSx, gridRow: 1, gridColumn: 2, width: 64, height: 64}}>
                            <Box component="span" sx={{
                                ...captureIconSx,
                                display: (isVideo && !isRecording) ? "flex" : "none",
                            }}><FiberManualRecord fontSize={"medium"}/></Box>
                            <Box component="span" sx={{
                                ...captureIconSx,
                                display: (isVideo && isRecording) ? "flex" : "none",
                            }}><Stop fontSize={"medium"}/></Box>
                        </ButtonBase>
                        <ButtonBase onClick={function () {
                            lunchSetter(false)
                        }} sx={{...circleButtonSx, gridRow: 1, gridColumn: 3}}>
                            <Close/>
                        </ButtonBase>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

export default CaptureCamera;