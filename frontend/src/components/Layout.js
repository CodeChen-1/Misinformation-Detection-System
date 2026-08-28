import { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Collapse,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ShieldIcon from "@mui/icons-material/Shield";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import ColorModeContext from "../ColorModeContext";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Predict", path: "/predict" },
  { label: "Statistics", path: "/statistics" },
  { label: "History", path: "/history" },
  { label: "About", path: "/about" },
];

// Main shell — nav bar, mobile drawer, dark mode toggle, and a card wrapper for page content.
export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const { toggleColorMode } = useContext(ColorModeContext);
  const isDark = theme.palette.mode === "dark";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 1100 }}>
        <Collapse in={navVisible}>
          <Box>
            <AppBar
              position="static"
              elevation={0}
            sx={{
              bgcolor: isDark ? "rgba(13, 11, 30, 0.9)" : "rgba(245, 243, 255, 0.9)",
              backdropFilter: "blur(8px)",
              boxShadow: "none",
              borderBottom: "1px solid",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.12)"
                : "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Toolbar>
              {/* Hamburger menu — pops open the side drawer on mobile */}
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 1, display: { md: "none" } }}
              >
                <MenuIcon sx={{ color: isDark ? "#fff" : "#000" }} />
              </IconButton>
              <ShieldIcon sx={{ mr: 1, color: isDark ? "secondary.main" : "primary.main" }} />
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #B47CFF, #5DF2D6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  cursor: "pointer",
                  mr: 4,
                }}
                onClick={() => navigate("/")}
              >
                MisinfoDetect
              </Typography>
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, flex: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    sx={{
                      color:
                        location.pathname === item.path
                          ? "secondary.main"
                          : "text.secondary",
                      borderBottom:
                        location.pathname === item.path
                          ? "2px solid #00BFA5"
                          : "2px solid transparent",
                      transition: "border-color 0.25s ease, color 0.25s ease",
                      borderRadius: 0,
                      "&:hover": {
                        color: "secondary.light",
                        background: "transparent",
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", ml: "auto", gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", userSelect: "none" }}>
                  {isDark ? "Dark" : "Light"}
                </Typography>
                <IconButton color="inherit" onClick={toggleColorMode} sx={{ border: "2px solid", borderColor: isDark ? "rgba(255, 179, 0, 0.5)" : "rgba(136, 51, 255, 0.5)", borderRadius: 2, p: 0.5, transition: "border-color 0.2s", "&:hover": { borderColor: isDark ? "secondary.main" : "primary.main" } }}>
                  {isDark ? <LightModeIcon sx={{ color: "text.primary" }} /> : <DarkModeIcon sx={{ color: "text.primary" }} />}
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>
          {/* Collapse pill — click to hide the nav bar and reclaim screen space */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box
              onClick={() => setNavVisible(false)}
              sx={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 20,
                border: "1.5px solid",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(0, 0, 0, 0.15)",
                borderRadius: "0 0 10px 10px",
                borderTop: "none",
                bgcolor: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "rgba(0, 0, 0, 0.04)",
                "&:hover": {
                  bgcolor: isDark
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(0, 0, 0, 0.08)",
                },
                transition: "background-color 0.2s",
              }}
            >
              <ExpandLessIcon
                fontSize="small"
                sx={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)" }}
              />
            </Box>
          </Box>
        </Box>
        </Collapse>
      </Box>

      {/* Side drawer — slides in from the left on mobile, has nav items and gradient logo */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: isDark
              ? "rgba(13, 11, 30, 0.95)"
              : "rgba(245, 243, 255, 0.95)",
            backdropFilter: "blur(16px)",
            borderRight: isDark
              ? "1px solid rgba(124, 77, 255, 0.15)"
              : "1px solid rgba(124, 77, 255, 0.2)",
            width: 240,
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(135deg, #B47CFF, #5DF2D6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            MisinfoDetect
          </Typography>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    setDrawerOpen(false);
                  }}
                  selected={location.pathname === item.path}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    "&.Mui-selected": {
                      backgroundColor: "rgba(0, 191, 165, 0.15)",
                    },
                  }}
                >
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main content — wraps children in a frosted card with gradient background */}
      <Box
        component="main"
        sx={{
          flex: 1,
          background: isDark
            ? "radial-gradient(ellipse at 20% 50%, rgba(124,77,255,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(0,191,165,0.06) 0%, transparent 50%), #0D0B1E"
            : "radial-gradient(ellipse at 20% 50%, rgba(124,77,255,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(0,191,165,0.04) 0%, transparent 50%), #F5F3FF",
          py: 4,
          px: { xs: 2, sm: 4 },
          transition: "background 0.35s ease",
        }}
      >
        {/* Expand pill — when nav is hidden, this lets you pull it back down */}
        {!navVisible && (
          <Box
            onClick={() => setNavVisible(true)}
            sx={{
              position: "fixed",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1200,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 60,
              height: 24,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              bgcolor: isDark ? "rgba(20, 18, 48, 0.9)" : "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid",
              borderColor: isDark ? "rgba(124, 77, 255, 0.2)" : "rgba(124, 77, 255, 0.15)",
              borderTop: "none",
              "&:hover": {
                bgcolor: isDark ? "rgba(30, 28, 58, 0.95)" : "rgba(245, 243, 255, 0.95)",
              },
              transition: "background-color 0.2s",
            }}
          >
            <ExpandMoreIcon fontSize="small" sx={{ color: "text.secondary" }} />
          </Box>
        )}
        {location.pathname === "/" ? (
          children
        ) : (
          <Box
            sx={{
              maxWidth: 960,
              mx: "auto",
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              backdropFilter: "blur(20px)",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(136, 51, 255, 0.25)"
                : "rgba(124, 58, 237, 0.2)",
              bgcolor: isDark
                ? "rgba(20, 18, 48, 0.8)"
                : "rgba(255, 255, 255, 0.85)",
              transition: "background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
              boxShadow: isDark
                ? "0 4px 40px rgba(0, 0, 0, 0.4)"
                : "0 4px 40px rgba(124, 58, 237, 0.08)",
            }}
          >
            {children}
          </Box>
        )}
      </Box>
    </Box>
  );
}
