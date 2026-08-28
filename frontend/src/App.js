import { useState, useMemo } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { getTheme } from "./theme";
import ColorModeContext from "./ColorModeContext";
import Layout from "./components/Layout";
import { PageTransition } from "./components/AnimatedContainer";
import HomePage from "./pages/HomePage";
import PredictPage from "./pages/PredictPage";
import ResultPage from "./pages/ResultPage";
import ComparisonPage from "./pages/ComparisonPage";
import ChartsPage from "./pages/ChartsPage";
import HistoryPage from "./pages/HistoryPage";
import AboutPage from "./pages/AboutPage";

// Wraps all routes with AnimatePresence so page transitions play on every navigation.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/predict" element={<PageTransition><PredictPage /></PageTransition>} />
        <Route path="/result" element={<PageTransition><ResultPage /></PageTransition>} />
        <Route path="/comparison" element={<PageTransition><ComparisonPage /></PageTransition>} />
        <Route path="/statistics" element={<PageTransition><ChartsPage /></PageTransition>} />
        <Route path="/charts" element={<PageTransition><ChartsPage /></PageTransition>} />
        <Route path="/history" element={<PageTransition><HistoryPage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

// Root component — sets up theme, routing, colour mode, and the layout wrapper.
function App() {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem("colorMode") || "dark";
    } catch {
      return "dark";
    }
  });

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === "dark" ? "light" : "dark";
          try { localStorage.setItem("colorMode", next); } catch { }
          return next;
        });
      },
    }),
    []
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Layout>
            <AnimatedRoutes />
          </Layout>
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
