import {Backdrop, Box, CircularProgress, Typography} from "@mui/material"

export default function LoadingHover({open, message}: { open: boolean; message: string }) {
    return (
        <Backdrop className="msf-loading" open={open} sx={{zIndex: (theme) => theme.zIndex.modal + 1, color: "inherit"}}>
            <Box sx={{
                bgcolor: "background.paper",
                borderRadius: 2,
                p: 3,
                minWidth: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
            }}>
                <CircularProgress/>
                <Typography className="msf-loading-text">{message}</Typography>
            </Box>
        </Backdrop>
    )
}
