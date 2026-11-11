export type OpenUserMediaOptions = {
    preferRear?: boolean
    audio?: boolean
    width?: number
    height?: number
    /** Numeric aspect ratio for getUserMedia, e.g. 9/16. */
    aspectRatio?: number
    frameRate?: number
    /**
     * Video recording: never request 4K (it makes many cameras drop to a few fps
     * and makes canvas re-framing very slow). Request 1080p/720p with fps >= 24
     * and verify the real track frame rate after opening.
     */
    smoothVideo?: boolean
    /**
     * Start of the size ladder in smooth mode (0 = 1080p, 1 = 720p, 2 = 540p,
     * 3 = 480p, 4 = any). Used to step down when the camera can't deliver real fps.
     */
    sizeTier?: number
}

const MIN_SMOOTH_FPS = 24
/** Reject a stream whose reported fps is clearly below this (some report 0/undefined → accepted). */
const ACCEPT_SMOOTH_FPS = 22

const SMOOTH_SIZES: Array<{width?: ConstrainULong; height?: ConstrainULong}> = [
    {width: {ideal: 1920}, height: {ideal: 1080}},
    {width: {ideal: 1280}, height: {ideal: 720}},
    {width: {ideal: 960}, height: {ideal: 540}},
    {width: {ideal: 640}, height: {ideal: 480}},
    {},
]
export const SMOOTH_TIER_COUNT = SMOOTH_SIZES.length

/**
 * Measures the frame rate the camera ACTUALLY delivers to a playing <video>
 * (track.getSettings().frameRate is only the nominal/requested value and is
 * often 30 while a dim room or USB bandwidth gives 8–15).
 * Returns null when the browser can't tell.
 */
export function measureDeliveredFps(
    video: HTMLVideoElement,
    durationMs = 1100,
    warmupMs = 250,
): Promise<number | null> {
    type Vfc = HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number
        cancelVideoFrameCallback?: (id: number) => void
    }
    const v = video as Vfc

    return new Promise((resolve) => {
        if (typeof v.requestVideoFrameCallback === "function") {
            let done = false
            let id = 0
            let count = 0
            let firstAt = 0
            let lastAt = 0
            const t0 = performance.now()

            const finish = () => {
                if (done) return
                done = true
                window.clearTimeout(safety)
                try {
                    v.cancelVideoFrameCallback?.(id)
                } catch {
                    // ignore
                }
                if (!firstAt || lastAt <= firstAt) {
                    resolve(0)
                    return
                }
                resolve(count / ((lastAt - firstAt) / 1000))
            }

            const onFrame = () => {
                if (done) return
                const now = performance.now()
                if (now - t0 >= warmupMs) {
                    if (!firstAt) {
                        firstAt = now
                    } else {
                        count++
                        lastAt = now
                    }
                }
                if (now - t0 >= warmupMs + durationMs) {
                    finish()
                    return
                }
                id = v.requestVideoFrameCallback!(onFrame)
            }
            const safety = window.setTimeout(finish, warmupMs + durationMs + 1500)
            id = v.requestVideoFrameCallback!(onFrame)
            return
        }

        if (typeof video.getVideoPlaybackQuality === "function") {
            window.setTimeout(() => {
                const a = video.getVideoPlaybackQuality().totalVideoFrames
                const startedAt = performance.now()
                window.setTimeout(() => {
                    const b = video.getVideoPlaybackQuality().totalVideoFrames
                    const seconds = (performance.now() - startedAt) / 1000
                    resolve(seconds > 0 && b >= a ? (b - a) / seconds : null)
                }, durationMs)
            }, warmupMs)
            return
        }

        resolve(null)
    })
}

function delay(ms: number) {
    return new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
    })
}

export function stopStream(stream: MediaStream | null | undefined) {
    stream?.getTracks().forEach((track) => track.stop())
}

