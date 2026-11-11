import {useState} from "react"
import {TextField} from "@mui/material"
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined"
import type {DateFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"
import BottomSheet from "../ui/BottomSheet"
import DatePicker2 from "../date/DatePicker2"

function parseStored(value: string | undefined) {
    if (!value) return undefined
    const [year, month, day] = value.split("/").map((part) => Number(part))
    if (!year || !month || !day) return undefined
    return {year, month, day}
}

export default function DateFieldItem({item}: { item: DateFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const [open, setOpen] = useState(false)
    const error = itemError(item, store, texts, validators)
    const value = String(store.get(item.name) ?? "")

    async function openSheet() {
        if (item.dialogs?.onActivate) {
            const ok = await ask(item.dialogs.onActivate)
            if (!ok) return
        }
        setOpen(true)
    }

    return (
        <div className="msf-date" data-msf-part="date">
            <TextField
                className="msf-control msf-date-trigger"
                label={item.title}
                placeholder={item.placeholder}
                value={value}
                required={isFieldRequired(item, validators)}
                fullWidth
                error={!!error}
                helperText={error || undefined}
                slotProps={{
                    formHelperText: {className: "msf-helper", sx: {mt: 0.75}},
                    inputLabel: {className: "msf-label"},
                    input: {
                        readOnly: true,
                        endAdornment: <CalendarMonthOutlinedIcon/>,
                    },
                    htmlInput: {style: {cursor: "pointer", caretColor: "transparent"}},
                }}
                onClick={() => void openSheet()}
                sx={{mb: 0, "& .MuiInputBase-root": {cursor: "pointer"}}}
            />
            <BottomSheet open={open} onClose={() => setOpen(false)} title={item.dialogTitle || item.title} persistent>
                <DatePicker2
                    confirmLabel={texts.confirm}
                    defaultDate={parseStored(value)}
                    yearRange={item.yearRange}
                    formatMonthPreview={item.formatMonthPreview ?? "string"}
                    onDataReady={(data) => {
                        store.set(item.name, `${data.y}/${data.m.number}/${data.d}`)
                        setOpen(false)
                    }}
                />
            </BottomSheet>
        </div>
    )
}
