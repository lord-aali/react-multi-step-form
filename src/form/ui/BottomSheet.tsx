import type {ReactNode} from "react"
import {Box, Drawer, IconButton, SwipeableDrawer, Typography} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"

const paperStyle = {
    width: "100%",
    maxWidth: 420,
    maxHeight: "85vh",
    marginLeft: "auto",
    marginRight: "auto",
    "&::-webkit-scrollbar": {display: {xs: "block", md: "none"}},
    scrollbarWidth: {xs: "auto", md: "none"},
}

export default function BottomSheet({
    open,
    onClose,
    title,
    children,
    persistent = false,
}: {
    open: boolean
    onClose: () => void
    title?: string
    children?: ReactNode
    persistent?: boolean
}) {
    const body = (
        <Box className="msf-sheet" sx={{px: 2, pt: 2, pb: 3}}>
            <Box className="msf-sheet-header" sx={{display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2}}>
                <Typography className="msf-sheet-title" variant="h6" sx={{fontWeight: 800, fontSize: 16}}>
                    {title}
                </Typography>
                <IconButton className="msf-sheet-close" onClick={onClose} edge="end" aria-label="close">
                    <CloseIcon/>
                </IconButton>
            </Box>
            <Box className="msf-sheet-body">{children}</Box>
        </Box>
    )

    if (persistent) {
        return (
            <Drawer
                anchor="bottom"
                open={open}
                onClose={(_event, reason) => {
                    if (reason === "escapeKeyDown") return
                    onClose()
                }}
                slotProps={{
                    transition: {mountOnEnter: true, unmountOnExit: true},
                    paper: {sx: paperStyle, className: "msf-sheet-paper"},
                }}
                transitionDuration={{enter: 300, exit: 250}}
            >
                {body}
            </Drawer>
        )
    }

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => undefined}
            disableSwipeToOpen
            transitionDuration={{enter: 300, exit: 250}}
            slotProps={{
                paper: {sx: paperStyle, className: "msf-sheet-paper"},
            }}
        >
            {body}
        </SwipeableDrawer>
    )
}
