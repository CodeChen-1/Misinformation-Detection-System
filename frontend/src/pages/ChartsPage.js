import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { StaggerContainer, StaggerItem } from "../components/AnimatedContainer";

import HistoryChart from "../components/HistoryChart";
import ConfidenceDistributionChart from "../components/ConfidenceDistributionChart";
import ModelUsageChart from "../components/ModelUsageChart";
import PredictionTimelineChart from "../components/PredictionTimelineChart";
import AvgTimeChart from "../components/AvgTimeChart";

// Live-updating relative timestamp — refreshes every second so it always shows "Xs ago".
function RelativeTime({ timestamp }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.floor((now - (timestamp || Date.now())) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const MIN_HISTORY = 3;

// Flatten the stored prediction history — spreads batch rows into individual entries so charts can consume them.
function loadHistory() {
  try {
    const saved = localStorage.getItem("prediction_history");
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    const singles = parsed.filter((e) => e.type === "single");
    const batched = parsed
      .filter((e) => e.type === "batch" && e.results)
      .flatMap((batch) =>
        batch.results.map((r, i) => ({
          type: "single",
          text: r.text,
          model: batch.model,
          threshold: batch.threshold,
          label: r.label,
          confidence: r.confidence,
          processing_time_ms: batch.processing_time_ms ? batch.processing_time_ms / batch.results.length : 0,
          timestamp: batch.timestamp + i,
        }))
      );
    return [...singles, ...batched].sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

// Statistics dashboard — stat cards, 5 D3 charts, and per-chart data table dialogs with CSV export.
export default function ChartsPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loadTimestamp, setLoadTimestamp] = useState(Date.now());
  const chartRefs = useRef({});
  const [dataDialogKey, setDataDialogKey] = useState(null);

  // Export a chart's SVG element as a downloadable .svg file.
  const downloadChart = useCallback((key) => {
    const container = chartRefs.current[key];
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // The five D3 charts displayed in a 2+1 grid layout.
  const chartCards = [
    { key: "prediction-breakdown", title: "Prediction Breakdown", chart: (h) => <HistoryChart history={h} /> },
    { key: "confidence-distribution", title: "Confidence Distribution", chart: (h) => <ConfidenceDistributionChart history={h} /> },
    { key: "model-usage", title: "Model Usage Breakdown", chart: (h) => <ModelUsageChart history={h} /> },
    { key: "avg-time", title: "Average Prediction Time", chart: (h) => <AvgTimeChart history={h} /> },
    { key: "prediction-timeline", title: "Prediction Timeline", chart: (h) => <PredictionTimelineChart history={h} /> },
  ];

  // Reload history from localStorage whenever it changes (cross-tab or in-page).
  useEffect(() => {
    setHistory(loadHistory());
    const handler = () => setHistory(loadHistory());
    window.addEventListener("storage", handler);
    window.addEventListener("prediction-history-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("prediction-history-changed", handler);
    };
  }, []);

  // Compute summary stats from the filtered history — totals, real/fake counts, average confidence, unique models used.
  const filteredHistory = history.filter((e) => e.label === "real" || e.label === "fake");
  const realCount = filteredHistory.filter((e) => e.label === "real").length;
  const fakeCount = filteredHistory.filter((e) => e.label === "fake").length;
  const totalCount = filteredHistory.length;
  const realPct = totalCount ? ((realCount / totalCount) * 100).toFixed(0) : 0;
  const fakePct = totalCount ? ((fakeCount / totalCount) * 100).toFixed(0) : 0;

  // Count total rows across all history (including batch rows)
  const historyTotalRows = filteredHistory.reduce((sum, e) => sum + (e.total_rows || 1), 0);
  const avgConfidence = totalCount > 0
    ? filteredHistory.reduce((sum, e) => sum + (e.confidence || 0), 0) / totalCount
    : 0;
  const modelCount = new Set(history.map((e) => e.model).filter(Boolean)).size;

  const downloadTableData = useCallback(() => {
    const key = dataDialogKey;
    if (!key) return;
    let rows = [];
    let headers = [];
    if (key === "prediction-breakdown") {
      headers = ["Label", "Count", "Percentage"];
      rows = [
        ["Real", realCount, `${realPct}%`],
        ["Fake", fakeCount, `${fakePct}%`],
      ];
    } else if (key === "confidence-distribution") {
      headers = ["#", "Text", "Label", "Confidence", "Model"];
      rows = history.map((h, i) => [i + 1, h.text || "", h.label === "fake" ? "Fake" : "Real", `${(h.confidence * 100).toFixed(1)}%`, h.model === "hybrid" ? "Hybrid RF" : h.model === "logistic" ? "Logistic Regression" : "RF"]);
    } else if (key === "model-usage") {
      headers = ["Model", "Predictions", "Real", "Fake"];
      rows = ["hybrid", "rf", "logistic"].map((m) => {
        const preds = history.filter((h) => h.model === m);
        if (preds.length === 0) return null;
        return [m === "hybrid" ? "Hybrid RF" : m === "logistic" ? "Logistic Regression" : "RF", preds.length, preds.filter((h) => h.label === "real").length, preds.filter((h) => h.label === "fake").length];
      }).filter(Boolean);
    } else if (key === "avg-time") {
      headers = ["Model", "Avg Time (ms)", "Predictions"];
      rows = ["hybrid", "rf", "logistic"].map((m) => {
        const preds = history.filter((h) => h.model === m);
        if (preds.length === 0) return null;
        const avg = preds.reduce((s, h) => s + (h.processing_time_ms || 0), 0) / preds.length;
        return [m === "hybrid" ? "Hybrid RF" : m === "logistic" ? "Logistic Regression" : "RF", avg.toFixed(1), preds.length];
      }).filter(Boolean);
    } else if (key === "prediction-timeline") {
      headers = ["#", "Text", "Label", "Confidence", "Model", "Date"];
      rows = [...history].reverse().map((h, i) => [i + 1, h.text || "", h.label === "fake" ? "Fake" : "Real", `${(h.confidence * 100).toFixed(1)}%`, h.model === "hybrid" ? "Hybrid RF" : h.model === "logistic" ? "Logistic Regression" : "RF", h.timestamp ? new Date(h.timestamp).toLocaleDateString() : "-"]);
    }
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [dataDialogKey, history, realCount, fakeCount, realPct, fakePct]);

  const singles = filteredHistory;

  // Show an empty state with a prompt when there are fewer than 3 predictions — charts need data to render.
  if (singles.length < MIN_HISTORY) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 3, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Statistics
        </Typography>
        <StaggerContainer>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 4 }}>
              <StaggerItem>
                <Card variant="outlined" sx={{ borderColor: "#7C4DFF" }}>
                  <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#7C4DFF" }}>
                      {modelCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Models Used
                    </Typography>
                  </CardContent>
                </Card>
              </StaggerItem>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <StaggerItem>
                <Card variant="outlined" sx={{ borderColor: "#00BFA5" }}>
                  <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#00BFA5" }}>
                      {totalCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Current Total
                    </Typography>
                  </CardContent>
                </Card>
              </StaggerItem>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <StaggerItem>
                <Card variant="outlined" sx={{ borderColor: "#FFD740" }}>
                  <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#FFD740" }}>
                      {historyTotalRows}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total History Rows
                    </Typography>
                  </CardContent>
                </Card>
              </StaggerItem>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <StaggerItem>
                <Card variant="outlined" sx={{ borderColor: "success.main" }}>
                  <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                      {realCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real ({realPct}%)
                    </Typography>
                  </CardContent>
                </Card>
              </StaggerItem>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <StaggerItem>
                <Card variant="outlined" sx={{ borderColor: "error.main" }}>
                  <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                      {fakeCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fake ({fakePct}%)
                    </Typography>
                  </CardContent>
                </Card>
              </StaggerItem>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <StaggerItem>
                <Card variant="outlined" sx={{ borderColor: "#B47CFF" }}>
                  <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: "#B47CFF" }}>
                      {(avgConfidence * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Confidence
                    </Typography>
                  </CardContent>
                </Card>
              </StaggerItem>
            </Grid>
          </Grid>
        </StaggerContainer>
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>📊</Typography>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: "text.primary" }}>
            Not enough data yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            Make at least <strong>{MIN_HISTORY}</strong> predictions to unlock charts and statistics.
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            You currently have {singles.length} prediction{singles.length !== 1 ? "s" : ""}.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/predict")}>
            Go to Predict
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography
          variant="h3"
          sx={{
            background: "linear-gradient(135deg, #B47CFF 0%, #5DF2D6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mb: 0,
          }}
        >
          Statistics
        </Typography>
        <Typography variant="caption" color="text.disabled">
          <RelativeTime timestamp={loadTimestamp} />
        </Typography>
        <Tooltip title="Refresh statistics">
          <IconButton size="small" onClick={() => {
            setHistory(loadHistory());
            setLoadTimestamp(Date.now());
          }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Based on your {history.length} prediction{history.length !== 1 ? "s" : ""}.
      </Typography>

      {/* Summary stat cards — models used, total predictions, real/fake counts, and average confidence. */}
      <StaggerContainer>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StaggerItem>
              <Card variant="outlined" sx={{ borderColor: "#7C4DFF" }}>
                <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#7C4DFF" }}>
                    {modelCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Models Used
                  </Typography>
                </CardContent>
              </Card>
            </StaggerItem>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StaggerItem>
              <Card variant="outlined" sx={{ borderColor: "#00BFA5" }}>
                <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#00BFA5" }}>
                    {totalCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Current Total
                  </Typography>
                </CardContent>
              </Card>
            </StaggerItem>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StaggerItem>
              <Card variant="outlined" sx={{ borderColor: "#FFD740" }}>
                <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#FFD740" }}>
                    {historyTotalRows}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total History Rows
                  </Typography>
                </CardContent>
              </Card>
            </StaggerItem>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StaggerItem>
              <Card variant="outlined" sx={{ borderColor: "success.main" }}>
                <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                    {realCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Real ({realPct}%)
                  </Typography>
                </CardContent>
              </Card>
            </StaggerItem>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StaggerItem>
              <Card variant="outlined" sx={{ borderColor: "error.main" }}>
                <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                    {fakeCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Fake ({fakePct}%)
                  </Typography>
                </CardContent>
              </Card>
            </StaggerItem>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StaggerItem>
              <Card variant="outlined" sx={{ borderColor: "#B47CFF" }}>
                <CardContent sx={{ textAlign: "center", py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#B47CFF" }}>
                    {(avgConfidence * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Confidence
                  </Typography>
                </CardContent>
              </Card>
            </StaggerItem>
          </Grid>
        </Grid>
      </StaggerContainer>

      <Typography
        variant="h4"
        sx={{
          mt: 3,
          mb: 2,
          background: "linear-gradient(135deg, #B47CFF 0%, #5DF2D6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontWeight: 700,
        }}
      >
        Charts
      </Typography>

      <Grid container spacing={3}>
        {chartCards.map((card, idx) => (
          <Grid key={card.key} size={{ xs: 12, md: idx < 4 ? 6 : 12 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {card.title}
                  </Typography>
                  {totalCount >= MIN_HISTORY && (
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => setDataDialogKey(card.key)} sx={{ color: "text.secondary" }}>
                        <TableChartIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => downloadChart(card.key)} sx={{ color: "text.secondary" }}>
                        <FileDownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </Box>
                <div ref={(el) => { chartRefs.current[card.key] = el; }}>
                  {totalCount >= MIN_HISTORY ? card.chart(history) : (
                    <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.35 }}>
                      <Typography variant="body2" color="text.secondary">Not enough data yet &mdash; make at least 3 predictions</Typography>
                    </Box>
                  )}
                </div>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Data table dialog — shows raw values for each chart with a CSV download button. */}
      <Dialog open={!!dataDialogKey} onClose={() => setDataDialogKey(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {dataDialogKey === "prediction-breakdown" && "Label Distribution"}
              {dataDialogKey === "confidence-distribution" && "Confidence Scores"}
              {dataDialogKey === "model-usage" && "Model Breakdown"}
              {dataDialogKey === "avg-time" && "Prediction Times"}
              {dataDialogKey === "prediction-timeline" && "Prediction Timeline"}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <IconButton size="small" onClick={downloadTableData} sx={{ color: "text.secondary" }}>
                <FileDownloadIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => setDataDialogKey(null)} sx={{ color: "text.secondary" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {dataDialogKey === "prediction-breakdown" && (
            <Box sx={{ maxHeight: 480, overflow: "auto" }}>
              <Table size="small" stickyHeader sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Label</TableCell>
                    <TableCell>Count</TableCell>
                    <TableCell>Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    { label: "Real", count: realCount, pct: realPct },
                    { label: "Fake", count: fakeCount, pct: fakePct },
                  ].map((r) => (
                    <TableRow key={r.label}>
                      <TableCell>{r.label}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell>{r.pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          {dataDialogKey === "confidence-distribution" && (
            <Box sx={{ maxHeight: 480, overflow: "auto" }}>
              <Table size="small" stickyHeader sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Text</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Model</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.text?.substring(0, 60) || ""}
                      </TableCell>
                      <TableCell>{h.label === "fake" ? "Fake" : "Real"}</TableCell>
                      <TableCell>{(h.confidence * 100).toFixed(1)}%</TableCell>
                      <TableCell>{h.model === "hybrid" ? "Hybrid RF" : h.model === "logistic" ? "Logistic Regression" : "RF"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          {dataDialogKey === "model-usage" && (
            <Box sx={{ maxHeight: 480, overflow: "auto" }}>
              <Table size="small" stickyHeader sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>Predictions</TableCell>
                    <TableCell>Real</TableCell>
                    <TableCell>Fake</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {["hybrid", "rf", "logistic"].map((m) => {
                    const preds = history.filter((h) => h.model === m);
                    const real = preds.filter((h) => h.label === "real").length;
                    const fake = preds.filter((h) => h.label === "fake").length;
                    if (preds.length === 0) return null;
                    return (
                      <TableRow key={m}>
                        <TableCell>{m === "hybrid" ? "Hybrid RF" : m === "logistic" ? "Logistic Regression" : "RF"}</TableCell>
                        <TableCell>{preds.length}</TableCell>
                        <TableCell>{real}</TableCell>
                        <TableCell>{fake}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
          {dataDialogKey === "avg-time" && (
            <Box sx={{ maxHeight: 480, overflow: "auto" }}>
              <Table size="small" stickyHeader sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>Avg Time (ms)</TableCell>
                    <TableCell>Predictions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {["hybrid", "rf", "logistic"].map((m) => {
                    const preds = history.filter((h) => h.model === m);
                    if (preds.length === 0) return null;
                    const avg = preds.reduce((s, h) => s + (h.processing_time_ms || 0), 0) / preds.length;
                    return (
                      <TableRow key={m}>
                        <TableCell>{m === "hybrid" ? "Hybrid RF" : m === "logistic" ? "Logistic Regression" : "RF"}</TableCell>
                        <TableCell>{avg.toFixed(1)}</TableCell>
                        <TableCell>{preds.length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
          {dataDialogKey === "prediction-timeline" && (
            <Box sx={{ maxHeight: 480, overflow: "auto" }}>
              <Table size="small" stickyHeader sx={{ '& th, & td': { borderRight: '1px solid', borderColor: 'divider' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Text</TableCell>
                    <TableCell>Label</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...history].reverse().map((h, i) => (
                    <TableRow key={i}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell sx={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.text?.substring(0, 60) || ""}
                      </TableCell>
                      <TableCell>{h.label === "fake" ? "Fake" : "Real"}</TableCell>
                      <TableCell>{(h.confidence * 100).toFixed(1)}%</TableCell>
                      <TableCell>{h.model === "hybrid" ? "Hybrid RF" : h.model === "logistic" ? "Logistic Regression" : "RF"}</TableCell>
                      <TableCell>{h.timestamp ? new Date(h.timestamp).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
