import {useRef} from "react"
import {TextField} from "@mui/material"
import type {TextFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"
import {resolveFieldDir} from "./fieldDirection"

export default function TextFieldItem({item}: { item: TextFieldSchema }) {
    const {store, texts, ask, dir: formDir, validators} = useFormContext()
    useFormVersion(store)
    const asked = useRef(false)
    const error = itemError(item, store, texts, validators)
    const value = String(store.get(item.name) ?? "")
    const fieldDir = resolveFieldDir(item, formDir)
    const numeric = item.inputType === "tel" || item.inputType === "number"
    const required = isFieldRequired(item, validators)

    return (
        <TextField
            className="msf-control"
            name={item.name}
            label={item.label}
            placeholder={item.placeholder}
            value={value}
            type={item.inputType === "number" ? "text" : (item.inputType ?? "text")}
            dir={fieldDir}
            required={required}
            fullWidth
            error={!!error}
            helperText={error || undefined}
            slotProps={{
                formHelperText: {className: "msf-helper", sx: {mt: 0.75}},
                inputLabel: {className: "msf-label"},
                htmlInput: {
                    inputMode: numeric ? "numeric" : undefined,
                    dir: fieldDir,
                    style: {direction: fieldDir},
                },
            }}
            sx={{
                mb: 0,
                "& .MuiInputBase-input": {direction: fieldDir, textAlign: "start"},
            }}
            onFocus={async () => {
                if (!item.dialogs?.onActivate || asked.current) return
                asked.current = true
                const ok = await ask(item.dialogs.onActivate)
                if (!ok) (document.activeElement as HTMLElement | null)?.blur()
            }}
            onBlur={() => {
                asked.current = false
                store.markTouched(item.name)
            }}
            onChange={(event) => store.set(item.name, event.target.value)}
        />
    )
}
