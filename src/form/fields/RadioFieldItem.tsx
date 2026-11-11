import {FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup} from "@mui/material"
import type {RadioFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"

export default function RadioFieldItem({item}: { item: RadioFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const error = itemError(item, store, texts, validators)
    const value = String(store.get(item.name) ?? "")

    return (
        <FormControl className="msf-control" component="fieldset" error={!!error} required={isFieldRequired(item, validators)} sx={{mb: 2}}>
            {item.label ? <FormLabel className="msf-label" sx={{fontWeight: 700, color: "text.primary", mb: 1}}>{item.label}</FormLabel> : null}
            <RadioGroup
                className="msf-radio-group"
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
                {item.options.filter((option) => !option.hidden).map((option) => (
                    <FormControlLabel
                        className="msf-radio-option"
                        key={option.value}
                        value={option.value}
                        control={<Radio/>}
                        label={option.label}
                    />
                ))}
            </RadioGroup>
            {error ? <FormHelperText className="msf-helper">{error}</FormHelperText> : null}
        </FormControl>
    )
}
