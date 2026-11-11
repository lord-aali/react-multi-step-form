import {useState} from "react"
import {FormHelperText, List, ListItemButton, TextField} from "@mui/material"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import type {SelectFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"
import BottomSheet from "../ui/BottomSheet"
import ItemList from "./ItemList"

export default function SelectFieldItem({item}: { item: SelectFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const [open, setOpen] = useState(false)
    const error = itemError(item, store, texts, validators)
    const value = String(store.get(item.name) ?? "")
    const selected = item.items.find((entry) => (entry.value ?? entry.title) === value)

    async function openSheet() {
        if (item.dialogs?.onActivate) {
            const ok = await ask(item.dialogs.onActivate)
            if (!ok) return
        }
        setOpen(true)
    }

    return (
        <div className="msf-select" data-msf-part="select">
            <TextField
                className="msf-control msf-select-trigger"
                label={item.title}
                value={value || (item.placeholder ?? texts.selectPlaceholder)}
                required={isFieldRequired(item, validators)}
                error={!!error}
                helperText={error || " "}
                FormHelperTextProps={{className: "msf-helper"}}
                InputLabelProps={{className: "msf-label"}}
                InputProps={{
                    readOnly: true,
                    endAdornment: <KeyboardArrowDownIcon/>,
                }}
                inputProps={{style: {cursor: "pointer", caretColor: "transparent"}}}
                onClick={() => void openSheet()}
                sx={{mb: 1, "& .MuiInputBase-root": {cursor: "pointer"}}}
            />
            {selected?.items ? <ItemList items={selected.items}/> : null}
            {!error ? null : <FormHelperText className="msf-helper" error sx={{display: "none"}}>{error}</FormHelperText>}
            <BottomSheet open={open} onClose={() => setOpen(false)} title={item.title}>
                <List className="msf-sheet-list" disablePadding>
                    {item.items.map((entry) => {
                        const entryValue = entry.value ?? entry.title
                        return (
                            <ListItemButton
                                className="msf-sheet-item"
                                key={entryValue}
                                selected={entryValue === value}
                                onClick={() => {
                                    store.set(item.name, entryValue)
                                    setOpen(false)
                                }}
                                sx={{borderRadius: 2, mb: 0.5, justifyContent: "center"}}
                            >
                                <span className="msf-sheet-item-label" style={{fontWeight: 600}}>{entry.title}</span>
                            </ListItemButton>
                        )
                    })}
                </List>
            </BottomSheet>
        </div>
    )
}
