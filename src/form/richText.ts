import type {RichText} from "./schema"
import type {Scalar} from "./store"
import {interpolate} from "./logic"

export type {RichText} from "./schema"

export function isRichTextString(value: RichText | undefined | null): value is string {
    return typeof value === "string"
}

export function looksLikeHtml(value: string): boolean {
    return /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(value)
}

const ALLOWED_TAGS = new Set([
    "A", "B", "BR", "DIV", "EM", "H1", "H2", "H3", "H4", "H5", "H6",
    "I", "LI", "OL", "P", "SPAN", "STRONG", "SUB", "SUP", "U", "UL",
])

const VOID_REMOVE_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "SVG"])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
    A: new Set(["href", "title", "target", "rel"]),
    SPAN: new Set(["class"]),
    DIV: new Set(["class"]),
    P: new Set(["class"]),
    UL: new Set(["class"]),
    OL: new Set(["class"]),
    LI: new Set(["class"]),
}

function isSafeHref(href: string): boolean {
    const value = href.trim().toLowerCase()
    return value.startsWith("http://")
        || value.startsWith("https://")
        || value.startsWith("mailto:")
        || value.startsWith("#")
        || value.startsWith("/")
}

export function sanitizeHtml(html: string): string {
    if (typeof DOMParser === "undefined") {
        return html.replace(/<[^>]*>/g, "")
    }
    const doc = new DOMParser().parseFromString(`<div id="msf-root">${html}</div>`, "text/html")
    const root = doc.getElementById("msf-root")
    if (!root) return ""

    const walk = (node: Node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const el = child as HTMLElement
                const tag = el.tagName.toUpperCase()
                if (VOID_REMOVE_TAGS.has(tag)) {
                    node.removeChild(el)
                    continue
                }
                if (!ALLOWED_TAGS.has(tag)) {
                    while (el.firstChild) node.insertBefore(el.firstChild, el)
                    node.removeChild(el)
                    continue
                }
                const allowed = ALLOWED_ATTRS[tag]
                for (const attr of Array.from(el.attributes)) {
                    const name = attr.name.toLowerCase()
                    if (name.startsWith("on") || !allowed?.has(name)) {
                        el.removeAttribute(attr.name)
                        continue
                    }
                    if (name === "href" && !isSafeHref(attr.value)) {
                        el.removeAttribute(attr.name)
                    }
                    if (name === "target") {
                        el.setAttribute("rel", "noopener noreferrer")
                    }
                }
                walk(el)
            } else if (child.nodeType !== Node.TEXT_NODE) {
                node.removeChild(child)
            }
        }
    }

    walk(root)
    return root.innerHTML
}

export function resolveRichText(
    value: RichText | undefined,
    values?: Record<string, Scalar | undefined>,
): RichText | undefined {
    if (value === undefined || value === null || value === false) return undefined
    if (typeof value !== "string") return value
    if (!values) return value
    return interpolate(value, values)
}
