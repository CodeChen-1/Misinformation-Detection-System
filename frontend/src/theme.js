import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Dark mode palette — deep purple background with gold accents.
const darkTheme = {
  palette: {
    mode: "dark",
    primary: { main: "#8833FF", light: "#BB86FC", dark: "#5C00CC" },
    secondary: { main: "#FFB300", light: "#FFCA28", dark: "#C79100" },
    background: { default: "#0D0B1E", paper: "rgba(25, 22, 56, 0.92)" },
    text: { primary: "#EDEAF5", secondary: "#B0ABC8" },
    error: { main: "#FF3D00" },
    success: { main: "#00E676" },
    warning: { main: "#FF9100" },
    info: { main: "#00BCD4" },
  },
};

// Light mode palette — soft lavender background with deep purple accents.
const lightTheme = {
  palette: {
    mode: "light",
    primary: { main: "#7C3AED", light: "#A78BFA", dark: "#5B21B6" },
    secondary: { main: "#D97706", light: "#F59E0B", dark: "#92400E" },
    background: { default: "#F5F3FF", paper: "#FFFFFF" },
    text: { primary: "#1A1433", secondary: "#6B6399" },
    error: { main: "#DC2626" },
    success: { main: "#16A34A" },
    warning: { main: "#EA580C" },
    info: { main: "#0891B2" },
  },
};

// Shared MUI component overrides applied in both light and dark mode.
const sharedComponents = {
  // Smooth dark/light transitions and purple-themed scrollbar styling.
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        transition: "background-color 0.35s ease, color 0.35s ease",
      },
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "&::-webkit-scrollbar-track": {
        background: "transparent",
      },
      "&::-webkit-scrollbar-thumb": {
        background: "rgba(136, 51, 255, 0.3)",
        borderRadius: "4px",
      },
      "&::-webkit-scrollbar-thumb:hover": {
        background: "rgba(136, 51, 255, 0.5)",
      },
      "*": {
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(136, 51, 255, 0.3) transparent",
      },
    },
  },
  // Pill-shaped buttons with gradient backgrounds and glow on hover.
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: "24px", padding: "10px 24px" },
      containedPrimary: {
        background: "linear-gradient(135deg, #8833FF 0%, #FFB300 100%)",
        "&:hover": {
          background: "linear-gradient(135deg, #BB86FC 0%, #FFCA28 100%)",
          boxShadow: "0 0 24px rgba(136, 51, 255, 0.5)",
        },
      },
      outlined: ({ theme }) => ({
        backgroundColor: theme.palette.mode === "light" ? "#FFFFFF" : theme.palette.primary.main,
        color: theme.palette.mode === "light" ? theme.palette.primary.main : "#FFFFFF",
        borderColor: theme.palette.primary.main,
        "&:hover": {
          backgroundColor: theme.palette.mode === "light"
            ? theme.palette.primary.light
            : theme.palette.primary.dark,
          borderColor: theme.palette.mode === "light"
            ? theme.palette.primary.dark
            : theme.palette.primary.light,
        },
        "&.Mui-disabled": {
          backgroundColor: theme.palette.mode === "light"
            ? "rgba(0, 0, 0, 0.08)"
            : "rgba(255, 255, 255, 0.08)",
          color: theme.palette.mode === "light"
            ? "rgba(0, 0, 0, 0.26)"
            : "rgba(255, 255, 255, 0.3)",
          borderColor: theme.palette.mode === "light"
            ? "rgba(0, 0, 0, 0.12)"
            : "rgba(255, 255, 255, 0.12)",
        },
      }),
    },
  },
  // Glassmorphism cards with purple borders and hover lift effect.
  MuiCard: {
    styleOverrides: {
      root: {
        backdropFilter: "blur(12px)",
        border: "1px solid",
        borderColor: "rgba(136, 51, 255, 0.25)",
        borderRadius: 16,
        transition: "all 0.3s ease",
        "&:hover": {
          borderColor: "rgba(136, 51, 255, 0.5)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
          transform: "translateY(-2px)",
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        "& .MuiOutlinedInput-root": {
          borderRadius: 12,
          "& fieldset": { borderColor: "rgba(136, 51, 255, 0.35)" },
          "&:hover fieldset": { borderColor: "rgba(136, 51, 255, 0.65)" },
          "&.Mui-focused fieldset": { borderColor: "#8833FF", borderWidth: 2 },
        },
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(136, 51, 255, 0.2)",
      },
    },
  },
  // Prevent MUI Paper from defaulting to a gradient background.
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
      },
    },
  },
  // Slightly bolder chip labels for better readability.
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 600,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        fontWeight: 600,
        "&.Mui-selected": {
          color: "#FFB300",
        },
      },
      indicator: {
        backgroundColor: "#FFB300",
      },
    },
  },
  MuiSlider: {
    styleOverrides: {
      thumb: {
        color: "#8833FF",
      },
      track: {
        background: "linear-gradient(90deg, #8833FF, #FFB300)",
      },
      rail: {
        opacity: 0.3,
        backgroundColor: "rgba(136, 51, 255, 0.2)",
      },
    },
  },
};

export function getTheme(mode) {
  const colors = mode === "light" ? lightTheme : darkTheme;
  let theme = createTheme({
    palette: colors.palette,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
      h1: { fontWeight: 800, letterSpacing: "-0.02em" },
      h2: { fontWeight: 700, letterSpacing: "-0.01em" },
      h3: { fontWeight: 700 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      ...sharedComponents,
      MuiAppBar: {
        styleOverrides: {
          root: {
            ...sharedComponents.MuiAppBar.styleOverrides.root,
            backgroundColor: mode === "light"
              ? "rgba(245, 243, 255, 0.9)"
              : "rgba(13, 11, 30, 0.85)",
          },
        },
      },
    },
  });
  theme = responsiveFontSizes(theme, { factor: 3 });
  return theme;
}
