import { ThemeOptions } from "@mui/material/styles";
import { error } from "console";

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    background:{
      default: "#F9F9F9"
    },
    common: {
      black:"#000",
      white:'#FFF',
    },
    primary: {
      light: "#00D998",
      main: "#015A2F",
      dark: "#1E4D3B",
    },
    secondary: {
      light: "#FACBCE",
      main: "#8D3359",
      dark: "#6B4559",
    },
    warning: {
      light: "#F2D0A7",
      main: "#83380E",
      dark: "#5C3607",
    },
    error: {
      light: "#FFC8CA",
      main: "#B50E16",
      dark: "#6D191D",
    },
    success: {
      light: "#00D998",
      main: "#015A2F",
      dark: "#1E4D3B",
    },
    info: {
      light: "#8BC0FF",
      main: "#0655B6",
      dark: "#0A3F7E",
    },
    grey:{
      50: "#FEFEFE",
      100: "#FAFAFA",
      200: "#EEEEEE",
      300: "#BDBDBD",
      400: "#A7A7A7",
      500: "#757575",
      600: "#616161",
      700: "#424242",
      800: "#323232",
      900: "#212121",
    },
  },
  shadows: [
      //Drop Shadows//
      "none",
      "0px 3px 5px rgba(0, 0, 0, 0.25)",
      "0px 3px 5px rgba(0, 0, 0, 0.30)",
      "0px 3px 5px rgba(0, 0, 0, 0.35)",
      "0px 3px 5px rgba(0, 0, 0, 0.40)",
      "0px 3px 5px rgba(0, 0, 0, 0.45)",
      "0px 3px 5px rgba(0, 0, 0, 0.50)",
      "0px 3px 5px rgba(0, 0, 0, 0.55)",
      "0px 3px 5px rgba(0, 0, 0, 0.60)",
      "0px 3px 5px rgba(0, 0, 0, 0.65)",
      "0px 3px 5px rgba(0, 0, 0, 0.70)",
      "0px 3px 5px rgba(0, 0, 0, 0.80)",
      "0px 3px 5px rgba(0, 0, 0, 0.85)",
      "0px 3px 5px rgba(0, 0, 0, 0.90)",
      "0px 3px 5px rgba(0, 0, 0, 0.95)",
      "auto",
      "auto",
      "auto",
      "auto",
      "auto",
      "auto",
      "auto",
      "auto",
      //Inner Shadows//
      "inset 0px 0px 25px rgba(0, 0, 0, 0.25)",
      "inset 0px 0px 25px rgba(0, 0, 0, 0.50)",
    ],
  typography: {
    fontFamily: [
      "Ubuntu",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          display: "flex",
          borderRadius: "0px 20px 20px 0px",
          },
        },
      },
    MuiAppBar: {
      styleOverrides: {
        root: {
          height: "auto",
        },
      },
    },
    MuiLinearProgress:{
      styleOverrides:{
        root: {
          backgroundColor: "#C4C4C4",
        },
      },
    },
    MuiFilledInput:{
      styleOverrides:{
        root:{
          '&.Mui-disabled':{
            border: '1px dotted',
            borderRadius: '4px',
          },
          '&.Mui-disabled:before':{
            borderBottom: 'hidden',
            borderRadius: '4px',
          },
        },
      },
    },
  },
};

export default lightThemeOptions;
