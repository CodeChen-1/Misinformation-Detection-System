import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  CardActionArea,
  Chip,
  useTheme,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { StaggerContainer, StaggerItem } from "../components/AnimatedContainer";
import SecurityIcon from "@mui/icons-material/Security";
import BarChartIcon from "@mui/icons-material/BarChart";
import TuneIcon from "@mui/icons-material/Tune";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TimelineIcon from "@mui/icons-material/Timeline";
import InfoIcon from "@mui/icons-material/Info";
import GroupsIcon from "@mui/icons-material/Groups";
import ScienceIcon from "@mui/icons-material/Science";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

// Landing page — hero banner, feature carousel, and quick-action navigation cards.
export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // Glassmorphism card wrapper reused across all homepage sections.
  const glassCard = {
    maxWidth: 960,
    mx: "auto",
    mb: 6,
    p: { xs: 1.5, sm: 3 },
    borderRadius: 3,
    backdropFilter: "blur(20px)",
    border: "1px solid",
    borderColor: isDark ? "rgba(136, 51, 255, 0.25)" : "rgba(124, 58, 237, 0.2)",
    bgcolor: isDark ? "rgba(20, 18, 48, 0.8)" : "rgba(255, 255, 255, 0.85)",
    boxShadow: isDark ? "0 4px 40px rgba(0, 0, 0, 0.4)" : "0 4px 40px rgba(124, 58, 237, 0.08)",
    transition: "background-color 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
  };

  // Features highlighted in the rotating slideshow carousel below.
  const features = [
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: isDark ? "secondary.main" : "primary.main" }} />,
      title: "Real-time Detection",
      description:
        "Analyse news articles and social media posts instantly with our ensemble ML models to identify potential misinformation.",
    },
    {
      icon: <BarChartIcon sx={{ fontSize: 40, color: isDark ? "secondary.main" : "primary.main" }} />,
      title: "Interactive Charts",
      description:
        "Visualise model confidence scores, prediction breakdowns, and historical trends with D3.js-powered interactive charts.",
    },
    {
      icon: <TuneIcon sx={{ fontSize: 40, color: isDark ? "secondary.main" : "primary.main" }} />,
      title: "Model Selection",
      description:
        "Choose between Logistic Regression, Random Forest, or our Hybrid RF ensemble to compare detection approaches.",
    },
    {
      icon: <FileDownloadIcon sx={{ fontSize: 40, color: isDark ? "secondary.main" : "primary.main" }} />,
      title: "CSV Export",
      description:
        "Export your analysis results and model predictions as CSV files for further offline investigation and reporting.",
    },
  ];

  // Auto-rotate through feature cards every 4 seconds so nothing feels static.
  const [featureIndex, setFeatureIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [features.length]);

  // Navigation cards — Predict, Statistics, About, and Model Performance.
  const sections = [
    {
      icon: <ScienceIcon sx={{ fontSize: 48, color: isDark ? "#B47CFF" : "#7C3AED" }} />,
      title: "Predict",
      subtitle: "Analyse text in real time",
      description:
        "Run single texts or upload a CSV batch through our ensemble of trained ML models.",
      action: "Go to Predict",
      path: "/predict",
    },
    {
      icon: <TimelineIcon sx={{ fontSize: 48, color: isDark ? "#5DF2D6" : "#059669" }} />,
      title: "Statistics",
      subtitle: "Visualise your history",
      description:
        "Explore your personal prediction history with breakdown charts, confidence distributions, and model usage stats.",
      action: "View Statistics",
      path: "/statistics",
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 48, color: isDark ? "#FFD54F" : "#D97706" }} />,
      title: "About",
      subtitle: "Learn about the project",
      description:
        "Discover the tech stack, datasets used, and how each model compares in accuracy and performance.",
      action: "Learn More",
      path: "/about",
    },
    {
      icon: <InfoIcon sx={{ fontSize: 48, color: isDark ? "#69F0AE" : "#16A34A" }} />,
      title: "Model Performance",
      subtitle: "Compare accuracy & features",
      description:
        "View feature importance, accuracy comparisons, ROC curves, and class distributions for all trained models.",
      action: "See Performance",
      path: "/about",
    },
  ];

  return (
    <>
      {/* Hero */}
      <Box
        sx={{
          textAlign: "center",
          py: { xs: 6, md: 8 },
          px: 2,
          maxWidth: 960,
          mx: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "2.25rem", sm: "3rem", md: "4rem" },
              fontWeight: 800,
              background:
                "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Misinformation Detection
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
              maxWidth: 720,
              mx: "auto",
              mb: 3,
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Harness the power of ensemble machine learning models — Logistic
            Regression, Random Forest, and Hybrid RF — to detect and analyse
            misinformation in real time.
          </Typography>

          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/predict")}
              sx={{ px: 5, py: 1.5, fontSize: "1.1rem", mb: 4 }}
            >
              Get Started
            </Button>
          </motion.div>
        </motion.div>
      </Box>

      {/* What would you like to do? */}
      <Box sx={glassCard}>
      <Typography
        variant="h3"
        sx={{
          textAlign: "center",
          mb: 3,
          mt: 3,
          background: "linear-gradient(135deg, #B47CFF 0%, #5DF2D6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        What would you like to do?
      </Typography>

      <StaggerContainer>
        <Grid container spacing={3} sx={{ pb: 4 }}>
          {sections.map((section, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 6 }} key={index}>
              <StaggerItem>
                <Card
                  sx={{
                    height: "100%",
                    border: "1px solid rgba(124, 77, 255, 0.12)",
                    transition: "border-color 0.2s, transform 0.2s",
                    "&:hover": {
                      borderColor: "rgba(124, 77, 255, 0.4)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(section.path)}
                    sx={{ height: "100%", p: 2, display: "flex", flexDirection: "column", alignItems: "flex-start" }}
                  >
                    <Box sx={{ mb: 1.5 }}>{section.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {section.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: isDark ? "secondary.main" : "primary.main", mb: 1, fontWeight: 500 }}
                    >
                      {section.subtitle}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", lineHeight: 1.6, mb: 1.5 }}
                    >
                      {section.description}
                    </Typography>
                    <Box sx={{ mt: "auto", display: "flex", alignItems: "center", gap: 0.5, color: "primary.main", typography: "button", fontSize: "0.8125rem" }}>
                      {section.action}
                      <ArrowForwardIcon sx={{ fontSize: 16 }} />
                    </Box>
                  </CardActionArea>
                </Card>
              </StaggerItem>
            </Grid>
          ))}
        </Grid>
      </StaggerContainer>
      </Box>

      {/* Key Features */}
      <Box sx={glassCard}>
      <Typography
        variant="h3"
        sx={{
          textAlign: "center",
          mb: 3,
          mt: 4,
          background: "linear-gradient(135deg, #B47CFF 0%, #5DF2D6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Key Features
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap", mb: 3, width: "100%" }}>
        <Chip icon={<ScienceIcon />} label="3 ML Models" variant="outlined" color="primary" />
        <Chip icon={<TimelineIcon />} label="Real-time Analysis" variant="outlined" color="success" />
        <Chip icon={<BarChartIcon />} label="Interactive Charts" variant="outlined" color="secondary" />
      </Box>

      <Box sx={{ position: "relative", pb: 4, minHeight: 220 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={featureIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.35 }}
          >
            <Card sx={{ border: "1px solid rgba(124, 77, 255, 0.12)", textAlign: "center", py: 3, px: 2 }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>{features[featureIndex].icon}</Box>
                <Typography variant="h6" fontWeight={600} mb={1}>{features[featureIndex].title}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>{features[featureIndex].description}</Typography>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mt: 2 }}>
          {features.map((_, i) => (
            <Box
              key={i}
              onClick={() => setFeatureIndex(i)}
              sx={{
                width: 2,
                height: 2,
                borderRadius: "50%",
                bgcolor: i === featureIndex ? "primary.main" : "text.disabled",
                cursor: "pointer",
                transition: "background-color 0.3s",
                p: 0.3,
                boxSizing: "content-box",
              }}
            />
          ))}
        </Box>
      </Box>
      </Box>

      {/* Misinformation in the Wild */}
      <Box sx={glassCard}>
      <Typography
        variant="h3"
        sx={{
          textAlign: "center",
          mb: 3,
          mt: 4,
          background: "linear-gradient(135deg, #B47CFF 0%, #5DF2D6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Misinformation in the Wild
      </Typography>

      <Grid container spacing={3} sx={{ pb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid rgba(124, 77, 255, 0.12)",
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "rgba(124, 77, 255, 0.4)" },
            }}
          >
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>🗳️</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Deepfakes & the 2024 Election
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? "secondary.main" : "primary.main", mb: 1, display: "block", fontWeight: 500 }}>
                AI-generated content in political discourse
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                The 2024 election cycle saw a surge in AI-generated deepfake images, audio, and video used to misrepresent candidates and influence voters. Detection tools like this one are increasingly vital for verifying digital content before it spreads.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              height: "100%",
              border: "1px solid rgba(124, 77, 255, 0.12)",
              transition: "border-color 0.2s",
              "&:hover": { borderColor: "rgba(124, 77, 255, 0.4)" },
            }}
          >
            <CardContent>
              <Typography variant="h4" sx={{ mb: 1 }}>🦠</Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                The COVID-19 Infodemic
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? "secondary.main" : "primary.main", mb: 1, display: "block", fontWeight: 500 }}>
                WHO's fight against health misinformation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                During the pandemic, the WHO coined the term "infodemic" to describe the overwhelming flood of misinformation — from fake cures to conspiracy theories. Machine learning models trained on this data help identify harmful falsehoods in real time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Box>
    </>
  );
}
