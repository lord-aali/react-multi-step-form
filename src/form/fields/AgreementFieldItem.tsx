import {useState} from "react"
import {Box, Button, Checkbox, FormControl, FormControlLabel, FormHelperText, Typography} from "@mui/material"
import type {AgreementFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"
import BottomSheet from "../ui/BottomSheet"
import AlertDialog from "../ui/AlertDialog"

export default function AgreementFieldItem({item}: { item: AgreementFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const [termsOpen, setTermsOpen] = useState(false)
    const error = itemError(item, store, texts, validators)
    const checked = store.get(item.name) === true
    const presentation = item.terms?.presentation ?? "sheet"

    return (
        <FormControl className="msf-agreement" error={!!error} required={isFieldRequired(item, validators)} sx={{mb: 2}}>
            <FormControlLabel
                className="msf-agreement-check"
                control={(
                    <Checkbox
                        checked={checked}
                        onChange={async (_event, next) => {
                            if (item.dialogs?.onToggle) {
                                const ok = await ask(item.dialogs.onToggle)
                                if (!ok) return
                            }
                            store.set(item.name, next)
                        }}
                    />
                )}
                label={item.label}
            />
            {item.terms ? (
                <Button className="msf-agreement-terms" variant="text" onClick={() => setTermsOpen(true)} sx={{alignSelf: "flex-start"}}>
                    {item.terms.title}
                </Button>
            ) : null}
            {error ? <FormHelperText className="msf-helper">{error}</FormHelperText> : null}
            {item.terms && presentation === "sheet" ? (
                <BottomSheet open={termsOpen} onClose={() => setTermsOpen(false)} title={item.terms.title}>
                    <Typography className="msf-agreement-body" sx={{whiteSpace: "pre-wrap", fontWeight: 300, lineHeight: "24px"}}>
                        {item.terms.body}
                    </Typography>
                </BottomSheet>
            ) : null}
            {item.terms && presentation === "alert" ? (
                <AlertDialog
                    open={termsOpen}
                    title={item.terms.title}
                    message={<Box className="msf-agreement-body" sx={{whiteSpace: "pre-wrap"}}>{item.terms.body}</Box>}
                    onClose={() => setTermsOpen(false)}
                    actions={<Button variant="contained" onClick={() => setTermsOpen(false)}>{texts.understood}</Button>}
                />
            ) : null}
        </FormControl>
    )
}
