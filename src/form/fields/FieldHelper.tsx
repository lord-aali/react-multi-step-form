import {FormHelperText} from "@mui/material"

export default function FieldHelper({error}: { error?: string }) {
    if (!error) return null
    return (
        <FormHelperText
            className="msf-helper"
            error
            sx={{mt: 0.75, mx: 0, mb: 0}}
        >
            {error}
        </FormHelperText>
    )
}