export function parseAspectRatio(value?: string | number): number | undefined {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value
    }
    if (typeof value !== "string") return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    if (trimmed.includes("/")) {
        const [a, b] = trimmed.split("/")
        const num = Number(a)
        const den = Number(b)
        if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
            return num / den
        }
        return undefined
    }
    const n = Number(trimmed)
    return Number.isFinite(n) && n > 0 ? n : undefined
}

async function cameraDeviceId(facing: "user" | "environment"): Promise<string | undefined> {
    if (!navigator.mediaDevices?.enumerateDevices) return undefined
    try {
        const videos = (await navigator.mediaDevices.enumerateDevices())
            .filter((device) => device.kind === "videoinput" && device.deviceId)
        if (videos.length < 2) return undefined
        const rear = /back|rear|environment|world/i
        const front = /front|user|face|selfie/i
        const labeled = videos.find((device) =>
            facing === "environment" ? rear.test(device.label) : front.test(device.label),
        )
        if (labeled) return labeled.deviceId
        return facing === "environment"
            ? videos[videos.length - 1].deviceId
            : videos[0].deviceId
    } catch {
        return undefined
    }
}

type SizeHint = {
    width?: ConstrainULong
    height?: ConstrainULong
    aspectRatio?: ConstrainDouble
    frameRate?: ConstrainDouble
}

function sizeHint(options: OpenUserMediaOptions, mode: "asRequested" | "sensorLandscape" | "highRes" | "soft"): SizeHint {
    const width = options.width
    const height = options.height
    const frameRate = options.frameRate ? {ideal: options.frameRate} : {ideal: 30}
    const aspect = options.aspectRatio

    if (mode === "highRes") {
        // Prefer the highest common sensor modes; canvas will reframe to portrait.
        return {
            width: {ideal: 3840},
            height: {ideal: 2160},
            frameRate,
        }
    }

    if (mode === "sensorLandscape" && width && height && height > width) {
        // Portrait intent → ask for landscape sensor mode with the long edge first.
        return {
            width: {ideal: Math.max(width, height)},
            height: {ideal: Math.min(width, height)},
            frameRate,
        }
    }

    if (mode === "asRequested" && (width || height || aspect)) {
        return {
            ...(width ? {width: {ideal: width}} : {}),
            ...(height ? {height: {ideal: height}} : {}),
            ...(aspect ? {aspectRatio: {ideal: aspect}} : {}),
            frameRate,
        }
    }

    // Soft: keep some resolution pressure without failing hard.
    if (width || height) {
        const longEdge = Math.max(width || 1280, height || 720)
        return {
            width: {ideal: longEdge},
            height: {ideal: Math.round(longEdge * 9 / 16)},
            frameRate,
        }
    }
    return {frameRate}
}

function buildSmoothVideoAttempts(
    facing: "user" | "environment",
    deviceId: string | undefined,
    audio: boolean,
    startTier = 0,
): MediaStreamConstraints[] {
    const attempts: MediaStreamConstraints[] = []
    const fps: ConstrainDouble = {min: MIN_SMOOTH_FPS, ideal: 30}
    const sizes = SMOOTH_SIZES.slice(Math.min(Math.max(startTier, 0), SMOOTH_SIZES.length - 1))
    const push = (video: MediaTrackConstraints, withAudio: boolean) => {
        attempts.push({audio: withAudio, video})
    }
    for (const size of sizes) {
        if (deviceId) push({deviceId: {exact: deviceId}, ...size, frameRate: fps}, audio)
        push({facingMode: {exact: facing}, ...size, frameRate: fps}, audio)
        push({facingMode: facing, ...size, frameRate: fps}, audio)
    }
    return attempts
}

