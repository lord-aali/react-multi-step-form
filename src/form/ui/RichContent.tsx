import type {CSSProperties} from "react"
import {looksLikeHtml, resolveRichText, sanitizeHtml, type RichText} from "../richText"
import type {Scalar} from "../store"

export default function RichContent({
    value,
    className,
    values,
    style,
}: {
    value?: RichText | null
    className?: string
    values?: Record<string, Scalar | undefined>
    style?: CSSProperties
}) {
    const resolved = resolveRichText(value ?? undefined, values)
    if (resolved === undefined || resolved === null || resolved === false) return null

    if (typeof resolved !== "string") {
        return <span className={className ? `msf-rich-text ${className}` : "msf-rich-text"} style={style}>{resolved}</span>
    }

    if (!looksLikeHtml(resolved)) {
        return (
            <span
                className={className ? `msf-rich-text msf-rich-text-plain ${className}` : "msf-rich-text msf-rich-text-plain"}
                style={{whiteSpace: "pre-wrap", ...style}}
            >
                {resolved}
            </span>
        )
    }

    return (
        <div
            className={className ? `msf-rich-text msf-rich-text-html ${className}` : "msf-rich-text msf-rich-text-html"}
            style={style}
            dangerouslySetInnerHTML={{__html: sanitizeHtml(resolved)}}
        />
    )
}
