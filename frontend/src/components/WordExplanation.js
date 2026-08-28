import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// Classifies contribution strength into Strong / Moderate / Weak tiers.
function getStrength(value) {
  if (value >= 0.05) return "Strong";
  if (value >= 0.02) return "Moderate";
  return "Weak";
}

export default function WordExplanation({
  text,
  wordContributions = [],
  categoryHints = [],
  metaIndicators = [],
  model,
}) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState("highlight");

  // Split text into tokens — each word gets a color-coded highlight showing how much it influenced the prediction.
  const tokens = useMemo(() => {
    if (!text) return [];
    const parts = [];
    const lower = text.toLowerCase();
    const sorted = [...wordContributions].sort(
      (a, b) => b.word.split(" ").length - a.word.split(" ").length
    );
    let i = 0;
    while (i < text.length) {
      let match = null;
      for (const c of sorted) {
        const phrase = c.word.toLowerCase();
        const idx = lower.indexOf(phrase, i);
        if (idx === i) {
          match = c;
          break;
        }
      }
      if (match) {
        parts.push({
          text: text.slice(i, i + match.word.length),
          contribution: match,
          isMatch: true,
        });
        i += match.word.length;
      } else {
        const currentI = i;
        const nextMatch = sorted.reduce((min, c) => {
          const idx = lower.indexOf(c.word.toLowerCase(), currentI);
          return idx >= 0 && (min < 0 || idx < min) ? idx : min;
        }, -1);
        const end = nextMatch >= 0 ? nextMatch : text.length;
        parts.push({
          text: text.slice(i, end),
          isMatch: false,
        });
        i = end;
      }
    }
    return parts;
  }, [text, wordContributions]);

  if (!wordContributions.length && !categoryHints.length && !metaIndicators.length) {
    return null;
  }

  const highlightColor = (direction) =>
    direction === "fake" ? theme.palette.error.main : theme.palette.success.main;

  const highlightBg = (direction) =>
    direction === "fake"
      ? `${theme.palette.error.main}22`
      : `${theme.palette.success.main}22`;

  return (
    <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          Word-Level Analysis
        </Typography>
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
        >
          <ToggleButton value="highlight">Highlight</ToggleButton>
          <ToggleButton value="ranked">Ranked</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Highlight view — color-coded text (green = real, red = fake) with tooltip on hover showing contribution score */}
      {viewMode === "highlight" && (
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            bgcolor: "rgba(255,255,255,0.03)",
            lineHeight: 2,
            fontSize: "0.95rem",
            maxHeight: 300,
            overflowY: "auto",
            overflowWrap: "break-word",
          }}
        >
          {tokens.map((t, i) =>
            t.isMatch ? (
              <Tooltip
                key={i}
                title={`${t.contribution.word}: ${(t.contribution.contribution * 100).toFixed(1)}% toward ${t.contribution.direction}`}
              >
                <Box
                  component="span"
                  sx={{
                    bgcolor: highlightBg(t.contribution.direction),
                    color: highlightColor(t.contribution.direction),
                    fontWeight: 600,
                    borderRadius: 0.5,
                    px: 0.3,
                    cursor: "default",
                    borderBottom: `2px solid ${highlightColor(t.contribution.direction)}`,
                    transition: "all 0.15s",
                    "&:hover": { opacity: 0.8, bgcolor: highlightBg(t.contribution.direction) },
                  }}
                >
                  {t.text}
                </Box>
              </Tooltip>
            ) : (
              <span key={i}>{t.text}</span>
            )
          )}
        </Box>
      )}

      {/* Ranked view — bars sorted by contribution strength, so you can scan which words mattered most */}
      {viewMode === "ranked" && (
        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {wordContributions.map((c, i) => {
            const strength = getStrength(c.contribution);
            const pct = Math.min(c.contribution * 500, 100);
            return (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  "&:hover": { bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1 },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ minWidth: 80, textAlign: "right", fontWeight: 500, fontFamily: "monospace" }}
                >
                  {c.word}
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    height: 20,
                    bgcolor: "rgba(255,255,255,0.06)",
                    borderRadius: 1,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: "100%",
                      bgcolor: highlightColor(c.direction),
                      borderRadius: 1,
                      opacity: 0.7,
                      transition: "width 0.3s",
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    minWidth: 55,
                    color: highlightColor(c.direction),
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  {(c.contribution * 100).toFixed(1)}%
                </Typography>
                <Chip
                  label={strength}
                  size="small"
                  sx={{
                    height: 20,
                    minWidth: 60,
                    "& .MuiChip-label": { fontSize: 10, px: 0.5 },
                    bgcolor:
                      strength === "Strong"
                        ? highlightColor(c.direction)
                        : "transparent",
                    color:
                      strength === "Strong"
                        ? "#fff"
                        : highlightColor(c.direction),
                    border: `1px solid ${highlightColor(c.direction)}`,
                    opacity: strength === "Weak" ? 0.5 : 1,
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Category hints — shows which deception-related categories (e.g. "fear", "urgency") were detected in the text */}
      {categoryHints.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Category Hints
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {categoryHints.map((h, i) => (
              <Tooltip key={i} title={`Matched: ${h.matched_words.join(", ")}`}>
                <Chip
                  label={`${h.category} (${h.count})`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ "& .MuiChip-label": { fontSize: 11 } }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}

      {/* Meta indicators — extra structural signals only the hybrid model provides (like sentiment or readability) */}
      {metaIndicators.length > 0 && model === "hybrid" && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Meta Feature Indicators (hybrid only)
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {metaIndicators.map((m, i) => (
              <Tooltip key={i} title={m.description}>
                <Chip
                  label={m.name.replace(/_/g, " ")}
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ "& .MuiChip-label": { fontSize: 11 } }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}

      {/* Legend — red dot = fake, green dot = real, so users know what the colors mean at a glance */}
      {wordContributions.length > 0 && (
        <Box sx={{ mt: 1.5, display: "flex", gap: 1.5, alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: theme.palette.error.main }} />
            <Typography variant="caption" color="text.secondary">Fake</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: theme.palette.success.main }} />
            <Typography variant="caption" color="text.secondary">Real</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
