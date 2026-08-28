import { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PsychologyIcon from "@mui/icons-material/Psychology";
import WordExplanation from "./WordExplanation";

// Accordion list — each batch row expands to show per-word contributions with color-coded chips.
export default function BatchWordAnalysis({ results, model }) {
  const [expanded, setExpanded] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Keeps the accordion state — only one row open at a time unless "Expand All" is active.
  const handleChange = (panel) => (_, isExpanded) => {
    setExpanded(isExpanded ? panel : null);
  };

  const filteredResults = results.filter((row) => row.word_contributions?.length);
  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, 10);

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PsychologyIcon fontSize="small" />
          Per-Row Word Analysis
        </Typography>
        {/* "Show all" toggles the full list; "Expand All" opens every accordion at once */}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {filteredResults.length > 10 && (
            <Button size="small" variant="outlined" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show less" : `Show all (${filteredResults.length})`}
            </Button>
          )}
          <Button size="small" variant="outlined" onClick={() => setExpanded(expanded === null ? "all" : null)}>
            {expanded !== null ? "Collapse All" : "Expand All"}
          </Button>
        </Box>
      </Box>
      {visibleResults.map((row, i) => {
        if (!row.word_contributions?.length) return null;
        return (
          <Box key={i}>
            <Accordion
              expanded={expanded === i || expanded === "all"}
              onChange={handleChange(i)}
              sx={{
                bgcolor: "rgba(255,255,255,0.02)",
                "&:before": { display: "none" },
                mb: 0.5,
                borderRadius: "8px !important",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1 }}>
                  <Chip
                    label={`#${i + 1}`}
                    size="small"
                    color={row.label === "fake" ? "error" : row.label === "real" ? "success" : "default"}
                    variant="outlined"
                    sx={{ minWidth: 44, "& .MuiChip-label": { fontSize: 11 } }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      color: row.label === "fake" ? "error.main" : row.label === "real" ? "success.main" : "text.primary",
                      fontWeight: 500,
                    }}
                  >
                    {row.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50, textAlign: "right" }}>
                    {(row.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
              <WordExplanation
                text={row.text}
                wordContributions={row.word_contributions || []}
                categoryHints={row.category_hints || []}
                metaIndicators={row.meta_indicators || []}
                model={model}
              />
            </AccordionDetails>
            </Accordion>
          </Box>
        );
      })}
    </Box>
  );
}
