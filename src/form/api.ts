import type {DraftPayload} from "./store"

export interface ApiBody<T = unknown> {
    status: "ok" | "failed"
    message?: string
    data?: T
    errors?: Record<string, string>
}

export class ApiError extends Error {
    body?: ApiBody

    constructor(message: string, body?: ApiBody) {
        super(message)
        this.body = body
    }
}

async function parse<T>(res: Response): Promise<ApiBody<T>> {
    const body = await res.json().catch(() => ({
        status: "failed" as const,
        message: res.statusText || "Request failed",
    }))
    if (res.status >= 500) {
        throw new ApiError(body.message || "Server error", body)
    }
    return body
}

export async function api<T>(base: string, path: string, init?: RequestInit): Promise<ApiBody<T>> {
    const headers = new Headers(init?.headers)
    if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json")
    }
    const res = await fetch(`${base}${path}`, {
        credentials: "include",
        ...init,
        headers,
    })
    return parse<T>(res)
}

export function ensureSession(base: string) {
    return api(base, "/session", {method: "POST"})
}

export function loadDraft(base: string) {
    return api<DraftPayload | null>(base, "/session")
}

export function saveDraft(base: string, draft: DraftPayload) {
    return api(base, "/session", {method: "PUT", body: JSON.stringify(draft)})
}

export function insertDataset(base: string, id: string, values: Record<string, unknown>) {
    return api<{ id: number; key: string }>(base, "/datasets", {
        method: "POST",
        body: JSON.stringify({id, values}),
    })
}

export function getDataset(base: string, id: string, key: string) {
    return api<Record<string, unknown>>(base, `/datasets/${encodeURIComponent(id)}/${key}`)
}

export function updateDataset(base: string, id: string, key: string, values: Record<string, unknown>) {
    return api(base, `/datasets/${encodeURIComponent(id)}/${key}`, {
        method: "PUT",
        body: JSON.stringify({values}),
    })
}

export function uploadFile(base: string, id: string, key: string, column: string, blob: Blob) {
    const body = new FormData()
    const type = blob.type || "application/octet-stream"
    const ext = type.includes("webm") ? "webm"
        : type.includes("mp4") ? "mp4"
            : type.includes("png") ? "png"
                : type.includes("heic") ? "heic"
                    : type.includes("jpeg") || type.includes("jpg") ? "jpg"
                        : "bin"
    const file = blob instanceof File ? blob : new File([blob], `${column}.${ext}`, {type})
    body.set("file", file)
    return api(base, `/datasets/${encodeURIComponent(id)}/${key}/files/${encodeURIComponent(column)}`, {
        method: "POST",
        body,
    })
}
