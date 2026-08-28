import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Button,
  Typography,
  Alert,
  Stack,
  Box,
  Tabs,
  Tab,
  Paper,
  Chip,
  LinearProgress,
  CircularProgress,
  Collapse,
  IconButton,
  Fab,
  Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
  } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import BarChartIcon from "@mui/icons-material/BarChart";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import api from "../api/axiosInstance";
import ModelRecommendation from "../components/ModelRecommendation";
import DataExplorer from "../components/DataExplorer";
import { StaggerContainer, StaggerItem } from "../components/AnimatedContainer";

// Human-readable labels for each model key.
const MODEL_DISPLAY = {
  hybrid: "Hybrid RF",
  rf: "RF",
  logistic: "Logistic Regression",
};

const models = [
  { label: "Hybrid Random Forest", value: "hybrid", tags: ["Most Accurate", "Deep Analysis"], strength: "Accuracy", color: "secondary" },
  { label: "Logistic Regression", value: "logistic", tags: ["Fast", "Efficient"], strength: "Speed", color: "success" },
  { label: "Random Forest", value: "rf", tags: ["Balanced", "High AUC"], strength: "Balance", color: "info" },
];



// Colour the threshold slider green / amber / red depending on the value.
const sliderColorSx = (t) => ({
  "& .MuiSlider-track": {
    background: t <= 0.3
      ? "linear-gradient(90deg, #69F0AE, #FFD740)"
      : t <= 0.7
      ? "linear-gradient(90deg, #FFD740, #FF9100)"
      : "linear-gradient(90deg, #FF9100, #FF5252)",
  },
  "& .MuiSlider-thumb": {
    bgcolor: t <= 0.3 ? "#69F0AE" : t <= 0.7 ? "#FFD740" : "#FF5252",
  },
});

// Parse CSV text and extract rows from a given column, handling quoted fields.
function parseCSVRows(csvText, textCol) {
  if (!csvText) return [];
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const colIdx = headers.indexOf(textCol);
  if (colIdx === -1) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = [];
    let cur = "", inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    const v = vals[colIdx] ?? "";
    if (v.trim()) rows.push(v.trim());
  }
  return rows;
}

// Guess which CSV column holds the text — checks known keywords first, then picks the longest-average column.
function detectTextColumn(csvText, csvColumns) {
  const keywords = ["text", "content", "statement", "tweet", "message",
    "headline", "article", "review", "comment", "post", "caption"];
  const keywordMatch = csvColumns.find((col) =>
    keywords.includes(col.toLowerCase().trim())
  );
  if (keywordMatch) return keywordMatch;

  const lines = csvText.split("\n").slice(1).filter(l => l.trim());
  if (lines.length === 0) return csvColumns[0] || "";

  let bestCol = csvColumns[0] || "", bestAvg = 0;
  for (let ci = 0; ci < csvColumns.length; ci++) {
    let total = 0, count = 0;
    for (const line of lines) {
      const vals = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; continue; }
        cur += ch;
      }
      vals.push(cur.trim());
      const v = vals[ci] ?? "";
      if (v.trim()) { total += v.length; count++; }
    }
    const avg = count > 0 ? total / count : 0;
    if (avg > bestAvg) { bestAvg = avg; bestCol = csvColumns[ci]; }
  }
  return bestCol;
}

// Live elapsed-time counter shown inside buttons during predictions.
function TimerDisplay() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - start), 200);
    return () => clearInterval(id);
  }, []);
  return <span>{(elapsed / 1000).toFixed(1)}s</span>;
}

