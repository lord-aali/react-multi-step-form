import {useEffect} from "react"
import {Box, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup} from "@mui/material"
import type {StageFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import FieldHelper from "./FieldHelper"
import ItemList from "./ItemList"

export default function StageFieldItem({item}: { item: StageFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const error = itemError(item, store, texts, validators)
    const visible = item.options.filter((option) => !option.hidden)
    const value = String(store.get(item.name) ?? "")
    const selected = visible.find((option) => option.value === value)

    useEffect(() => {
        if (visible.length === 0) return
        if (!visible.some((option) => option.value === value)) {
            store.set(item.name, visible[0].value)
        }
    }, [item.name, store, value, visible])

    return (
        <FormControl className="msf-control msf-stage" component="fieldset" fullWidth error={!!error} sx={{mb: 0}}>
            {item.label ? (
                <FormLabel className="msf-label" sx={{fontWeight: 700, color: "text.primary"}}>{item.label}</FormLabel>
            ) : null}
            <RadioGroup
                row
                className="msf-stage-group"
                name={item.name}
                value={value}
                onChange={async (event) => {
                    if (item.dialogs?.onToggle) {
                        const ok = await ask(item.dialogs.onToggle)
                        if (!ok) return
                    }
                    store.set(item.name, event.target.value)
                }}
            >
                {visible.map((option) => (
                    <FormControlLabel
                        className="msf-stage-option"
                        key={option.value}
                        value={option.value}
                        control={<Radio sx={{p: 0, paddingInlineEnd: "6px"}}/>}
                        label={option.label}
                        sx={{marginInlineEnd: "32px"}}
                    />
                ))}
            </RadioGroup>
            <FieldHelper error={error}/>
            {selected?.items ? (
                <Box className="msf-stage-children" data-msf-part="stage-children" sx={{mt: 3, width: "100%"}}>
                    <ItemList items={selected.items}/>
                </Box>
            ) : null}
        </FormControl>
    )
}
