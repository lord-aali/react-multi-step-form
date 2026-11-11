import {type ReactElement, useEffect} from "react"
import {Alert} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon from "@mui/icons-material/Cancel"
import WarningIcon from "@mui/icons-material/Warning"
import {useSnackbar} from "notistack"
import type {SxProps} from "@mui/material/styles"

export interface CustomMessage {
    type: "error" | "success" | "warning"
    message?: React.ReactNode
}

const sx: SxProps = {
    width: "100%",
    boxSizing: "border-box",
    ".MuiAlert-icon": {
        ml: "0 !important",
        mr: "8px !important",
        mt: "3px !important",
    },
    ".MuiAlert-message": {
        py: "12px !important",
        width: "100%",
    },
}

function alertFor(severity: string, message: React.ReactNode): ReactElement {
    if (severity === "error") {
        return <Alert className="msf-snackbar" variant="filled" severity="error" icon={<CancelIcon/>} sx={sx}>{message}</Alert>
    }
    if (severity === "warning") {
        return <Alert className="msf-snackbar" variant="filled" severity="warning" icon={<WarningIcon/>} sx={sx}>{message}</Alert>
    }
    return <Alert className="msf-snackbar" variant="filled" severity="success" icon={<CheckCircleIcon/>} sx={sx}>{message}</Alert>
}

export default function CustomSnackbar({message, autoHideDuration}: { message: CustomMessage; autoHideDuration?: number }) {
    const {enqueueSnackbar} = useSnackbar()

    useEffect(() => {
        if (message?.message === undefined) return
        enqueueSnackbar(alertFor(message.type, message.message), {
            preventDuplicate: true,
            autoHideDuration,
        })
    }, [message, autoHideDuration, enqueueSnackbar])

    return null
}

export function pushSnackbar(
    enqueue: (node: ReactElement, options?: { preventDuplicate?: boolean; autoHideDuration?: number }) => void,
    type: CustomMessage["type"],
    message: React.ReactNode,
) {
    enqueue(alertFor(type, message), {preventDuplicate: true, autoHideDuration: 4000})
}
