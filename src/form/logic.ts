import type {DialogSpec, FormItem, FormPage, FormSchema, FormTexts, ShowWhen} from "./schema"
import type {FormStore, Scalar} from "./store"
import {
    indexValidators,
    isFieldRequired,
    type ValidatorMap,
    validateScalarValue,
    JALALI,
} from "./validators"

export function conditionMatches(
    when: ShowWhen | ShowWhen[] | undefined,
    match: "all" | "any" | undefined,
    values: Record<string, Scalar | undefined>,
): boolean {
    if (!when) return true
    const list = Array.isArray(when) ? when : [when]
    if (list.length === 0) return true
    const results = list.map((condition) => evalCondition(condition, values))
    return (match ?? "all") === "any" ? results.some(Boolean) : results.every(Boolean)
}

function evalCondition(condition: ShowWhen, values: Record<string, Scalar | undefined>): boolean {
    const raw = values[condition.field]
    const empty = raw === undefined || raw === null || raw === ""
    switch (condition.op) {
        case "empty":
            return empty
        case "notEmpty":
            return !empty
        case "eq":
            return String(raw ?? "") === String(condition.value ?? "")
        case "neq":
            return String(raw ?? "") !== String(condition.value ?? "")
        case "gt":
            return Number(raw) > Number(condition.value)
        case "lt":
            return Number(raw) < Number(condition.value)
        case "in":
            return Array.isArray(condition.value) && condition.value.map(String).includes(String(raw ?? ""))
        case "notIn":
            return Array.isArray(condition.value) && !condition.value.map(String).includes(String(raw ?? ""))
        default:
            return true
    }
}

export function isItemVisible(item: FormItem, values: Record<string, Scalar | undefined>): boolean {
    if (!item.visibleWhen) return true
    return conditionMatches(item.visibleWhen, item.match, values)
}

export function isPageSkipped(page: FormPage, values: Record<string, Scalar | undefined>): boolean {
    if (!page.skipWhen) return false
    return conditionMatches(page.skipWhen, page.match, values)
}

export function findStep(pages: FormPage[], from: number, dir: 1 | -1, values: Record<string, Scalar | undefined>): number {
    let index = from + dir
    while (index >= 0 && index < pages.length) {
        if (!isPageSkipped(pages[index], values)) return index
        index += dir
    }
    return -1
}

function childItems(item: FormItem, values: Record<string, Scalar | undefined>): FormItem[] {
    if (item.type === "stage") {
        const current = String(values[item.name] ?? "")
        const option = item.options.find((entry) => !entry.hidden && entry.value === current)
        return option?.items ?? []
    }
    if (item.type === "select") {
        const current = String(values[item.name] ?? "")
        const option = item.items.find((entry) => (entry.value ?? entry.title) === current)
        return option?.items ?? []
    }
    return []
}

export function eachVisible(items: FormItem[], values: Record<string, Scalar | undefined>, visit: (item: FormItem) => void) {
    for (const item of items) {
        if (!isItemVisible(item, values)) continue
        visit(item)
        const children = childItems(item, values)
        if (children.length) eachVisible(children, values, visit)
    }
}

function eachBranch(items: FormItem[], visit: (item: FormItem) => void) {
    for (const item of items) {
        visit(item)
        if (item.type === "stage") {
            item.options.forEach((option) => option.items && eachBranch(option.items, visit))
        }
        if (item.type === "select") {
            item.items.forEach((option) => option.items && eachBranch(option.items, visit))
        }
    }
}

export function applyDefaults(schema: FormSchema, store: FormStore) {
    const next: Record<string, Scalar> = {}
    schema.pages.forEach((page) => {
        eachBranch(page.items, (item) => {
            if (!item.name) return
            if (!("defaultValue" in item) || item.defaultValue === undefined) return
            if (store.values[item.name] !== undefined) return
            next[item.name] = item.defaultValue
        })
    })
    if (Object.keys(next).length > 0) store.mergeValues(next)
}

