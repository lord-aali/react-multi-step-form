import type {ReactNode} from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import {useFormContext} from "../context"
import {DirectionScope} from "../theme/DirectionScope"
import type {RichText} from "../schema"
import RichContent from "./RichContent"

export default function AlertDialog({
    open,
    title,
    message,
    actions,
    onClose,
}: {
    open: boolean
    title?: ReactNode
    message?: RichText
    actions?: ReactNode
    onClose?: () => void
}) {
    const {dir, store} = useFormContext()

    return (
        <DirectionScope dir={dir}>
            <Dialog
                className="msf-dialog"
                open={open}
                onClose={onClose}
                aria-labelledby="msf-dialog-title"
                maxWidth={false}
                dir={dir}
                PaperProps={{
                    className: "msf-dialog-paper",
                    dir,
                    sx: {
                        width: "100%",
                        maxWidth: 420,
                        mx: 2,
                    },
                }}
            >
                {title ? (
                    <DialogTitle id="msf-dialog-title" className="msf-dialog-title" dir={dir}>
                        {title}
                    </DialogTitle>
                ) : null}
                <DialogContent className="msf-dialog-body" dir={dir}>
                    <div className="msf-dialog-message" dir={dir}>
                        <RichContent value={message} values={store.values}/>
                    </div>
                </DialogContent>
                <DialogActions className="msf-dialog-actions" dir={dir}>
                    {actions}
                </DialogActions>
            </Dialog>
        </DirectionScope>
    )
}
