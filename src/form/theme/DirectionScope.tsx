import {CacheProvider} from "@emotion/react"
import createCache from "@emotion/cache"
import rtlPlugin from "stylis-plugin-rtl"
import {ThemeProvider} from "@mui/material"
import type {ReactNode} from "react"
import type {Direction} from "../schema"
import {themeLtr, themeRtl} from "./theme"

// Only rtlPlugin. Do not add the stylis prefixer: together they crash on ::placeholder.
const cacheRtl = createCache({
    key: "msfrtl",
    stylisPlugins: [rtlPlugin],
})

const cacheLtr = createCache({
    key: "msfltr",
})

export function DirectionScope({dir, children}: { dir: Direction; children: ReactNode }) {
    const rtl = dir === "rtl"
    return (
        <CacheProvider value={rtl ? cacheRtl : cacheLtr}>
            <ThemeProvider theme={rtl ? themeRtl : themeLtr}>
                {children}
            </ThemeProvider>
        </CacheProvider>
    )
}