export function itemError(
    item: FormItem,
    store: FormStore,
    texts: FormTexts,
    validators: ValidatorMap = {},
): string | undefined {
    if (item.type === "typography" || !item.name) return undefined
    const server = store.serverErrors[item.name]
    if (server) return server

    const error = validateItem(item, store, texts, validators)
    if (!error) return undefined
    if (store.showErrors) return error
    if (item.name && store.touched[item.name]) return error
    if (item.type === "text") {
        const value = String(store.get(item.name) ?? "")
        if (value.length > 0) return error
    }
    return undefined
}

export function validateItem(
    item: FormItem,
    store: FormStore,
    texts: FormTexts,
    validators: ValidatorMap = {},
): string | undefined {
    if (item.type === "typography" || !item.name) return undefined

    if (item.type === "text") {
        return validateScalarValue(item, String(store.get(item.name) ?? ""), validators, texts)
    }

    if (!isFieldRequired(item, validators)) return undefined

    if (item.type === "radio" || item.type === "stage" || item.type === "select") {
        const value = store.get(item.name)
        if (value === undefined || value === null || value === "") {
            return item.errorMessage || texts.required
        }
        return undefined
    }

    if (item.type === "date") {
        const value = String(store.get(item.name) ?? "")
        if (!value) return item.errorMessage || texts.required
        if (!JALALI.test(value)) return item.errorMessage || texts.invalid
        return undefined
    }

    if (item.type === "agreement") {
        return store.get(item.name) === true ? undefined : (item.errorMessage || texts.agreeRequired)
    }

    if (item.type === "file") {
        const file = store.files[item.name]
        if (file?.blob || file?.onServer) return undefined
        return item.errorMessage || texts.fileRequired.replace("این فایل", item.placeholder)
    }

    return undefined
}

export function isPageValid(
    page: FormPage,
    store: FormStore,
    texts: FormTexts,
    validators: ValidatorMap | import("./schema").FormValidator[] = {},
): boolean {
    const map = Array.isArray(validators) ? indexValidators(validators) : validators
    let valid = true
    eachVisible(page.items, store.values, (item) => {
        if (validateItem(item, store, texts, map)) valid = false
    })
    return valid
}

export function pageDialogs(page: FormPage, store: FormStore, key: "beforeNext" | "beforePrev"): DialogSpec[] {
    const specs: DialogSpec[] = []
    const pageSpec = key === "beforeNext" ? page.beforeNext : page.beforePrev
    if (pageSpec) specs.push(pageSpec)
    eachVisible(page.items, store.values, (item) => {
        const spec = item.dialogs?.[key]
        if (spec) specs.push(spec)
    })
    return specs
}

export function collectValues(schema: FormSchema, store: FormStore): Record<string, Scalar | null> {
    const out: Record<string, Scalar | null> = {}
    const active = new Set<string>()
    const named = new Set<string>()
    schema.pages.forEach((page) => {
        eachBranch(page.items, (item) => {
            if (item.name) named.add(item.name)
        })
        if (isPageSkipped(page, store.values)) return
        eachVisible(page.items, store.values, (item) => {
            if (!item.name || item.type === "typography") return
            active.add(item.name)
            if (item.type === "file") return
            const value = store.get(item.name)
            out[item.name] = value === undefined ? null : value
        })
    })
    named.forEach((name) => {
        if (!active.has(name)) out[name] = null
    })
    return out
}

export function activeFileNames(schema: FormSchema, store: FormStore): string[] {
    const names: string[] = []
    schema.pages.forEach((page) => {
        if (isPageSkipped(page, store.values)) return
        eachVisible(page.items, store.values, (item) => {
            if (item.type === "file") names.push(item.name)
        })
    })
    return names
}

export function interpolate(text: string, values: Record<string, Scalar | undefined>): string {
    return text.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, name: string) => {
        const value = values[name]
        return value === undefined || value === null ? "" : String(value)
    })
}
