import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Stack,
  Chip,
  Button,
  Fade,
  Grid,
  Alert,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
} from "@mui/material";
import api from "../api/axiosInstance";
import { StaggerContainer, StaggerItem } from "../components/AnimatedContainer";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import GaugeChart from "../components/GaugeChart";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import WordExplanation from "../components/WordExplanation";
import BatchSummaryChart from "../components/BatchSummaryChart";
import BatchWordAnalysis from "../components/BatchWordAnalysis";

// Shown when the backend doesn't return any category hints for a prediction.
const FALLBACK_CATEGORIES = [
  { category: "Urgency / Scarcity", count: 0, matched_words: [] },
  { category: "Emotional Manipulation", count: 0, matched_words: [] },
  { category: "Conspiracy Language", count: 0, matched_words: [] },
  { category: "Financial Scam", count: 0, matched_words: [] },
  { category: "Health Misinformation", count: 0, matched_words: [] },
];

// Single or batch prediction results — gauge chart, word analysis, category breakdown, and export options.
export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareResults, setCompareResults] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [expandedMatched, setExpandedMatched] = useState(new Set());

  // Expand/collapse matched words for a single category hint row.
  const toggleExpandedMatched = (idx) => {
    setExpandedMatched(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };
  const [feedback, setFeedback] = useState(() => {
    try {
      const saved = localStorage.getItem("prediction_feedback");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem("prediction_feedback", JSON.stringify(feedback));
  }, [feedback]);

  const pdfRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Maps a raw confidence score to a human-readable tier — Highly / Likely / Possibly.
  function getConfidenceTier(confidence, threshold) {
    if (confidence >= 0.9) return "Highly";
    if (confidence >= 0.7) return "Likely";
    return "Possibly";
  }

  // Pull the text to re-predict when opening the Compare Models dialog.
  const getCompareText = useCallback(() => {
    if (state?.type === "single") return state.fetchedText || state.text || "";
    if (state?.type === "batch" && state?.batchResult?.results?.length > 0) return state.batchResult.results[0].text || "";
    return "";
  }, [state]);

  // Hit all three models and collect their predictions side-by-side in a dialog.
  const handleCompare = useCallback(async () => {
    const txt = getCompareText();
    const thr = state?.threshold ?? 0.5;
    setCompareLoading(true);
    setCompareError("");
    try {
      const models = ["hybrid", "logistic", "rf"];
      const results = await Promise.all(
        models.map(async (m) => {
          const { data } = await api.post(`/predict?explain=false`, { text: txt, model: m, threshold: thr });
          return { model: m, label: data.label, confidence: data.confidence, model_used: data.model_used };
        })
      );
      setCompareResults(results);
    } catch (err) {
      setCompareError(err.message || "Comparison failed");
    } finally {
      setCompareLoading(false);
    }
  }, [state, getCompareText]);

  // Render the result card to canvas and save it as a multi-page PDF.
  const handleDownloadPdf = useCallback(async () => {
    if (!pdfRef.current) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save("prediction-result.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  if (!state || !state.type) {
    return (
      <Box sx={{ textAlign: "center", py: 10 }}>
        <Typography variant="h5" gutterBottom sx={{ background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          No prediction data found
        </Typography>
        <Typography variant="body1" color="text.disabled" sx={{ mb: 3 }}>
          Make a prediction first on the Predict page.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/predict")}>
          Go to Predict
        </Button>
      </Box>
    );
  }

  const { type } = state;

  if (type === "single") {
    const { text, label, confidence, processing_time_ms, word_contributions, category_hints, meta_indicators, model_used, threshold, timestamp } = state;
    const displayText = state.fetchedText || text;
    return (
      <>
      <Fade in timeout={500}>
        <Box ref={pdfRef}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate("/predict")}>
              Back to Predict
            </Button>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<CompareArrowsIcon />} onClick={() => { setCompareOpen(true); handleCompare(); }}>
                Compare Models
              </Button>
              <Button variant="outlined" size="small" startIcon={pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />} onClick={handleDownloadPdf} disabled={pdfLoading}>
                {pdfLoading ? "Generating..." : "Download PDF"}
              </Button>
            </Box>
          </Box>

          <StaggerContainer>
            <Grid container spacing={3}>
              {/* Left column — shows the input text (or fetched URL content) with character count. */}
              <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", height: 1100 }}>
                <Paper variant="outlined" sx={{ p: 2.5, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                  {state.fetchedText ? (
                    <>
                      <Typography variant="body1" sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}>
                        Source URL
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ mb: 2, color: "primary.main", wordBreak: "break-all", overflowWrap: "break-word" }}
                      >
                        {state.sourceUrl || text}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}>
                        Fetched text &middot; {state.fetchedText.length} chars
                      </Typography>
                      <Box sx={{ flex: 1, overflow: "auto" }}>
                        <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.6, fontStyle: "italic", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
                          &ldquo;{state.fetchedText}&rdquo;
                        </Typography>
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography variant="body1" sx={{ mb: 1, fontWeight: 500, color: "text.secondary" }}>
                        Input text &middot; {text.length} chars
                      </Typography>
                      <Box sx={{ flex: 1, overflowY: "auto" }}>
                        <Typography variant="body2" sx={{ color: "text.primary", lineHeight: 1.6, fontStyle: "italic", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
                          &ldquo;{text}&rdquo;
                        </Typography>
                      </Box>
                    </>
                  )}
                </Paper>
              </Grid>

              {/* Right column — gauge chart, category breakdown, and analysis coverage for the single-view result. */}
              <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <StaggerItem>
                  <Alert severity="warning" icon={<WarningAmberIcon />}>
                    These predictions are generated by machine learning models and may contain errors.
                    Always verify results carefully before making decisions based on them.
                    Visit Sebenarnya.my and verify your information carefully.
                  </Alert>
                </StaggerItem>

                <StaggerItem>
                  <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", py: 3 }}>
                      <GaugeChart value={confidence} label={label} />
                      <Typography
                        variant="h4"
                        fontWeight={800}
                        color={label === "fake" ? "error.main" : "success.main"}
                        sx={{ mt: 1 }}
                      >
                        {getConfidenceTier(confidence, threshold)} {label === "fake" ? "Fake" : "Real"}
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        {(confidence * 100).toFixed(1)}% confidence
                      </Typography>
                      {processing_time_ms > 0 && (
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="caption" color="text.disabled" display="block">
                            Predicted in {processing_time_ms} ms &middot; {model_used}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" display="block">
                            Threshold: {threshold.toFixed(2)}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 2 }}>
                        <IconButton
                          onClick={() => setFeedback(prev => ({ ...prev, [timestamp]: "up" }))}
                          color={feedback[timestamp] === "up" ? "success" : "default"}
                          size="small"
                        >
                          <ThumbUpIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => setFeedback(prev => ({ ...prev, [timestamp]: "down" }))}
                          color={feedback[timestamp] === "down" ? "error" : "default"}
                          size="small"
                        >
                          <ThumbDownIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </StaggerItem>

                <StaggerItem>
                  <Card variant="outlined" sx={{ borderColor: "rgba(255, 82, 82, 0.3)" }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Fake Cause Categories
                      </Typography>
                      {(() => {
                        const hints = FALLBACK_CATEGORIES.map((fc) => {
                          const match = category_hints?.find((ch) => ch.category === fc.category);
                          return match || fc;
                        });
                        const maxCount = Math.max(...hints.map((x) => x.count));
                        return (
                          <Stack spacing={1.5}>
                            {hints.map((h, i) => (
                              <Box key={i}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {h.category}
                                  </Typography>
                                  <Chip label={h.count} size="small" color="error" variant="outlined" />
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={maxCount > 0 ? (h.count / maxCount) * 100 : 0}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: "rgba(255, 82, 82, 0.1)",
                                    "& .MuiLinearProgress-bar": { bgcolor: "error.main", borderRadius: 4 },
                                  }}
                                />
                                {expandedMatched.has(i) ? (
                                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: "block" }}>
                                    {h.matched_words && h.matched_words.length > 0
                                      ? `Matched: ${h.matched_words.join(", ")}`
                                      : "No matches found"}
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    onClick={() => toggleExpandedMatched(i)}
                                    sx={{ mt: 0.3, display: "block", cursor: "pointer", "&:hover": { color: "text.primary" } }}
                                  >
                                    Matched {h.matched_words?.length || 0} words ▸
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </StaggerItem>

                {/* Shows what percentage of the input words the model actually analysed. */}
                <StaggerItem>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Analysis Coverage
                      </Typography>
                      {(() => {
                        const totalWords = displayText.split(/\s+/).filter(Boolean).length;
                        const analyzed = word_contributions && word_contributions.length > 0 ? word_contributions.length : 0;
                        const pct = totalWords > 0 ? (analyzed / totalWords) * 100 : 0;
                        return (
                          <Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {analyzed} of {totalWords} words analyzed
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {pct.toFixed(0)}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ height: 12, borderRadius: 6, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { borderRadius: 6, bgcolor: "success.main" } }}
                            />
                          </Box>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Grid>
            </Grid>

            {/* Row 2: Word analysis full width */}
            <StaggerItem>
              <Box sx={{ mt: 3 }}>
                <WordExplanation
                  text={displayText}
                  wordContributions={word_contributions || []}
                  categoryHints={category_hints || []}
                  metaIndicators={meta_indicators || []}
                  model={state.model}
                />
              </Box>
            </StaggerItem>
          </StaggerContainer>

        </Box>
      </Fade>
      {/* Compare Models dialog — re-runs the same text against all three models side by side. */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Model Comparison</DialogTitle>
        <DialogContent>
          {compareLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {compareError && (
            <Alert severity="error" sx={{ mb: 2 }}>{compareError}</Alert>
          )}
          {!compareLoading && !compareError && compareResults.length === 3 && (
            <>
              <Grid container spacing={2}>
                {compareResults.map((r, i) => (
                  <Grid key={r.model} size={{ xs: 12, md: 4 }}>
                    <Card>
                      <CardContent sx={{ textAlign: "center", py: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                          {r.model === "hybrid" ? "Hybrid RF" : r.model === "logistic" ? "Logistic Regression" : "RF"}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                          <Box
                            sx={{
                              width: 60, height: 60, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              bgcolor: r.label === "fake" ? "rgba(255,82,82,0.15)" : "rgba(105,240,174,0.15)",
                              border: `3px solid ${r.label === "fake" ? "#FF5252" : "#69F0AE"}`,
                            }}
                          >
                            <Typography variant="h6" fontWeight={800}
                              color={r.label === "fake" ? "error.main" : "success.main"}>
                              {(r.confidence * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={r.label === "fake" ? "Fake" : "Real"}
                          color={r.label === "fake" ? "error" : "success"}
                          size="small"
                          variant="filled"
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
                          {r.model_used}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setCompareOpen(false);
                    navigate("/comparison", { state: { text: getCompareText(), threshold: state.threshold } });
                  }}
                >
                  View Detailed Comparison
                </Button>
              </Box>
            </>
          )}
          {!compareLoading && !compareError && compareResults.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
              Click "Compare Models" to re-predict this text with all models.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
    );
  }

  if (type === "batch") {
    const { batchResult, model, threshold } = state;
    const results = batchResult?.results ?? [];
    const totalRows = batchResult?.total_rows ?? results.length;
    const realCount = results.filter((r) => r.label === "real").length;
    const fakeCount = results.filter((r) => r.label === "fake").length;
    const errorCount = results.filter((r) => r.label !== "real" && r.label !== "fake").length;

    const handleDownload = () => {
      const headers = ["index", "text", "label", "confidence", "reason"];
      const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = results.map((r, i) => [i + 1, escape(r.text), escape(r.label), escape(r.confidence), escape(r.reason)].join(","));
      const csv = headers.join(",") + "\n" + rows.join("\n") + "\n";
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", "batch-predictions.csv");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Aggregate category hints across all rows with per-row word tracking
    const aggHints = {};
    results.forEach((r, rowIdx) => {
      if (r.category_hints) {
        r.category_hints.forEach(h => {
          if (aggHints[h.category]) {
            aggHints[h.category].count += h.count;
            (h.matched_words || []).forEach(w => {
              if (!aggHints[h.category].wordRows[w]) {
                aggHints[h.category].wordRows[w] = [];
              }
              aggHints[h.category].wordRows[w].push(rowIdx + 1);
            });
          } else {
            const wordRows = {};
            (h.matched_words || []).forEach(w => {
              wordRows[w] = [rowIdx + 1];
            });
            aggHints[h.category] = { category: h.category, count: h.count, wordRows };
          }
        });
      }
    });
    const aggregatedHints = Object.values(aggHints).sort((a, b) => b.count - a.count).slice(0, 5);
    const hasBatchHints = aggregatedHints.length > 0;

    const realPct = totalRows ? ((realCount / totalRows) * 100).toFixed(1) : 0;
    const fakePct = totalRows ? ((fakeCount / totalRows) * 100).toFixed(1) : 0;

    return (
      <>
      <Fade in timeout={500}>
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate("/predict")}>
              Back to Predict
            </Button>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" size="small" startIcon={<CompareArrowsIcon />} onClick={() => { setCompareOpen(true); handleCompare(); }}>
                Compare Models
              </Button>
              <Button variant="outlined" size="small" onClick={handleDownload}>
                Download CSV
              </Button>
            </Box>
          </Box>

          <StaggerContainer>
            <Grid container spacing={3}>
              {/* Row 1: Left + Right columns */}
              <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", flexDirection: "column", maxHeight: 1270 }}>
                <Paper variant="outlined" sx={{ p: 2.5, display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mb: 1, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Row Results ({totalRows})
                  </Typography>
                   <Stack spacing={0.5} sx={{ flex: 1, overflow: "auto" }}>
                        {results.map((r, i) => (
                          /* Row-level compare button appears on hover — keeps the list compact
                             while letting users run any row through the 3-model ComparisonPage. */
                          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.3, "&:hover .compare-btn": { opacity: 1 } }}>
                            <Typography variant="caption" color="text.disabled" sx={{ minWidth: 28, flexShrink: 0 }}>
                              #{i + 1}
                            </Typography>
                            <Chip
                              label={r.label === "real" ? "Real" : r.label === "fake" ? "Fake" : "Error"}
                              size="small"
                              color={r.label === "real" ? "success" : r.label === "fake" ? "error" : "warning"}
                              variant="outlined"
                              sx={{ height: 20, minWidth: 48, flexShrink: 0, "& .MuiChip-label": { fontSize: 10, px: 0.5 } }}
                            />
                            <Tooltip title={r.text || ""}>
                              <Typography
                                variant="caption"
                                sx={{
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  color: r.label === "error" ? "error.main" : "text.primary",
                                }}
                              >
                                {r.text || ""}
                              </Typography>
                            </Tooltip>
                            {r.label !== "error" && (
                              <IconButton
                                className="compare-btn"
                                size="small"
                                onClick={() => navigate("/comparison", { state: { text: r.text, threshold } })}
                                sx={{ opacity: 0, flexShrink: 0, p: 0.3, transition: "opacity 0.2s" }}
                                title="Compare with other models"
                              >
                                <CompareArrowsIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid>

              {/* Right column — prediction summary, category breakdown, and distribution chart for the batch view. */}
              <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <StaggerItem>
                  <Alert severity="warning" icon={<WarningAmberIcon />}>
                    These predictions are generated by machine learning models and may contain errors.
                    Always verify results carefully before making decisions based on them.
                    Visit Sebenarnya.my and verify your information carefully.
                  </Alert>
                </StaggerItem>

                <StaggerItem>
                  <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", py: 3 }}>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Prediction Summary
                      </Typography>
                      <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="h4" color="success.main" fontWeight={800}>
                            {realCount}
                          </Typography>
                          <Typography variant="caption" color="success.main" fontWeight={600}>
                            Real
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="h4" color="error.main" fontWeight={800}>
                            {fakeCount}
                          </Typography>
                          <Typography variant="caption" color="error.main" fontWeight={600}>
                            Fake
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                        <Chip label={`Real: ${realPct}%`} color="success" variant="outlined" />
                        <Chip label={`Fake: ${fakePct}%`} color="error" variant="outlined" />
                        {errorCount > 0 && <Chip label={`Errors: ${errorCount}`} color="warning" variant="outlined" />}
                      </Stack>
                      {batchResult?.processing_time_ms > 0 && (
                        <Typography variant="caption" color="text.disabled">
                          Total time: {(batchResult.processing_time_ms / 1000).toFixed(1)}s &middot; Threshold: {threshold.toFixed(2)}
                        </Typography>
                      )}
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 1 }}>
                        <IconButton
                          onClick={() => setFeedback(prev => ({ ...prev, [state.timestamp || "batch"]: "up" }))}
                          color={feedback[state.timestamp || "batch"] === "up" ? "success" : "default"}
                          size="small"
                        >
                          <ThumbUpIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => setFeedback(prev => ({ ...prev, [state.timestamp || "batch"]: "down" }))}
                          color={feedback[state.timestamp || "batch"] === "down" ? "error" : "default"}
                          size="small"
                        >
                          <ThumbDownIcon />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </StaggerItem>

                {/* Category detection for the batch view — same pattern, aggregated across all rows. */}
                <StaggerItem>
                  <Card variant="outlined" sx={{ borderColor: "rgba(255, 82, 82, 0.3)" }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Fake Cause Categories
                      </Typography>
                      {(() => {
                        const hints = hasBatchHints
                          ? FALLBACK_CATEGORIES.map((fc) => {
                              const match = aggregatedHints.find((ah) => ah.category === fc.category);
                              return match || fc;
                            })
                          : FALLBACK_CATEGORIES;
                        const maxCount = Math.max(...hints.map((x) => x.count));
                        return (
                          <Stack spacing={1.5}>
                            {hints.map((h, i) => (
                              <Box key={i}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {h.category}
                                  </Typography>
                                  <Chip label={h.count} size="small" color="error" variant="outlined" />
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={maxCount > 0 ? (h.count / maxCount) * 100 : 0}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: "rgba(255, 82, 82, 0.1)",
                                    "& .MuiLinearProgress-bar": { bgcolor: "error.main", borderRadius: 4 },
                                  }}
                                />
                                {expandedMatched.has(i) ? (
                                  <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: "block" }}>
                                    {h.wordRows
                                      ? `Matched: ${Object.entries(h.wordRows).map(([word, rows]) => `${word} (row ${rows.join(", ")})`).join(", ")}`
                                      : h.matched_words && h.matched_words.length > 0
                                        ? `Matched: ${h.matched_words.join(", ")}`
                                        : "No matches found"}
                                  </Typography>
                                ) : (
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    onClick={() => toggleExpandedMatched(i)}
                                    sx={{ mt: 0.3, display: "block", cursor: "pointer", "&:hover": { color: "text.primary" } }}
                                  >
                                    Matched {h.count} matches ▸
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </StaggerItem>

                {/* Bar chart showing the spread of real vs fake predictions across the batch. */}
                <StaggerItem>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Prediction Distribution
                      </Typography>
                      <BatchSummaryChart results={results} threshold={threshold} />
                    </CardContent>
                  </Card>
                </StaggerItem>
              </Grid>
            </Grid>

            {/* Row 2: Word analysis full width */}
            <StaggerItem>
              <Box sx={{ mt: 3 }}>
                <BatchWordAnalysis results={results} model={model} />
              </Box>
            </StaggerItem>
          </StaggerContainer>
        </Box>
      </Fade>
      {/* Compare Models dialog for batch view — same cross-model comparison, scoped to the first row's text. */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Model Comparison</DialogTitle>
        <DialogContent>
          {compareLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {compareError && (
            <Alert severity="error" sx={{ mb: 2 }}>{compareError}</Alert>
          )}
          {!compareLoading && !compareError && compareResults.length === 3 && (
            <>
              <Grid container spacing={2}>
                {compareResults.map((r, i) => (
                  <Grid key={r.model} size={{ xs: 12, md: 4 }}>
                    <Card>
                      <CardContent sx={{ textAlign: "center", py: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                          {r.model === "hybrid" ? "Hybrid RF" : r.model === "logistic" ? "Logistic Regression" : "RF"}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                          <Box
                            sx={{
                              width: 60, height: 60, borderRadius: "50%",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              bgcolor: r.label === "fake" ? "rgba(255,82,82,0.15)" : "rgba(105,240,174,0.15)",
                              border: `3px solid ${r.label === "fake" ? "#FF5252" : "#69F0AE"}`,
                            }}
                          >
                            <Typography variant="h6" fontWeight={800}
                              color={r.label === "fake" ? "error.main" : "success.main"}>
                              {(r.confidence * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={r.label === "fake" ? "Fake" : "Real"}
                          color={r.label === "fake" ? "error" : "success"}
                          size="small"
                          variant="filled"
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
                          {r.model_used}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setCompareOpen(false);
                    navigate("/comparison", { state: { text: getCompareText(), threshold: state.threshold } });
                  }}
                >
                  View Detailed Comparison
                </Button>
              </Box>
            </>
          )}
          {!compareLoading && !compareError && compareResults.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
              Click "Compare Models" to re-predict this text with all models.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
    );
  }
  return null;
}
