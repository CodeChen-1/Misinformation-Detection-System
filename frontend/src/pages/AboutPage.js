import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Avatar from "@mui/material/Avatar";
import api from "../api/axiosInstance";
import FeatureImportanceChart from "../components/FeatureImportanceChart";
import AccuracyComparisonChart from "../components/AccuracyComparisonChart";
import ROCCurveChart from "../components/ROCCurveChart";
import ClassDistributionChart from "../components/ClassDistributionChart";

// Every tool and library used across the frontend and backend, displayed as a 12-card grid.
const techStack = [
  { icon: "💻", name: "React 19", desc: "Frontend UI framework" },
  { icon: "🎭", name: "Material-UI 9", desc: "Component library & design system" },
  { icon: "📦", name: "Create React App", desc: "Build tool & dev server" },
  { icon: "✨", name: "Framer Motion", desc: "Page transitions & animations" },
  { icon: "📊", name: "D3.js 7", desc: "Interactive data visualisation" },
  { icon: "🔗", name: "Axios + React Router", desc: "HTTP client & routing" },
  { icon: "📄", name: "html2canvas + jspdf", desc: "PDF result export" },
  { icon: "🔌", name: "FastAPI", desc: "Python backend REST API" },
  { icon: "🤖", name: "scikit-learn", desc: "Machine learning models" },
  { icon: "🧪", name: "NumPy + Pandas", desc: "Data processing & analysis" },
  { icon: "🌐", name: "httpx + BeautifulSoup", desc: "URL content scraping" },
  { icon: "🚀", name: "Python 3.13 + uvicorn", desc: "Backend runtime & server" },
];

// All frontend routes with their purpose — shown in a clickable table.
const pageRoutes = [
  { route: "/", page: "Home", desc: "Browse slideshow, features overview, and model comparison cards" },
  { route: "/predict", page: "Predict", desc: "Single & batch prediction with DataExplorer, threshold slider, and live timer" },
  { route: "/result", page: "Results", desc: "View single/batch prediction results with word analysis, charts, and compare dialog" },
  { route: "/statistics", page: "Charts", desc: "Statistics dashboard with 5 D3 charts, stat cards, and export" },
  { route: "/history", page: "History", desc: "Prediction history with search, sort, date filter, bookmarks, and export" },
  { route: "/about", page: "About", desc: "This page — tech stack, dataset sources, and model performance charts" },
];

// The five datasets used to train the models — sourced from Constraint, HuggingFace, Kaggle, and LIAR.
const datasets = [
  {
    source: "Constraint English",
    description: "COVID-19 tweets labelled as real or fake. 6,400 train / 2,140 val / 2,140 test splits. (Provided by the assignment)",
  },
  {
    source: "MisInfoShort-22K",
    description: "~18,000 short messages (5–40 words) from social media and forums, filtered to a clean binary misinfo/factual split. (HuggingFace)",
  },
  {
    source: "HuggingFace Fake News",
    description: "~44,000 complete news articles across diverse topics, labels flipped to match our convention (0=real, 1=fake). (ErfanMoosaviMonazzah, HuggingFace)",
  },
  {
    source: "AG News (sampled)",
    description: "1,000 real news headlines providing a sample of normal, factual text without overwhelming the training data. (Kaggle)",
  },
  {
    source: "LIAR (all fake rows)",
    description: "~6,400 short political statements labeled 'barely-true', 'false', or 'pants-fire', all treated as fake to balance the data. (Kaggle)",
  },
];

// The four model-performance charts fetched from the backend API.
const chartConfigs = [
  {
    title: "Class Distribution",
    key: "classDistribution",
    endpoint: "/class-distribution",
    component: (data) => <ClassDistributionChart data={data} />,
  },
  {
    title: "Accuracy Comparison",
    key: "accuracy",
    endpoint: "/accuracy",
    extract: (d) => d?.results,
    component: (data) => <AccuracyComparisonChart data={data} />,
  },
  {
    title: "ROC Curves",
    key: "roc",
    endpoint: "/roc-data",
    component: (data) => <ROCCurveChart data={data} />,
  },
  {
    title: "Feature Importance (Hybrid Model)",
    key: "featureImportance",
    endpoint: "/feature-importances",
    params: { model: "hybrid" },
    extract: (d) => d?.features,
    component: (data) => <FeatureImportanceChart data={data} />,
  },
];

