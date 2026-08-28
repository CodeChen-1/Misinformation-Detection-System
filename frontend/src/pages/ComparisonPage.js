import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Fade,
  Alert,
  CircularProgress,
  LinearProgress,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import api from "../api/axiosInstance";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Maps internal model keys to user-friendly display names.
const MODEL_LABELS = {
  logistic: "Logistic Regression",
  rf: "Random Forest",
  hybrid: "Hybrid RF",
};

// Full three-model comparison page — confidence bars, per-model accordion details, and ensemble verdict.
export default function ComparisonPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { text, threshold } = location.state || {};

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch predictions from all three models via the /predict-all endpoint.
  const fetchComparison = useCallback(async () => {
    if (!text) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: res } = await api.post("/predict-all", {
        text,
        model: "hybrid",
        threshold: threshold ?? 0.5,
      }, { timeout: 60000 });
      setData(res);
    } catch (err) {
      setError(err?.message || "Failed to load comparison data");
    } finally {
      setLoading(false);
    }
  }, [text, threshold]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  if (!text) {
    return (
      <Box sx={{ textAlign: "center", py: 10 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
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

  const results = data?.results || [];

  const realCount = results.filter((r) => r.label === "real").length;
  const fakeCount = results.filter((r) => r.label === "fake").length;
  const allAgree = realCount === 3 || fakeCount === 3;
  const majorityLabel = realCount > fakeCount ? "Real" : "Fake";

  return (
    <Fade in timeout={500}>
      <Box>
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Button
            variant="text"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </Box>

        <Typography
          variant="h3"
          fontWeight={700}
          sx={{ mb: 3, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Detailed Model Comparison
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ py: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            <Button variant="contained" onClick={fetchComparison}>
              Retry
            </Button>
          </Box>
        )}

        {!loading && !error && results.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              No prediction data returned.
            </Typography>
            <Button variant="contained" onClick={fetchComparison}>
              Retry
            </Button>
          </Box>
        )}

        {!loading && !error && results.length === 3 && (
          <>
            {/* Three per-model result cards — confidence circle, verdict chip, and internal model name. */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {results.map((r) => (
                <Grid key={r.model} size={{ xs: 12, md: 4 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent sx={{ textAlign: "center", py: 3 }}>
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                      >
                        {MODEL_LABELS[r.model] || r.model}
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: r.label === "fake" ? "rgba(255,82,82,0.15)" : "rgba(105,240,174,0.15)",
                            border: `3px solid ${r.label === "fake" ? "#FF5252" : "#69F0AE"}`,
                          }}
                        >
                          <Typography
                            variant="h6"
                            fontWeight={800}
                            color={r.label === "fake" ? "error.main" : "success.main"}
                          >
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

            {/* Side-by-side confidence bars — makes it easy to spot which model is most confident. */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 4 }}>
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Confidence Comparison
              </Typography>
              <Stack spacing={2}>
                {results.map((r) => (
                  <Box key={r.model}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {MODEL_LABELS[r.model] || r.model}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color={r.label === "fake" ? "error.main" : "success.main"}>
                        {(r.confidence * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={r.confidence * 100}
                      sx={{
                        height: 10,
                        borderRadius: 5,
                        bgcolor: "action.hover",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          background: r.label === "fake"
                            ? "linear-gradient(90deg, #FF5252, #FF8A80)"
                            : "linear-gradient(90deg, #69F0AE, #B9F6CA)",
                        },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>

            {/* Checks if all three models agree; if not, shows a majority verdict. */}
            <Paper variant="outlined" sx={{ p: 2.5, mb: 4 }}>
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Ensemble Verdict
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Typography variant="body1">
                  {allAgree
                    ? `All 3 models agree`
                    : `${majorityLabel === "Fake" ? fakeCount : realCount} of 3 models predict ${majorityLabel}`}
                </Typography>
                <Chip
                  label={majorityLabel}
                  color={majorityLabel === "Fake" ? "error" : "success"}
                  variant="filled"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
            </Paper>

            <Typography
              variant="h6"
              fontWeight={600}
              sx={{ mb: 2, background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Per-Model Details
            </Typography>
            {/* Each model's accordion expands to show word contributions, category hints, and meta indicators. */}
            {results.map((r, idx) => (
              <Accordion
                key={r.model}
                defaultExpanded={idx === 0}
                sx={{
                  bgcolor: "rgba(255,255,255,0.02)",
                  "&:before": { display: "none" },
                  mb: 1,
                  borderRadius: "8px !important",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", pr: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {MODEL_LABELS[r.model] || r.model}
                    </Typography>
                    <Chip
                      label={r.label === "fake" ? "Fake" : "Real"}
                      color={r.label === "fake" ? "error" : "success"}
                      size="small"
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
                      {(r.confidence * 100).toFixed(1)}% confidence
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {r.word_contributions && r.word_contributions.length > 0 ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Word</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Contribution</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Direction</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {r.word_contributions.slice(0, 10).map((wc, i) => (
                            <TableRow key={i}>
                              <TableCell>{wc.word}</TableCell>
                              <TableCell>{wc.contribution.toFixed(4)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={wc.direction}
                                  size="small"
                                  color={wc.direction === "fake" ? "error" : "success"}
                                  variant="outlined"
                                  sx={{ height: 20, "& .MuiChip-label": { fontSize: 11, px: 0.5 } }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : null}

                  {r.category_hints && r.category_hints.length > 0 ? (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Category Hints
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {r.category_hints.map((ch, i) => (
                          <Chip
                            key={i}
                            label={`${ch.category} (${ch.count})`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {r.meta_indicators && r.meta_indicators.length > 0 ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Meta Indicators
                      </Typography>
                      <Stack spacing={0.5}>
                        {r.meta_indicators.map((mi, i) => (
                          <Box key={i} sx={{ display: "flex", gap: 1 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ minWidth: 100 }}>
                              {mi.name}:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {mi.value}
                            </Typography>
                            {mi.description && (
                              <Typography variant="caption" color="text.disabled">
                                — {mi.description}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {(!r.word_contributions || r.word_contributions.length === 0) &&
                   (!r.category_hints || r.category_hints.length === 0) &&
                   (!r.meta_indicators || r.meta_indicators.length === 0) && (
                    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                      Word Analysis was disabled for this prediction.
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </>
        )}
      </Box>
    </Fade>
  );
}
