import {Typography} from "@mui/material"
import type {TypographySchema} from "../schema"
import {useFormContext} from "../context"
import {interpolate} from "../logic"
import {useFormVersion} from "../store"

export default function TypographyItem({item}: { item: TypographySchema }) {
    const {store} = useFormContext()
    useFormVersion(store)
    const component = item.variant === "p" || item.variant === "span" ? item.variant : item.variant
    const variant = item.variant === "p" ? "body1" : item.variant === "span" ? "body2" : item.variant
    return (
        <Typography
            className={`msf-typography msf-typography-${item.variant}`}
            data-msf-part="typography"
            component={component}
            variant={variant}
            align={item.align}
            sx={{color: item.color || "text.primary", whiteSpace: "pre-wrap"}}
        >
            {interpolate(item.text, store.values)}
        </Typography>
    )
}
