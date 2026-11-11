import {createTheme, type Direction, type Theme} from "@mui/material/styles"

const fontFamily = "Vazirmatn-FD, Vazirmatn, sans-serif"

export function createFormTheme(direction: Direction): Theme {
    return createTheme({
        direction,
        palette: {
            primary: {
                main: "#0065dc",
                contrastText: "#ffffff",
            },
            error: {
                main: "#e53935",
            },
            background: {
                default: "#ffffff",
                paper: "#ffffff",
            },
            text: {
                primary: "#121212",
                secondary: "#666666",
            },
        },
        typography: {
            fontFamily,
            button: {
                textTransform: "none",
                fontWeight: 700,
            },
        },
        shape: {
            borderRadius: 12,
        },
        components: {
            MuiButton: {
                defaultProps: {
                    disableElevation: true,
                },
                styleOverrides: {
                    root: {
                        borderRadius: 25,
                        fontWeight: 700,
                    },
                    containedPrimary: {
                        padding: "10px 24px",
                    },
                    sizeLarge: {
                        padding: "12px 28px",
                        fontSize: "15px",
                    },
                },
            },
            MuiTextField: {
                defaultProps: {
                    variant: "outlined",
                    fullWidth: true,
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        backgroundColor: "#f2f3f5",
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#0065dc",
                        },
                        "&.Mui-focused": {
                            backgroundColor: "#ffffff",
                        },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#0065dc",
                        },
                    },
                    notchedOutline: {
                        borderColor: "transparent",
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                        fontFamily,
                        width: "100%",
                        maxWidth: 420,
                        marginLeft: "auto",
                        marginRight: "auto",
                        textAlign: "start",
                    },
                    paperWidthFalse: {
                        maxWidth: 420,
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paperAnchorBottom: {
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        width: "100%",
                        maxWidth: 420,
                        marginLeft: "auto",
                        marginRight: "auto",
                    },
                },
            },
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        fontFamily,
                    },
                },
            },
        },
    })
}

export const themeRtl = createFormTheme("rtl")
export const themeLtr = createFormTheme("ltr")