// Main Predict page — handles single text, URL, and batch CSV prediction workflows.
export default function PredictPage() {
  const navigate = useNavigate();
  const actionsRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [text, setText] = useState("");
  const [model, setModel] = useState("hybrid");
  const [threshold, setThreshold] = useState(0.5);
  const [thresholdInput, setThresholdInput] = useState(() => threshold.toFixed(2));
  useEffect(() => { setThresholdInput(threshold.toFixed(2)); }, [threshold]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [urlText, setUrlText] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [files, setFiles] = useState([]);
  const [fileData, setFileData] = useState({});
  const [isMerged, setMerged] = useState(true);
  const [activeFileName, setActiveFileName] = useState(null);
  const [csvColumns, setCsvColumns] = useState([]);
  const [textColumn, setTextColumn] = useState("");
  const [csvText, setCsvText] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [rowStatuses, setRowStatuses] = useState([]);
  const [explain, setExplain] = useState(true);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("prediction_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Poll the backend health endpoint until models finish loading — shows a spinner during cold start.
  const [modelsReady, setModelsReady] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const MAX_RETRIES = 10;
    const check = async () => {
      try {
        const resp = await fetch("http://localhost:8000/api/health", { method: "GET", signal: AbortSignal.timeout(5000) });
        if (!cancelled && resp.ok) setModelsReady(true);
      } catch {
        if (!cancelled) {
          retries++;
          if (retries >= MAX_RETRIES) {
            setModelsReady(true);
          } else {
            setModelsReady(false);
          }
        }
      }
    };
    check();
    const id = setInterval(() => { if (!cancelled && modelsReady === false) check(); }, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, [modelsReady]);

  const fileInputRef = useRef(null);
  const singleFileInputRef = useRef(null);
  const [dataExplorerOpen, setDataExplorerOpen] = useState(false);
  // Remember recently uploaded CSVs in session storage so users can re-select them quickly.
  const [recentUploads, setRecentUploads] = useState(() => {
    try {
      const saved = sessionStorage.getItem("recent_csv_uploads");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist prediction history to localStorage every time it changes.
  useEffect(() => {
    localStorage.setItem("prediction_history", JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("prediction-history-changed"));
  }, [history]);

  // Switch between Single Text, URL, and Batch CSV tabs.
  const handleTabChange = (_, newValue) => {
    setTab(newValue);
    setError("");
  };

  // Send a single text to the backend for prediction, then navigate to the result page.
  const handlePredict = async () => {
    setError("");
    if (text.length < 10) {
      setError("Text must be at least 10 characters.");
      return;
    }
    setLoading(true);
    const startTime = performance.now();
    try {
      const { data } = await api.post(`/predict?explain=${explain}`, { text, model, threshold });
      const elapsedMs = Math.round(performance.now() - startTime);
      const entry = { type: "single", text, model, threshold, ...data, timestamp: Date.now(), processing_time_ms: elapsedMs };
      if (data.label !== "error") {
        setHistory((prev) => [entry, ...prev]);
      }
      setModelsReady(true);
      navigate("/result", { state: { type: "single", ...entry, model_used: data.model_used } });
    } catch (err) {
      const body = err.response?.data;
      let msg;
      if (body) {
        if (Array.isArray(body.detail)) {
          msg = body.detail.map((e) => e.msg).join("; ");
        } else if (typeof body.detail === "string") {
          msg = body.detail;
        } else if (body.message) {
          msg = body.message;
        } else {
          try { msg = JSON.stringify(body); } catch { msg = String(body); }
        }
      } else {
        msg = err.message || "Prediction failed.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Ctrl+Enter shortcut to trigger prediction without reaching for the button.
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handlePredict();
    }
  };

  // Fetch content from a URL, analyse it through the selected model, and go to results.
  const handleUrlPredict = async () => {
    setUrlError("");
    const url = urlText.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setUrlError("URL must start with http:// or https://");
      return;
    }
    setUrlLoading(true);
    const startTime = performance.now();
    try {
      const { data } = await api.post("/analyze-url", { url, model, threshold });
      const elapsedMs = Math.round(performance.now() - startTime);
      const entry = { type: "single", text: `[URL] ${url}`, model, threshold, ...data, timestamp: Date.now(), processing_time_ms: elapsedMs };
      if (data.label !== "error") {
        setHistory((prev) => [entry, ...prev]);
      }
      setModelsReady(true);
      navigate("/result", { state: { type: "single", text: url, ...entry, model_used: data.model_used, fetchedText: data.fetched_text, sourceUrl: url } });
    } catch (err) {
      const body = err.response?.data;
      setUrlError(body?.detail || err.message || "Analysis failed.");
    } finally {
      setUrlLoading(false);
    }
  };

  // Load a .txt or .csv file's content into the text input.
  const handleSingleFileUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(ev.target.result);
      setTimeout(() => actionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    };
    reader.readAsText(f);
  };

  // When multiple CSVs are uploaded, merge them if columns match, or let the user pick which to use.
  const reconcileFiles = useCallback((fd) => {
    const names = Object.keys(fd);
    if (names.length === 0) {
      setCsvText("");
      setCsvColumns([]);
      setTextColumn("");
      setActiveFileName(null);
      setMerged(true);
      return;
    }
    if (names.length === 1) {
      const entry = fd[names[0]];
      setCsvText(entry.csvText);
      setCsvColumns(entry.csvColumns);
      setTextColumn(detectTextColumn(entry.csvText, entry.csvColumns));
      setActiveFileName(names[0]);
      setMerged(true);
      return;
    }
    const firstCols = JSON.stringify(fd[names[0]].csvColumns);
    const allMatch = names.every((n) => JSON.stringify(fd[n].csvColumns) === firstCols);
    if (allMatch) {
      const headerLine = fd[names[0]].csvText.split("\n")[0];
      const dataRows = names.map((n) => {
        const lines = fd[n].csvText.split("\n");
        return lines.slice(1).join("\n");
      }).filter(Boolean).join("\n");
      const merged = headerLine + "\n" + dataRows;
      setCsvText(merged);
      setCsvColumns(fd[names[0]].csvColumns);
      setTextColumn(detectTextColumn(merged, fd[names[0]].csvColumns));
      setMerged(true);
      setActiveFileName(names[0]);
    } else {
      const first = names[0];
      setCsvText(fd[first].csvText);
      setCsvColumns(fd[first].csvColumns);
      setTextColumn(detectTextColumn(fd[first].csvText, fd[first].csvColumns));
      setMerged(false);
      setActiveFileName(first);
    }
  }, []);

  // Handle CSV file selection — parse headers, detect text column, and store for batch processing.
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    setFiles((prev) => [...prev, ...newFiles]);
    const reads = newFiles.map((f) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const fullText = ev.target.result;
          const headerLine = fullText.split("\n")[0];
          const cols = headerLine ? headerLine.split(",").map((c) => c.trim().replace(/^"|"$/g, "")) : [];
          resolve({ name: f.name, csvText: fullText, csvColumns: cols });
        };
        reader.readAsText(f);
      });
    });
    Promise.all(reads).then((results) => {
      setFileData((prev) => {
        const next = { ...prev };
        results.forEach((r) => { next[r.name] = { csvText: r.csvText, csvColumns: r.csvColumns }; });
        reconcileFiles(next);
        return next;
      });
    });
    const firstFile = newFiles[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const fullText = ev.target.result;
      const headerLine = fullText.split("\n")[0];
      const cols = headerLine ? headerLine.split(",").map((c) => c.trim().replace(/^"|"$/g, "")) : [];
      const upload = { name: firstFile.name, csvText: fullText, csvColumns: cols, textColumn: detectTextColumn(fullText, cols), timestamp: Date.now() };
      setRecentUploads((prev) => {
        const next = [upload, ...prev.filter((u) => u.name !== upload.name)].slice(0, 5);
        sessionStorage.setItem("recent_csv_uploads", JSON.stringify(next));
        return next;
      });
    };
    reader.readAsText(firstFile);
  };

  // Restore a previously uploaded CSV from session storage without re-picking the file.
  const handleRestoreUpload = (upload) => {
    setFiles((prev) => {
      if (prev.length > 0) return prev;
      setFileData({ [upload.name]: { csvText: upload.csvText, csvColumns: upload.csvColumns || [] } });
      setCsvText(upload.csvText);
      setCsvColumns(upload.csvColumns || []);
      setTextColumn(upload.textColumn || "");
      setActiveFileName(upload.name);
      setMerged(true);
      return [new File([upload.csvText], upload.name)];
    });
  };

  // Remove a file from the batch list and clean up its parsed data.
  const handleRemoveFile = (idx) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next;
    });
    const removedName = files[idx]?.name;
    if (removedName) {
      setFileData((prev) => {
        const next = { ...prev };
        delete next[removedName];
        reconcileFiles(next);
        return next;
      });
    }
  };

  // Run predictions on every row in the uploaded CSV, with concurrency control and live status updates.
  const handleBatchPredict = async () => {
    if (files.length === 0) return;
    setBatchError("");
    const rows = parseCSVRows(csvText, textColumn);
    if (rows.length === 0) {
      setBatchError("No text data found in the selected column. Make sure you've selected the correct column.");
      return;
    }
    const initialStatuses = rows.map((text, i) => ({ index: i, text, preview: text.slice(0, 80), status: "pending" }));
    setRowStatuses(initialStatuses);
    setBatchProgress({ current: 0, total: rows.length });
    setBatchLoading(true);
    const startTime = performance.now();
    const CONCURRENCY = 5;
    const allResults = [];
    try {
      const chunks = [];
      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        chunks.push(rows.slice(i, i + CONCURRENCY).map((text, j) => ({ index: i + j, text })));
      }
      for (const chunk of chunks) {
        const statusUpdates = {};
        const results = await Promise.all(chunk.map(async (row) => {
          const rowStart = performance.now();
          statusUpdates[row.index] = { status: "processing" };
          try {
            const { data } = await api.post(`/predict?explain=${explain}`, { text: row.text, model, threshold });
            const elapsed = Math.round(performance.now() - rowStart);
            if (data.label === "error") {
              statusUpdates[row.index] = { status: "error", prediction: data.label };
              return { 
                index: row.index, 
                text: row.text, 
                label: "error", 
                confidence: 0, 
                processing_time_ms: elapsed,
                reason: data.reason || "Prediction failed",
                word_contributions: [],
                category_hints: [],
                meta_indicators: []
              };
            }
            statusUpdates[row.index] = { status: "done", prediction: data.label };
            return { 
              index: row.index, 
              text: row.text, 
              label: data.label, 
              confidence: data.confidence, 
              processing_time_ms: elapsed,
              word_contributions: data.word_contributions || [],
              category_hints: data.category_hints || [],
              meta_indicators: data.meta_indicators || []
            };
          } catch {
            const elapsed = Math.round(performance.now() - rowStart);
            statusUpdates[row.index] = { status: "error" };
            return { index: row.index, text: row.text, label: "error", confidence: 0, processing_time_ms: elapsed, reason: "Prediction failed" };
          }
        }));
        
        // Apply all status updates at once
        setRowStatuses((prev) => prev.map((r) => {
          const update = statusUpdates[r.index];
          return update ? { ...r, ...update } : r;
        }));
        
        // Add results
        results.forEach((r) => {
          allResults[r.index] = r;
        });
        
        // Update progress
        setBatchProgress((prev) => ({ ...prev, current: prev.current + chunk.length }));
      }
      const batchResults = allResults.filter(Boolean);
      const validResults = batchResults.filter(r => r.label === "real" || r.label === "fake");
      const batchTotalRows = batchResults.length;
      const batchRealCount = validResults.filter(r => r.label === "real").length;
      const batchFakeCount = validResults.filter(r => r.label === "fake").length;
      const summary = {
        type: "batch", timestamp: Date.now(), model, threshold,
        total_rows: batchTotalRows,
        real_count: batchRealCount,
        fake_count: batchFakeCount,
        error_count: batchResults.length - validResults.length,
        column_count: csvColumns.length,
        results: validResults.slice(0, 50),
      };
      if (validResults.length > 0) {
        setHistory((prev) => [summary, ...prev]);
      }
      const batchResult = {
        total_rows: batchTotalRows,
        results: batchResults,
        model_used: models.find((m) => m.value === model)?.label,
        threshold,
        text_column_used: textColumn,
        processing_time_ms: Math.round(performance.now() - startTime),
      };
      setModelsReady(true);
      if ("Notification" in window && Notification.permission === "granted") {
        const realPct = batchTotalRows ? ((batchRealCount / batchTotalRows) * 100).toFixed(0) : 0;
        new Notification("Batch Prediction Complete", {
          body: `${batchTotalRows} rows processed — ${batchRealCount} real (${realPct}%), ${batchFakeCount} fake`,
          icon: "/favicon.ico",
        });
      } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
      navigate("/result", { state: { type: "batch", batchResult, model, threshold } });
    } catch (err) {
      const body = err.response?.data;
      let msg;
      if (body) {
        if (Array.isArray(body.detail)) {
          msg = body.detail.map((e) => e.msg).join("; ");
        } else if (typeof body.detail === "string") {
          msg = body.detail;
        } else if (body.message) {
          msg = body.message;
        } else {
          try { msg = JSON.stringify(body); } catch { msg = String(body); }
        }
      } else {
        msg = err.message || "Batch prediction failed.";
      }
      setBatchError(msg);
    } finally {
      setBatchLoading(false);
    }
  };

  // Aggregate history stats — total entries, rows, real/fake counts — for the summary cards below.
  const totalEntries = history.length;
  const totalRows = history.reduce((sum, item) => sum + (item.results?.length || item.total_rows || 1), 0);
  const realCount = history.reduce((sum, item) => {
    if (item.type === "batch") return sum + (item.results || []).filter((r) => r.label === "real").length;
    return sum + (item.label === "real" ? 1 : 0);
  }, 0);
  const fakeCount = history.reduce((sum, item) => {
    if (item.type === "batch") return sum + (item.results || []).filter((r) => r.label === "fake").length;
    return sum + (item.label === "fake" ? 1 : 0);
  }, 0);
  const realPct = totalRows ? ((realCount / totalRows) * 100).toFixed(0) : 0;
  const fakePct = totalRows ? ((fakeCount / totalRows) * 100).toFixed(0) : 0;

  // True when the active tab has valid input and nothing is loading — used to glow the Configure Model button.
  const canPredict =
    (tab === 0 && text.trim().length > 0 && !loading) ||
    (tab === 1 && urlText.trim().length > 0 && !urlLoading) ||
    (tab === 2 && files.length > 0 && !batchLoading);

  return (
    <Box>
      <Stack spacing={3}>
        {/* Show a loading banner while the backend models are still warming up. */}
        {modelsReady === false && (
          <Alert severity="info" icon={<CircularProgress size={16} />}>
            Backend models are loading&hellip; This may take a moment on first launch.
          </Alert>
        )}
        <Typography variant="h3" sx={{
            background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
            mb: 1,
          }}>
            Misinformation Detector
        </Typography>

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {/* Three input modes: single text, URL scraping, or batch CSV upload. */}
            <Box sx={{ display: "flex", alignItems: { xs: "stretch", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: { xs: 1, sm: 0 }, justifyContent: { xs: "flex-start", sm: "space-between" } }}>
              <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                <Tab label="Single Text" />
                <Tab label="URL" />
                <Tab label="Batch CSV" />
              </Tabs>
              <Button
                variant="outlined"
                size="small"
                onClick={() => document.getElementById("model-section")?.scrollIntoView({ behavior: "smooth" })}
                sx={(theme) => ({
                  flexShrink: 0, ml: { xs: 0, sm: 1 }, alignSelf: { xs: "flex-end", sm: "auto" },
                  ...(canPredict && {
                    animation: "glowPulse 2s ease-in-out infinite",
                    "@keyframes glowPulse": {
                      "0%, 100%": {
                        boxShadow: `0 0 5px ${theme.palette.primary.main}44`,
                        borderColor: `${theme.palette.primary.main}44`,
                      },
                      "50%": {
                        boxShadow: `0 0 20px ${theme.palette.primary.main}bb`,
                        borderColor: theme.palette.primary.main,
                      },
                    },
                    "&:hover": { animation: "none" },
                  }),
                })}
              >
                Configure Model Settings
              </Button>
            </Box>

            {/* Tab 0 — type or paste text, see character count, optionally upload a file. */}
            {tab === 0 && (
              <>
                <input
                  type="file"
                  accept=".txt,.csv"
                  hidden
                  ref={singleFileInputRef}
                  onChange={handleSingleFileUpload}
                />

                <Typography variant="body1" sx={{ fontWeight: 500, color: "text.secondary" }}>
                  Enter text to analyze &middot; {text.length} chars
                </Typography>

                <Paper variant="outlined" sx={{ display: "flex", flexDirection: "column", maxHeight: 800, minHeight: 400 }}>
                  <TextField
                    multiline
                    fullWidth
                    variant="outlined"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      "& .MuiOutlinedInput-notchedOutline": { border: 0 },
                      "& .MuiOutlinedInput-root": {
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      },
                      "& .MuiOutlinedInput-input": {
                        flex: 1,
                        overflow: "auto !important",
                      },
                    }}
                  />
                </Paper>

                <Box
                  ref={actionsRef}
                  sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}
                >
                  <Button variant="outlined" size="small" startIcon={<UploadFileIcon />} onClick={() => singleFileInputRef.current?.click()}>
                    Upload File
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => setText("")} disabled={!text}>
                    Clear
                  </Button>
                </Box>
              </>
            )}

            {/* Tab 1 — enter a URL; the backend fetches the page and analyses the content. */}
            {tab === 1 && (
              <>
                <Typography variant="body1" sx={{ fontWeight: 500, color: "text.secondary" }}>
                  Analyze a URL
                </Typography>
                <TextField
                  fullWidth
                  placeholder="https://example.com/article"
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleUrlPredict(); }}
                  variant="outlined"
                  size="small"
                />
                <Typography variant="caption" color="text.disabled">
                  The app will fetch the page content and run it through the selected model. Press Ctrl+Enter to submit.
                </Typography>
              </>
            )}

            {/* Tab 2 — upload one or more CSV files, auto-detect the text column, run batch predictions. */}
            {tab === 2 && (
              <>
                <input
                  type="file"
                  accept=".csv"
                  multiple
                  hidden
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />

                {/* Show recently uploaded CSV files so users can re-select without browsing again. */}
                {recentUploads.length > 0 && files.length === 0 && (
                  <Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                      Recent Uploads (this session)
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                      {recentUploads.map((u, i) => (
                        <Chip
                          key={i}
                          label={u.name}
                          size="small"
                          variant="outlined"
                          icon={<CloudUploadIcon sx={{ fontSize: 14 }} />}
                          onClick={() => handleRestoreUpload(u)}
                          sx={{ cursor: "pointer" }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}

                <Paper
                  variant="outlined"
                  sx={{
                    border: "2px dashed",
                    borderColor: files.length > 0 ? "primary.main" : "divider",
                    py: files.length > 0 ? 2 : 6,
                    px: 2,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color 0.2s",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {files.length === 0 ? (
                    <Stack spacing={1} sx={{ alignItems: "center" }}>
                      <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary" }} />
                      <Typography variant="body1" color="text.secondary">
                        Drag & drop or click to upload CSV files
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        Accepts .csv files only &mdash; select multiple at once
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack spacing={1} sx={{ alignItems: "flex-start", width: "100%" }}>
                      {files.map((f, i) => {
                        const fd = fileData[f.name];
                        const colCount = fd?.csvColumns?.length ?? 0;
                        const isActive = activeFileName === f.name;
                        const fileColMatch = Object.keys(fileData).length > 1 && !isMerged && isActive;
                        return (
                        <Box key={i} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                          <CloudUploadIcon sx={{ fontSize: 18, color: "primary.main" }} />
                          <Typography
                            variant="body2"
                            fontWeight={500}
                            onClick={!isMerged ? () => {
                              const entry = fileData[f.name];
                              if (entry) { setCsvText(entry.csvText); setCsvColumns(entry.csvColumns); setTextColumn(detectTextColumn(entry.csvText, entry.csvColumns)); setActiveFileName(f.name); }
                            } : undefined}
                            sx={{ cursor: !isMerged ? "pointer" : "default", textDecoration: !isMerged && isActive ? "underline" : "none" }}
                          >{f.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            ({(f.size / 1024).toFixed(1)} KB &middot; {colCount} cols{isMerged && Object.keys(fileData).length > 1 ? " ✓" : !isMerged && fileColMatch ? " ⚠" : ""})
                          </Typography>
                          {!isMerged && isActive && (
                            <Chip label="Active" size="small" color="primary" sx={{ height: 20, "& .MuiChip-label": { fontSize: 10, px: 0.6 } }} />
                          )}
                          <Chip
                            label="Remove"
                            color="error"
                            size="small"
                            sx={{ ml: 0.5, height: 22, "& .MuiChip-label": { fontSize: 11, px: 0.8 } }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(i);
                            }}
                          />
                        </Box>
                      );})}
                      <Chip
                        label="+ Add more"
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      />
                    </Stack>
                  )}
                </Paper>

                {Object.keys(fileData).length > 1 && (
                  <Alert severity={isMerged ? "success" : "warning"} sx={{ py: 0.5, "& .MuiAlert-message": { fontSize: 13 } }}>
                    {isMerged
                      ? `All ${Object.keys(fileData).length} files have matching columns — merged into one batch (${csvText.split("\n").slice(1).filter(Boolean).length} rows).`
                      : `Files have different columns. Click a filename above to select which file to predict.`}
                  </Alert>
                )}

                {csvColumns.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel id="text-column-label">Text Column</InputLabel>
                    <Select
                      labelId="text-column-label"
                      value={textColumn}
                      label="Text Column"
                      onChange={(e) => setTextColumn(e.target.value)}
                    >
                      {csvColumns.map((col) => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      Which column contains the text to analyse?
                    </Typography>
                  </FormControl>
                )}

                {/* DataExplorer collapsible section — peek at distributions and stats before running predictions. */}
                {csvText && (
                  <Paper variant="outlined" sx={{ p: 2.5 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", mb: 1 }}
                      onClick={() => setDataExplorerOpen(!dataExplorerOpen)}
                    >
                      <Typography variant="subtitle1" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <BarChartIcon fontSize="small" />
                        Data Exploration
                      </Typography>
                      <IconButton size="small">
                        {dataExplorerOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                    {!dataExplorerOpen && (
                      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic", textAlign: "center", display: "block", pb: 0.5 }}>
                        Click to expand and explore your data
                      </Typography>
                    )}
                    <Collapse in={dataExplorerOpen}>
                      <DataExplorer csvText={csvText} textColumn={textColumn} />
                    </Collapse>
                  </Paper>
                )}
              </>
            )}
          </Stack>
        </Paper>

        {/* Model recommendation panel — compares three models and lets you toggle word-level explanation. */}
        <Box id="model-section">
          <ModelRecommendation
            models={models}
            currentModel={model}
            onSelectModel={setModel}
            explain={explain}
            onToggleExplain={setExplain}
          />
        </Box>

        {/* Confidence threshold slider — higher = fewer false positives, lower = catches more potential fakes. */}
        <Box>
          <Typography gutterBottom>
            Confidence Threshold
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Slider
              value={threshold}
              onChange={(_, v) => { setThreshold(v); setThresholdInput(v.toFixed(2)); }}
              min={0}
              max={1}
              step={0.01}
              sx={{ flex: 1, ...sliderColorSx(threshold) }}
            />
             <TextField
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              onBlur={() => {
                const v = parseFloat(thresholdInput);
                if (!isNaN(v) && v >= 0 && v <= 1) {
                  setThreshold(v);
                  setThresholdInput(v.toFixed(2));
                } else {
                  setThresholdInput(threshold.toFixed(2));
                }
              }}
              type="number"
              slotProps={{ htmlInput: { min: 0, max: 1, step: 0.01 } }}
              sx={(theme) => ({
                width: 80,
                "& .MuiOutlinedInput-root": { backgroundColor: "transparent" },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.23)" : "rgba(0,0,0,0.23)",
                },
                "& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button": {
                  WebkitAppearance: "auto",
                  opacity: 1,
                  filter: theme.palette.mode === "dark" ? "invert(0.85)" : "none",
                },
              })}
              size="small"
            />
          </Box>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block", lineHeight: 1.4 }}>
            Higher = stricter (fewer flagged as fake, reduces false positives).<br />
            Lower = more sensitive (caters more potential fakes, may increase false alarms).
          </Typography>
        </Box>



        {/* One button to rule them all — dispatches to the right handler based on the active tab. */}
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            if (tab === 0) handlePredict();
            else if (tab === 1) handleUrlPredict();
            else if (tab === 2) handleBatchPredict();
          }}
          disabled={
            (tab === 0 && loading) ||
            (tab === 1 && (!urlText.trim() || urlLoading)) ||
            (tab === 2 && (files.length === 0 || batchLoading))
          }
          fullWidth
          startIcon={
            (tab === 0 && loading) || (tab === 2 && batchLoading)
              ? <CircularProgress size={20} color="inherit" />
              : tab === 1 && urlLoading
              ? <CircularProgress size={16} />
              : null
          }
        >
          {tab === 0
            ? loading ? `Predicting\u2026 ` : "Predict"
            : tab === 1
            ? urlLoading ? "Analyzing..." : "Analyze URL"
            : batchLoading ? `Predicting\u2026 ` : "Predict Batch"}
          {(tab === 0 && loading) || (tab === 2 && batchLoading) ? <TimerDisplay /> : null}
        </Button>

        {tab === 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: "right" }}>
            Ctrl+Enter to predict
          </Typography>
        )}

        {/* Live batch progress — a progress bar and a scrollable log showing each row's status. */}
        {tab === 2 && batchLoading && (
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Predicting row {batchProgress.current} of {batchProgress.total}
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {batchProgress.total > 0
                  ? `(${Math.round((batchProgress.current / batchProgress.total) * 100)}%)`
                  : ""}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}
            />
            <Typography variant="caption" color="text.disabled">
              <TimerDisplay /> elapsed
            </Typography>
            <Box sx={{ maxHeight: 850, overflowY: "auto", border: 1, borderColor: "divider", borderRadius: 2, p: 1 }}>
              <Stack spacing={0.5}>
                {rowStatuses.slice(0, 100).map((row) => (
                  <Box key={row.index} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.3 }}>
                    <Box sx={{ width: 20, textAlign: "center", flexShrink: 0 }}>
                      {row.status === "pending" && <HourglassEmptyIcon sx={{ fontSize: 16, color: "text.disabled" }} />}
                      {row.status === "processing" && <CircularProgress size={14} />}
                      {row.status === "done" && <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />}
                      {row.status === "error" && <CancelIcon sx={{ fontSize: 16, color: "error.main" }} />}
                    </Box>
                    <Typography variant="caption" color="text.disabled" sx={{ minWidth: 28, flexShrink: 0 }}>
                      #{row.index + 1}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: row.status === "done" ? "text.primary" : row.status === "error" ? "error.main" : "text.secondary",
                      }}
                    >
                      {row.status === "done" && row.prediction ? (
                        <>
                          <Typography
                            component="span"
                            variant="caption"
                            fontWeight={700}
                            color={row.prediction === "real" ? "success.main" : "error.main"}
                            sx={{ mr: 1, textTransform: "uppercase" }}
                          >
                            {row.prediction}
                          </Typography>
                          {row.preview}
                        </>
                      ) : (
                        row.preview
                      )}
                    </Typography>
                  </Box>
                ))}
                {rowStatuses.length > 100 && (
                  <Typography variant="caption" color="text.disabled" sx={{ textAlign: "center", py: 1 }}>
                    + {rowStatuses.length - 100} more rows
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* Inline error alerts for each tab — dismissible so they don't block the UI. */}
        {tab === 0 && error && (
          <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
        )}
        {tab === 1 && urlError && (
          <Alert severity="error" onClose={() => setUrlError("")}>{urlError}</Alert>
        )}
        {tab === 2 && batchError && (
          <Alert severity="error" onClose={() => setBatchError("")}>{batchError}</Alert>
        )}

        {/* Quick stats cards — total entries, rows analysed, and real/fake breakdown from session history. */}
        {totalEntries > 0 && (
          <StaggerContainer>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StaggerItem>
                  <Card variant="outlined" sx={{ borderColor: "#7C4DFF" }}>
                    <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "#7C4DFF" }}>{totalEntries}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Entries</Typography>
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StaggerItem>
                  <Card variant="outlined" sx={{ borderColor: "#00BFA5" }}>
                    <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "#00BFA5" }}>{totalRows}</Typography>
                      <Typography variant="caption" color="text.secondary">Total Rows</Typography>
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StaggerItem>
                  <Card variant="outlined" sx={{ borderColor: "success.main" }}>
                    <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>{realCount}</Typography>
                      <Typography variant="caption" color="text.secondary">Real ({realPct}%)</Typography>
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <StaggerItem>
                  <Card variant="outlined" sx={{ borderColor: "error.main" }}>
                    <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>{fakeCount}</Typography>
                      <Typography variant="caption" color="text.secondary">Fake ({fakePct}%)</Typography>
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Grid>
            </Grid>
          </StaggerContainer>
        )}

        {history.length > 0 && (
          <StaggerContainer>
            <StaggerItem>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" fontWeight={600} sx={{ background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      Recent Predictions
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate("/history")}
                    >
                      View Full History &rarr;
                    </Button>
                  </Box>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, overflowX: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, width: 40 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Text</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 130 }}>Label</TableCell>
                          <TableCell sx={{ fontWeight: 600, width: 120 }}>Confidence</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {history.slice(0, 5).map((item, i) => (
                          <TableRow
                            key={item.timestamp}
                            hover
                            sx={{ cursor: "pointer" }}
                            onClick={() => {
                      if (item.type === "batch") {
                        navigate("/result", {
                          state: {
                            type: "batch",
                            batchResult: {
                              results: item.results,
                              total_rows: item.total_rows,
                              model_used: MODEL_DISPLAY[item.model] || item.model,
                              threshold: item.threshold,
                              processing_time_ms: item.processing_time_ms,
                            },
                            model: item.model,
                            threshold: item.threshold,
                          },
                        });
                      } else {
                        navigate("/result", { state: item });
                      }
                    }}
                          >
                            <TableCell>{i + 1}</TableCell>
                            <TableCell sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.text || `Batch: ${item.total_rows || 0} rows`}
                            </TableCell>
                            <TableCell>
                              {item.type === "batch" ? (
                                <Box sx={{ display: "flex", gap: 0.5 }}>
                                  <Chip label={`Real: ${item.real_count || 0}`} size="small" color="success" variant="outlined" />
                                  <Chip label={`Fake: ${item.fake_count || 0}`} size="small" color="error" variant="outlined" />
                                </Box>
                              ) : (
                                <Chip
                                  label={item.label || "N/A"}
                                  size="small"
                                  color={item.label === "real" ? "success" : item.label === "fake" ? "error" : "default"}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {item.type === "batch"
                                ? `${((item.real_count || 0) / ((item.real_count || 0) + (item.fake_count || 0) || 1) * 100).toFixed(0)}% real`
                                : item.confidence != null
                                  ? `${(item.confidence * 100).toFixed(1)}%`
                                  : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </Paper>
            </StaggerItem>
          </StaggerContainer>
        )}
      </Stack>

      {text.length > 500 && (
        <Fab
          color="primary"
          size="small"
          onClick={() => document.getElementById("model-section")?.scrollIntoView({ behavior: "smooth" })}
          sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}
        >
          <KeyboardArrowDownIcon />
        </Fab>
      )}
    </Box>
  );
}