function buildAttempts(
    facing: "user" | "environment",
    deviceId: string | undefined,
    audio: boolean,
    options: OpenUserMediaOptions,
): MediaStreamConstraints[] {
    const attempts: MediaStreamConstraints[] = []
    const modes: Array<"highRes" | "sensorLandscape" | "asRequested" | "soft"> = []

    const portraitIntent = !!(options.width && options.height && options.height > options.width)
    modes.push("highRes")
    if (portraitIntent) modes.push("sensorLandscape")
    modes.push("asRequested", "soft")

    const push = (video: boolean | MediaTrackConstraints, withAudio: boolean) => {
        attempts.push({audio: withAudio, video})
    }

    for (const mode of modes) {
        const size = sizeHint(options, mode)
        if (deviceId) {
            push({deviceId: {exact: deviceId}, ...size}, audio)
        }
        push({facingMode: {exact: facing}, ...size}, audio)
        push({facingMode: facing, ...size}, audio)
    }

    // Last-resort facing-only (still keep audio preference), then bare video.
    if (deviceId) {
        push({deviceId: {exact: deviceId}, frameRate: {ideal: 30}}, audio)
        push({deviceId: {exact: deviceId}}, false)
    }
    push({facingMode: {exact: facing}, frameRate: {ideal: 30}}, audio)
    push({facingMode: facing}, audio)
    push({facingMode: facing}, false)
    push(true, audio)
    push(true, false)

    return attempts
}

/** One independent getUserMedia call. No shared session. */
export async function openUserMedia(options: OpenUserMediaOptions = {}): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia is not available")
    }

    const facing = options.preferRear ? "environment" : "user"
    const deviceId = await cameraDeviceId(facing)
    const generalAttempts = buildAttempts(facing, deviceId, !!options.audio, options)
    const smooth = !!options.smoothVideo
    const tier = options.sizeTier ?? 0
    // When stepping down a tier, don't let the general fallbacks jump back to big sizes.
    const smoothFallbacks = tier > 0
        ? generalAttempts.filter((c) => c.video === true)
        : generalAttempts.filter(isSafeSmoothFallback)
    const attempts = smooth
        ? [...buildSmoothVideoAttempts(facing, deviceId, !!options.audio, tier), ...smoothFallbacks]
        : generalAttempts

    let lastError: unknown
    // Best stream seen so far when nothing reaches the target fps.
    let fallback: {stream: MediaStream; fps: number} | null = null

    for (const constraints of attempts) {
        for (let retry = 0; retry < 2; retry++) {
            try {
                if (retry > 0) await delay(160 * retry)
                const stream = await navigator.mediaDevices.getUserMedia(constraints)
                if (!smooth) return stream

                const settings = stream.getVideoTracks()[0]?.getSettings?.()
                const reportedFps = settings?.frameRate
                // Unknown fps → trust it. Known and too low → try the next (lighter) mode.
                if (reportedFps === undefined || reportedFps >= ACCEPT_SMOOTH_FPS) {
                    if (fallback) stopStream(fallback.stream)
                    return stream
                }
                if (!fallback || reportedFps > fallback.fps) {
                    stopStream(fallback?.stream)
                    fallback = {stream, fps: reportedFps}
                } else {
                    stopStream(stream)
                }
                break // don't retry the same constraints
            } catch (err) {
                lastError = err
            }
        }
    }
    if (fallback) return fallback.stream
    throw lastError ?? new Error("Unable to open camera")
}

/** In smooth mode only allow general fallbacks that don't request 4K. */
function isSafeSmoothFallback(constraints: MediaStreamConstraints): boolean {
    const video = constraints.video
    if (video === true || video === undefined || video === false) return true
    const width = (video as MediaTrackConstraints).width
    const ideal = typeof width === "object" && width !== null && "ideal" in width ? (width as {ideal?: number}).ideal : undefined
    return ideal === undefined || ideal <= 1920
}

export async function bindStreamToVideoElement(video: HTMLVideoElement, stream: MediaStream) {
    video.srcObject = stream
    video.muted = true
    video.defaultMuted = true
    video.autoplay = true
    video.playsInline = true
    video.setAttribute("playsinline", "true")
    video.setAttribute("webkit-playsinline", "true")
    try {
        await video.play()
    } catch {
        await video.play().catch(() => undefined)
    }
}
