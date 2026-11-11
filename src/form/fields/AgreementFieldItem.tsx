import {useState} from "react"
import {Box, Button, Checkbox, FormControl, FormControlLabel, Typography} from "@mui/material"
import type {AgreementFieldSchema} from "../schema"
import {useFormContext} from "../context"
import {itemError} from "../logic"
import {useFormVersion} from "../store"
import {isFieldRequired} from "../validators"
import BottomSheet from "../ui/BottomSheet"
import AlertDialog from "../ui/AlertDialog"
import RichContent from "../ui/RichContent"
import FieldHelper from "./FieldHelper"

export default function AgreementFieldItem({item}: { item: AgreementFieldSchema }) {
    const {store, texts, ask, validators} = useFormContext()
    useFormVersion(store)
    const [termsOpen, setTermsOpen] = useState(false)
    const error = itemError(item, store, texts, validators)
    const checked = store.get(item.name) === true
    const presentation = item.terms?.presentation ?? "sheet"
    const staticTerms = item.terms && presentation === "static"

    return (
        <FormControl
            className="msf-agreement"
            error={!!error}
            required={isFieldRequired(item, validators)}
            fullWidth
            sx={{mb: 0, display: "flex", flexDirection: "column", alignItems: "stretch"}}
        >
            {staticTerms ? (
                <Box className="msf-agreement-static" data-msf-part="agreement-static" sx={{mb: 1.5}}>
                    {item.terms!.title ? (
                        <Typography
                            className="msf-agreement-static-title msf-label"
                            component="h3"
                            sx={{fontWeight: 700, color: "text.primary", mb: 1, fontSize: "1rem"}}
                        >
                            {item.terms!.title}
                        </Typography>
                    ) : null}
                    <Box className="msf-agreement-body msf-agreement-static-body" sx={{fontWeight: 300, lineHeight: "24px", color: "text.secondary"}}>
                        <RichContent value={item.terms!.body} values={store.values}/>
                    </Box>
                </Box>
            ) : null}
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
            {item.terms && presentation !== "static" ? (
                <Button className="msf-agreement-terms" variant="text" onClick={() => setTermsOpen(true)} sx={{alignSelf: "flex-start"}}>
                    {item.terms.title}
                </Button>
            ) : null}
            <FieldHelper error={error}/>
            {item.terms && presentation === "sheet" ? (
                <BottomSheet open={termsOpen} onClose={() => setTermsOpen(false)} title={item.terms.title}>
                    <Box className="msf-agreement-body" sx={{fontWeight: 300, lineHeight: "24px"}}>
                        <RichContent value={item.terms.body} values={store.values}/>
                    </Box>
                </BottomSheet>
            ) : null}
            {item.terms && presentation === "alert" ? (
                <AlertDialog
                    open={termsOpen}
                    title={item.terms.title}
                    message={<Box className="msf-agreement-body"><RichContent value={item.terms.body} values={store.values}/></Box>}
                    onClose={() => setTermsOpen(false)}
                    actions={<Button variant="contained" onClick={() => setTermsOpen(false)}>{texts.understood}</Button>}
                />
            ) : null}
        </FormControl>
    )
}
