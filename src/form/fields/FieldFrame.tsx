import type {ReactNode} from "react"
import {Box} from "@mui/material"
import type {Direction, FormItem} from "../schema"
import {DirectionScope} from "../theme/DirectionScope"
import {resolveFieldDir} from "./fieldDirection"

export default function FieldFrame({
    item,
    formDir,
    children,
}: {
    item: FormItem
    formDir: Direction
    children: ReactNode
}) {
    const fieldDir = resolveFieldDir(item, formDir)
    const className = [
        "msf-field",
        `msf-field-${item.type}`,
        item.name ? `msf-field-${item.name}` : "",
        item.className ?? "",
    ].filter(Boolean).join(" ")

    const node = (
        <Box
            className={className}
            dir={fieldDir}
            data-msf-part="field"
            data-type={item.type}
            data-field={item.name}
            data-dir={fieldDir}
            sx={{mb: item.type === "typography" ? 1.5 : 0}}
        >
            {children}
        </Box>
    )

    if (fieldDir !== formDir) {
        return <DirectionScope dir={fieldDir}>{node}</DirectionScope>
    }
    return node
}
