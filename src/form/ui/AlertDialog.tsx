import type {ReactNode} from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogContentText from "@mui/material/DialogContentText"
import DialogTitle from "@mui/material/DialogTitle"

export default function AlertDialog({
    open,
    title,
    message,
    actions,
    onClose,
}: {
    open: boolean
    title?: ReactNode
    message?: ReactNode
    actions?: ReactNode
    onClose?: () => void
}) {
    return (
        <Dialog className="msf-dialog" open={open} onClose={onClose} aria-labelledby="msf-dialog-title">
            {title ? <DialogTitle id="msf-dialog-title" className="msf-dialog-title">{title}</DialogTitle> : null}
            <DialogContent className="msf-dialog-body">
                {typeof message === "string" ? (
                    <DialogContentText>{message}</DialogContentText>
                ) : message}
            </DialogContent>
            <DialogActions className="msf-dialog-actions">{actions}</DialogActions>
        </Dialog>
    )
}
