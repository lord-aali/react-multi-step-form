import {Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel} from "@mui/material"
import type {CheckboxFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"
import FieldHelper from "./FieldHelper"

const DEFAULT_SEPARATOR = ","

export function checkboxSeparator(item: CheckboxFieldSchema): string {
    return item.separator ?? DEFAULT_SEPARATOR
}

export function parseCheckboxValues(raw: unknown, separator: string): string[] {
    const text = raw === undefined || raw === null ? "" : String(raw)
    if (!text) return []
    return text.split(separator).filter((part) => part !== "")
}

export function joinCheckboxValues(
    selected: Iterable<string>,
    options: CheckboxFieldSchema["options"],
    separator: string,
): string {
    const selectedSet = selected instanceof Set ? selected : new Set(selected)
    return options
        .filter((option) => !option.hidden && selectedSet.has(option.value))
        .map((option) => option.value)
        .join(separator)
}

export default function CheckboxFieldItem({item}: { item: CheckboxFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const error = itemError(item, store, texts, validators)
    const separator = checkboxSeparator(item)
    const selected = new Set(parseCheckboxValues(store.get(item.name), separator))
    const visibleOptions = item.options.filter((option) => !option.hidden)

    return (
        <FormControl
            className="msf-control msf-checkbox"
            component="fieldset"
            fullWidth
            error={!!error}
            required={isFieldRequired(item, validators)}
            sx={{mb: 0}}
        >
            {item.label ? (
                <FormLabel className="msf-label" sx={{fontWeight: 700, color: "text.primary", mb: 1}}>
                    {item.label}
                </FormLabel>
            ) : null}
            <FormGroup className="msf-checkbox-group">
                {visibleOptions.map((option) => (
                    <FormControlLabel
                        className="msf-checkbox-option"
                        key={option.value}
                        control={(
                            <Checkbox
                                checked={selected.has(option.value)}
                                onChange={async (_event, checked) => {
                                    if (item.dialogs?.onToggle) {
                                        const ok = await ask(item.dialogs.onToggle)
                                        if (!ok) return
                                    }
                                    const next = new Set(selected)
                                    if (checked) next.add(option.value)
                                    else next.delete(option.value)
                                    store.set(item.name, joinCheckboxValues(next, item.options, separator))
                                    store.markTouched(item.name)
                                }}
                            />
                        )}
                        label={option.label}
                    />
                ))}
            </FormGroup>
            <FieldHelper error={error}/>
        </FormControl>
    )
}
