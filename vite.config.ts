import {defineConfig} from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import {resolve} from "node:path"

export default defineConfig({
    base: "./",
    experimental: {
        renderBuiltUrl(filename, {hostType}) {
            if (hostType === "css") return `./${filename}`
            return {relative: true}
        },
    },
    plugins: [
        react(),
        dts({
            include: ["src/index.ts", "src/form"],
            exclude: ["src/demo"],
            rollupTypes: true,
            tsconfigPath: "./tsconfig.json",
        }),
    ],
    build: {
        assetsInlineLimit: 4096,
        lib: {
            entry: resolve(__dirname, "src/index.ts"),
            formats: ["es"],
            fileName: "index",
            cssFileName: "style",
        },
        cssCodeSplit: false,
        rollupOptions: {
            external: (id) => {
                if (id.endsWith(".css")) return false
                return /^(react|react-dom|react\/jsx-runtime|@mui\/|@emotion\/|stylis|stylis-plugin-rtl|notistack|keen-slider)/.test(id)
            },
        },
    },
})