// About page — team members, tech stack, page routes, dataset sources, and model performance charts.
export default function AboutPage() {
  const [chartData, setChartData] = useState({});

  // Fetch all four model-performance charts from the backend on mount.
  useEffect(() => {
    async function fetchCharts() {
      const results = await Promise.allSettled(
        chartConfigs.map((c) =>
          api.get(c.endpoint, c.params ? { params: c.params } : undefined)
        )
      );
      const next = {};
      results.forEach((result, i) => {
        const key = chartConfigs[i].key;
        if (result.status === "fulfilled") {
          next[key] = { data: result.value.data, error: null };
        } else {
          next[key] = {
            data: null,
            error: result.reason?.message || "Failed to load",
          };
        }
      });
      setChartData(next);
    }
    fetchCharts();
  }, []);

  return (
    <Box>
      <Typography
        variant="h2"
        sx={{
          mb: 1,
          fontWeight: 700,
          background:
            "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        About
      </Typography>
      <Typography
        variant="body1"
        sx={{ color: "text.secondary", mb: 2, lineHeight: 1.6 }}
      >
        COS30049 Computing Technology Innovation Project · Assignment 3
        <br />
        Lecturer: Mr. Faizal Alias · Swinburne University of Technology
      </Typography>

      <Typography
        variant="body1"
        sx={{ color: "text.secondary", mb: 4, lineHeight: 1.7 }}
      >
        The Misinformation Detection App leverages ensemble machine learning to
        help users identify potentially misleading content. By combining
        multiple model architectures — Logistic Regression, Random Forest, and a
        Hybrid RF ensemble — the application provides robust predictions with
        transparent confidence scores and rich visual analytics.
      </Typography>

      {/* Contributors accordion — three team member cards with roles and responsibilities. */}
      <Paper
        sx={{
          p: 1.5,
          mb: 4,
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(124, 77, 255, 0.15)",
        }}
      >
        <Accordion
          sx={{
            background: "transparent",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>👥</span>
              <Typography variant="h5" sx={{ fontWeight: 600, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Contributors
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pb: 0 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  {/* On mobile the card stacks vertically; on sm+ it switches to side-by-side. */}
                  <CardContent sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "center", sm: "stretch" }, gap: 3, py: 2.5 }}>
                    <Box sx={{ width: { xs: "100%", sm: "25%" }, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, flexShrink: 0 }}>
                      <Avatar sx={{ bgcolor: "#FF6D00", width: 56, height: 56 }}>
                        <AccountCircleIcon sx={{ color: "#fff", fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Chen Yong Hao 106214496
                        </Typography>
                      </Box>
                      <Chip label="Backend Developer" size="small" color="warning" variant="filled" sx={{ fontWeight: 600 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, alignContent: "center", minHeight: "100%" }}>
                        <Chip label="Multi-Source Data Curation" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                        <Chip label="Data Preprocessing & Cleaning" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                        <Chip label="TF-IDF Feature Extraction" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                        <Chip label="Model Training (LR, RF, Hybrid)" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                        <Chip label="Model Performance Evaluation" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                        <Chip label="Hyperparameter Tuning" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                        <Chip label="Backend Prediction API" size="small" variant="outlined" color="warning" sx={{ fontWeight: 500 }} />
                      </Box>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "center", sm: "stretch" }, gap: 3, py: 2.5 }}>
                    <Box sx={{ width: { xs: "100%", sm: "25%" }, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, flexShrink: 0 }}>
                      <Avatar sx={{ bgcolor: "#00BFA5", width: 56, height: 56 }}>
                        <AccountCircleIcon sx={{ color: "#fff", fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Koh Boon Heok 106213833
                        </Typography>
                      </Box>
                      <Chip label="Project Manager" size="small" color="success" variant="filled" sx={{ fontWeight: 600 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, alignContent: "center", minHeight: "100%" }}>
                        <Chip label="Project Timeline & Milestones" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                        <Chip label="Assignment Report Preparation" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                        <Chip label="Progress Tracking & Monitoring" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                        <Chip label="Team Communication Management" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                        <Chip label="Documentation & Presentation" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                        <Chip label="Backend Server Deployment" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                        <Chip label="CORS & Environment Config" size="small" variant="outlined" color="success" sx={{ fontWeight: 500 }} />
                      </Box>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "center", sm: "stretch" }, gap: 3, py: 2.5 }}>
                    <Box sx={{ width: { xs: "100%", sm: "25%" }, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, flexShrink: 0 }}>
                      <Avatar sx={{ bgcolor: "#7C4DFF", width: 56, height: 56 }}>
                        <AccountCircleIcon sx={{ color: "#fff", fontSize: 32 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          Lee Ren Qi 105971567
                        </Typography>
                      </Box>
                      <Chip label="Frontend Developer" size="small" color="primary" variant="filled" sx={{ fontWeight: 600 }} />
                    </Box>
                    <Paper variant="outlined" sx={{ flex: 1, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, alignContent: "center", minHeight: "100%" }}>
                        <Chip label="UI/UX Wireframes & Prototypes" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                        <Chip label="React Component Architecture" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                        <Chip label="MUI Interface Development" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                        <Chip label="D3.js Data Visualisation" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                        <Chip label="Page Routing & Animations" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                        <Chip label="Responsive Design" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                        <Chip label="Backend URL Scraping" size="small" variant="outlined" color="primary" sx={{ fontWeight: 500 }} />
                      </Box>
                    </Paper>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Technology Stack accordion — 12-card grid showing every tool used in the project. */}
      <Paper
        sx={{
          p: 1.5,
          mb: 4,
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(124, 77, 255, 0.15)",
        }}
      >
        <Accordion
          sx={{
            background: "transparent",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>🛠️</span>
              <Typography variant="h5" sx={{ fontWeight: 600, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Technology Stack
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pb: 0 }}>
            <Grid container spacing={2}>
              {techStack.map((item) => (
                <Grid size={{ xs: 6, md: 4 }} key={item.name}>
                  <Card
                    variant="outlined"
                    sx={{
                      textAlign: "center",
                      py: 2,
                      px: 1,
                      height: "100%",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 20px rgba(124,77,255,0.15)",
                      },
                    }}
                  >
                    <Typography variant="h4" sx={{ mb: 0.5 }}>
                      {item.icon}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.desc}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Page Routes accordion — clickable table of every frontend route with its description. */}
      <Paper
        sx={{
          p: 1.5,
          mb: 4,
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(124, 77, 255, 0.15)",
        }}
      >
        <Accordion
          sx={{
            background: "transparent",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>🔌</span>
              <Typography variant="h5" sx={{ fontWeight: 600, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Page Routes
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pb: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {pageRoutes.map((row) => (
                    <TableRow
                      key={row.route}
                      sx={{ cursor: "pointer" }}
                      onClick={() => window.open(row.route, "_self")}
                    >
                      <TableCell
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: "secondary.main",
                          borderBottom: "1px solid rgba(124, 77, 255, 0.1)",
                          width: "20%",
                        }}
                      >
                        {row.route}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          borderBottom: "1px solid rgba(124, 77, 255, 0.1)",
                          width: "15%",
                        }}
                      >
                        {row.page}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          borderBottom: "1px solid rgba(124, 77, 255, 0.1)",
                        }}
                      >
                        {row.desc}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Dataset Sources accordion — table of the five datasets used for model training. */}
      <Paper
        sx={{
          p: 1.5,
          mb: 4,
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(124, 77, 255, 0.15)",
        }}
      >
        <Accordion
          sx={{
            background: "transparent",
            boxShadow: "none",
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>📚</span>
              <Typography variant="h5" sx={{ fontWeight: 600, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Dataset Sources
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pb: 0 }}>
            <TableContainer>
              <Table>
                <TableBody>
                  {datasets.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          color: "secondary.main",
                          borderBottom: "1px solid rgba(124, 77, 255, 0.15)",
                          verticalAlign: "top",
                          width: "30%",
                        }}
                      >
                        {row.source}
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          borderBottom: "1px solid rgba(124, 77, 255, 0.15)",
                        }}
                      >
                        {row.description}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      </Paper>


      {/* Model Performance section — four D3 charts fetched from the backend (accuracy, ROC, etc.). */}
      <Typography
        variant="h3"
        sx={{
          mb: 3,
          mt: 4,
          background: "linear-gradient(135deg, #B47CFF 0%, #5DF2D6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Model Performance
      </Typography>

      <Grid container spacing={3} sx={{ pb: 6 }}>
        {chartConfigs.map(({ title, key, extract, component }) => {
          const entry = chartData[key];
          const chartProps = extract ? extract(entry?.data) : entry?.data;
          return (
            <Grid size={{ xs: 12, md: 6 }} key={key}>
              <Card sx={{ height: "100%" }}>
                <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%", "&:last-child": { pb: "16px" } }}>
                   <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                     {title}
                   </Typography>
                  <Box sx={{ flex: 1, minHeight: 320 }}>
                    {!entry && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: 320,
                        }}
                      >
                        <CircularProgress />
                      </Box>
                    )}
                    {entry?.error && (
                      <Alert severity="error">{entry.error}</Alert>
                    )}
                    {chartProps && component(chartProps)}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
