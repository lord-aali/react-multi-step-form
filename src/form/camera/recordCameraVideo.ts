export type CameraRecordOptions = {
    cameraStream: MediaStream
    video?: HTMLVideoElement | null
    onStop: (blob: Blob, mimeType: string) => void
    onError?: (error: unknown) => void
}

export type CameraRecorder = {
    stop: () => void
}

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n))
}

function bitrateFor(stream: MediaStream): number {
    const settings = stream.getVideoTracks()[0]?.getSettings?.() ?? {}
    const width = settings.width || 1280
    const height = settings.height || 720
    const fps = clamp(settings.frameRate || 30, 24, 30)
    return clamp(Math.round(width * height * fps * 0.14), 2_500_000, 10_000_000)
}

function pickRecorderOptions(bitrate: number): MediaRecorderOptions {
    const preferredMimeTypes = [
        "video/mp4;codecs=avc1.640028,mp4a.40.2",
        "video/mp4;codecs=avc1.4D401F,mp4a.40.2",
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
    ]
    for (const mimeType of preferredMimeTypes) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)) {
            return {mimeType, videoBitsPerSecond: bitrate, audioBitsPerSecond: 128_000}
        }
    }
    return {videoBitsPerSecond: bitrate, audioBitsPerSecond: 128_000}
}

export function startCameraVideoRecording(options: CameraRecordOptions): CameraRecorder {
    const {cameraStream, video, onStop, onError} = options

    const recorderOpts = pickRecorderOptions(bitrateFor(cameraStream))
    const mimeType = recorderOpts.mimeType || "video/webm"
    const chunks: Blob[] = []
    let watchdogId = 0

    let recorder: MediaRecorder
    try {
        recorder = new MediaRecorder(cameraStream, recorderOpts)
    } catch (err) {
        onError?.(err)
        return {stop: () => undefined}
    }

    recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.onerror = (event) => onError?.(event)
    recorder.onstop = () => {
        window.clearInterval(watchdogId)
        const blob = new Blob(chunks, {type: mimeType.includes("mp4") ? "video/mp4" : mimeType})
        onStop(blob, blob.type || mimeType)
    }

    try {
        recorder.start(1000)
    } catch (err) {
        onError?.(err)
        return {stop: () => undefined}
    }

    watchdogId = window.setInterval(() => {
        if (video && video.paused && cameraStream.active) {
            void video.play().catch(() => undefined)
        }
    }, 1000)

    console.info("[camera] recording DIRECT", {
        mimeType,
        bitrate: recorderOpts.videoBitsPerSecond,
        settings: cameraStream.getVideoTracks()[0]?.getSettings?.(),
    })

    return {
        stop: () => {
            if (recorder.state === "recording" || recorder.state === "paused") {
                try {
                    recorder.requestData?.()
                } catch {
                }
                recorder.stop()
            } else {
                window.clearInterval(watchdogId)
            }
        },
    }
}
