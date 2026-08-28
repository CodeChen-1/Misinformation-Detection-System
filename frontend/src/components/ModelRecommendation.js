import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import BalanceIcon from "@mui/icons-material/Balance";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";

// Three priority tiers — pick your speed / balance / accuracy preference and we'll recommend a model.
const PRIORITIES = [
  {
    key: "speed",
    label: "Speed",
    modelLabel: "Logistic Regression",
    icon: <BoltIcon />,
    description: "Fastest predictions, lowest latency.",
  },
  {
    key: "balanced",
    label: "Balanced",
    modelLabel: "Random Forest",
    icon: <BalanceIcon />,
    description: "Well-rounded performance for everyday use.",
  },
  {
    key: "accuracy",
    label: "Accuracy",
    modelLabel: "Hybrid Random Forest",
    icon: <TravelExploreIcon />,
    description: "Best possible detection, catches nuanced patterns.",
  },
];

// Maps each priority key to its underlying model type, display label, and performance tag.
const MODEL_MAP = {
  speed: { model: "logistic", label: "Logistic Regression", tag: "Fast" },
  balanced: { model: "rf", label: "Random Forest", tag: "High AUC" },
  accuracy: { model: "hybrid", label: "Hybrid Random Forest", tag: "Most Accurate" },
};

const TAG_COLORS = {
  Fast: "success",
  Efficient: "success",
  Balanced: "info",
  "High AUC": "info",
  "Most Accurate": "secondary",
  "Deep Analysis": "secondary",
};

const STRENGTH_ICONS = {
  Speed: <BoltIcon sx={{ fontSize: 16, mr: 0.5 }} />,
  Balance: <BalanceIcon sx={{ fontSize: 16, mr: 0.5 }} />,
  Accuracy: <TravelExploreIcon sx={{ fontSize: 16, mr: 0.5 }} />,
};

// Three model cards (Speed / Balanced / Accuracy) with a dropdown picker and a toggle for explain mode.
export default function ModelRecommendation({ models, currentModel, onSelectModel, explain, onToggleExplain }) {
  const [priority, setPriority] = useState(null);

  // User taps a priority card → we set the model and bubble it up to the parent.
  const handlePriority = (_, val) => {
    if (!val) return;
    setPriority(val);
    const rec = MODEL_MAP[val];
    if (rec) onSelectModel(rec.model);
  };

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(136, 51, 255, 0.3)", bgcolor: "rgba(136, 51, 255, 0.08)" }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
          Model & Priority
        </Typography>

        {/* Three priority cards — Speed, Balanced, Accuracy. Pick one and we auto-select the right model. */}
        <ToggleButtonGroup
          value={priority}
          exclusive
          onChange={handlePriority}
          sx={{
            display: "flex", gap: 1, flexWrap: "wrap",
            "& .MuiToggleButton-root": {
              borderRadius: 2, flex: 1, minWidth: 120, textTransform: "none", px: 2,
              transition: "all 0.2s ease",
              "&.Mui-selected": {
                bgcolor: (t) => t.palette.mode === 'dark' ? "rgba(255, 179, 0, 0.15)" : "rgba(136, 51, 255, 0.12)",
                borderColor: (t) => t.palette.mode === 'dark' ? "#FFB300" : "primary.main",
                "& .priority-label": { color: (t) => t.palette.mode === 'dark' ? "#FFD740" : "primary.main", fontWeight: 700 },
                "& .priority-model": { color: (t) => t.palette.mode === 'dark' ? "#FFB300" : t.palette.primary.main, fontWeight: 800 },
                "& .priority-icon": { color: (t) => t.palette.mode === 'dark' ? "#FFD740" : "primary.main" },
                "& .priority-desc": { color: "text.secondary" },
              },
              "&:not(.Mui-selected) .priority-icon": { color: "text.secondary" },
            },
          }}
        >
          {PRIORITIES.map((p) => (
            <ToggleButton key={p.key} value={p.key}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, py: 0.5 }}>
                  <Box className="priority-icon">{p.icon}</Box>
                  <Typography className="priority-label" variant="body2" fontWeight={600}>
                    {p.label}
                  </Typography>
                  <Typography className="priority-model" variant="body2" color="primary.main" sx={{ fontWeight: 700 }}>
                    {p.modelLabel}
                  </Typography>
                  <Typography className="priority-desc" variant="caption" color="text.disabled">
                    {p.description}
                  </Typography>
                </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Highlighted recommendation — shows which model was picked based on your priority choice */}
        {priority && (
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: "rgba(124, 77, 255, 0.08)" }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Recommended: {MODEL_MAP[priority].label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
              {models.find((m) => m.value === MODEL_MAP[priority].model)?.label}
            </Typography>
            <Chip
              label={MODEL_MAP[priority].tag}
              size="small"
              color={TAG_COLORS[MODEL_MAP[priority].tag] || "default"}
            />
          </Box>
        )}

        {/* Model dropdown — manual override if the recommended pick isn't what you want */}
        <Box sx={{ mt: 2, display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <FormControl sx={{ flex: 3, minWidth: 0 }}>
            <InputLabel id="model-rec-label">Model</InputLabel>
            <Select
              labelId="model-rec-label"
              value={currentModel}
              label="Model"
              onChange={(e) => onSelectModel(e.target.value)}
              slotProps={{
                popper: {
                  strategy: "absolute",
                  sx: { zIndex: 1300 },
                },
              }}
              renderValue={(v) => {
                const m = models.find((x) => x.value === v);
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, whiteSpace: "normal" }}>
                    {STRENGTH_ICONS[m?.strength]}
                    <span>{m?.label || v}</span>
                  </Box>
                );
              }}
            >
              {models.map((m) => (
                <MenuItem key={m.value} value={m.value} sx={{ whiteSpace: "normal" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      {STRENGTH_ICONS[m.strength]}
                      <span>{m.label}</span>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5, ml: 2, flexShrink: 0 }}>
                      {m.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          color={m.color}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Explain mode toggle — when on, the prediction surface shows per-word contribution highlights */}
          <FormControlLabel
            control={<Switch checked={explain} onChange={(e) => onToggleExplain?.(e.target.checked)} size="small" />}
            label={
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography variant="body2" fontWeight={600}>Word Analysis</Typography>
                <Typography variant="caption" color="text.secondary">per-word contributions</Typography>
              </Box>
            }
            sx={{ mt: 0.5, mr: 0, flexShrink: 0 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}