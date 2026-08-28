import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Stack,
  Typography,
  Box,
  TextField,
  IconButton,
  Tooltip,
  Button, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Radio, RadioGroup, FormControlLabel,
  Snackbar, Alert,
} from "@mui/material";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PredictionHistory from "../components/PredictionHistory";
import { useNavigate } from "react-router-dom";

// Live relative timestamp — ticks every second so it always feels fresh.
function RelativeTime({ timestamp }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.floor((now - (timestamp || Date.now())) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// Full prediction history with search, date filters, sortable columns, pagination, bookmarks, and import/export.
export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("prediction_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("timestamp");
  const [sortDir, setSortDir] = useState("desc");
  const [filterTab, setFilterTab] = useState("combined");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const debounceRef = useRef(null);
  const [loadTimestamp, setLoadTimestamp] = useState(Date.now());
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Bookmarked predictions survive "Clear All" — stored separately in localStorage.
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem("prediction_bookmarks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importMode, setImportMode] = useState("merge");
  const fileInputRef = useRef(null);
  const [importSnackbar, setImportSnackbar] = useState(null);

  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem("prediction_history");
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch {
          setHistory([]);
        }
      }
    };
    window.addEventListener("prediction-history-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("prediction-history-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("prediction_history", JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("prediction-history-changed"));
  }, [history]);

  // Debounce search input so we don't re-filter on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const toggleBookmark = useCallback((timestamp) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(timestamp)) next.delete(timestamp);
      else next.add(timestamp);
      localStorage.setItem("prediction_bookmarks", JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Apply search, date range filter, and sorting — all in one memoised pass.
  const processedHistory = useMemo(() => {
    let filtered = history;
    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      filtered = history.filter((item) => {
        if (item.type === "batch") {
          const batchStr = [
            item.total_rows,
            item.real_count,
            item.fake_count,
            item.model,
            item.type,
          ].join(" ").toLowerCase();
          return batchStr.includes(q);
        }
        const searchStr = [
          item.text || "",
          item.label || "",
          item.model || "",
          item.tier || "",
          item.type || "",
        ].join(" ").toLowerCase();
        return searchStr.includes(q);
      });
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filtered = filtered.filter(item => (item.timestamp || 0) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000;
      filtered = filtered.filter(item => (item.timestamp || 0) <= to);
    }
    const sorted = [...filtered].sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case "timestamp":
          valA = a.timestamp ?? 0;
          valB = b.timestamp ?? 0;
          break;
        case "text":
          valA = (a.text || (a.type === "batch" ? `batch ${a.total_rows}` : "")).toLowerCase();
          valB = (b.text || (b.type === "batch" ? `batch ${b.total_rows}` : "")).toLowerCase();
          break;
        case "label":
          if (a.type === "batch") {
            valA = a.fake_count > a.real_count ? "mostly fake" : a.real_count > a.fake_count ? "mostly real" : "mixed";
          } else {
            valA = a.label || "";
          }
          if (b.type === "batch") {
            valB = b.fake_count > b.real_count ? "mostly fake" : b.real_count > b.fake_count ? "mostly real" : "mixed";
          } else {
            valB = b.label || "";
          }
          break;
        case "confidence":
          if (a.type === "batch") {
            valA = a.results && a.results.length > 0
              ? a.results.reduce((s, r) => s + (r.confidence || 0), 0) / a.results.length
              : 0;
          } else {
            valA = a.confidence ?? 0;
          }
          if (b.type === "batch") {
            valB = b.results && b.results.length > 0
              ? b.results.reduce((s, r) => s + (r.confidence || 0), 0) / b.results.length
              : 0;
          } else {
            valB = b.confidence ?? 0;
          }
          break;
        case "model":
          valA = (a.model || "").toLowerCase();
          valB = (b.model || "").toLowerCase();
          break;
        case "type":
          valA = (a.type || "").toLowerCase();
          valB = (b.type || "").toLowerCase();
          break;
        default:
          valA = 0;
          valB = 0;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [history, debouncedQuery, sortField, sortDir, dateFrom, dateTo]);

  const filteredHistory = useMemo(() => {
    if (filterTab === "combined") return processedHistory;
    return processedHistory.filter(h => h.type === filterTab);
  }, [processedHistory, filterTab]);

  // Delete a single prediction by timestamp.
  const handleDelete = useCallback((timestamp) => {
    setHistory((prev) => prev.filter((item) => item.timestamp !== timestamp));
  }, []);

  // Delete a set of selected predictions at once.
  const handleDeleteMultiple = useCallback((timestamps) => {
    const ts = new Set(timestamps);
    setHistory((prev) => prev.filter((item) => !ts.has(item.timestamp)));
  }, []);

  // Clear all predictions except bookmarked ones.
  const handleClearAll = useCallback(() => {
    setHistory((prev) => prev.filter((item) => bookmarks.has(item.timestamp)));
  }, [bookmarks]);

  // Clear only single-type predictions (keeps batch and bookmarks).
  const handleClearSingle = useCallback(() => {
    setHistory((prev) => prev.filter((item) => bookmarks.has(item.timestamp) || item.type !== "single"));
  }, [bookmarks]);

  // Clear only batch-type predictions (keeps singles and bookmarks).
  const handleClearBatch = useCallback(() => {
    setHistory((prev) => prev.filter((item) => bookmarks.has(item.timestamp) || item.type !== "batch"));
  }, [bookmarks]);

  const handleSortChange = useCallback((field) => {
    if (field === sortField) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(0);
  }, [sortField]);

  const handleRevisit = useCallback((item) => {
    navigate("/result", { state: item });
  }, [navigate]);

  const handlePageChange = useCallback((_, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleFileImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!Array.isArray(parsed)) {
          alert("Invalid file: expected an array of prediction records.");
          return;
        }
        const valid = parsed.every(item => item && typeof item.type === "string" && typeof item.timestamp === "number");
        if (!valid) {
          alert("Invalid file: each record must have a 'type' field and a 'timestamp' field.");
          return;
        }
        setImportData(parsed);
        setImportDialogOpen(true);
      } catch {
        alert("Invalid file: could not parse JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  // Confirm the import — either merge with existing history or replace it entirely.
  const handleImportConfirm = useCallback(() => {
    if (!importData) return;
    setHistory(prev => {
      if (importMode === "replace") {
        setImportSnackbar(`Imported ${importData.length} records (replaced all)`);
        return importData;
      }
      const existingTimestamps = new Set(prev.map(item => item.timestamp));
      const filtered = importData.filter(item => !existingTimestamps.has(item.timestamp));
      setImportSnackbar(`Imported ${filtered.length} new records`);
      return [...filtered, ...prev];
    });
    setImportDialogOpen(false);
    setImportData(null);
    setImportMode("merge");
  }, [importData, importMode]);

  return (
    <Box>
      <Stack spacing={3}>
        {history.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>📭</Typography>
            <Typography variant="h5" fontWeight={600} sx={{ mb: 1, color: "text.primary" }}>
              No predictions yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Run a single or batch prediction to see your history here.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/predict")}>
              Go to Predict
            </Button>
          </Box>
        ) : (
        <>
        {/* File input hidden — triggered by the Import button below. */}
        <input type="file" accept=".json" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileImport} />
        {/* Toolbar — title, refresh, import/export menu, and tab filter toggle. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Typography variant="h3" sx={{
            background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
          }}>
            Prediction History
          </Typography>
          <Typography variant="caption" color="text.disabled"><RelativeTime timestamp={loadTimestamp} /></Typography>
          <Tooltip title="Refresh history">
            <IconButton size="small" onClick={() => {
              const stored = localStorage.getItem("prediction_history");
              if (stored) { try { setHistory(JSON.parse(stored)); } catch {} }
              setLoadTimestamp(Date.now());
            }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          {/* Import/Export menu — JSON import with merge/replace, JSON or CSV export. */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}>
              Import
            </Button>
            <Button size="small" variant="outlined" onClick={(e) => setExportAnchorEl(e.currentTarget)}>
              Export ▾
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={Boolean(exportAnchorEl)}
              onClose={() => setExportAnchorEl(null)}
            >
              <MenuItem onClick={() => {
                setExportAnchorEl(null);
                const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "prediction-history.json";
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
              }}>Export JSON</MenuItem>
              <MenuItem onClick={() => {
                setExportAnchorEl(null);
                const headers = ["timestamp","type","text","label","confidence","model","threshold","tier"];
                const escape = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
                const rows = history.map(item => [item.timestamp, item.type, escape(item.text || `batch ${item.total_rows}`), item.label || "", item.confidence ?? "", item.model || "", item.threshold ?? "", item.tier || ""].join(","));
                const csv = headers.join(",") + "\n" + rows.join("\n") + "\n";
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "prediction-history.csv";
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
              }}>Export CSV</MenuItem>
            </Menu>
          </Box>
          <ToggleButtonGroup
            value={filterTab}
            exclusive
            onChange={(_, v) => { if (v) { setFilterTab(v); setPage(0); } }}
            size="small"
          >
            <ToggleButton value="combined">Combined</ToggleButton>
            <ToggleButton value="single">Single</ToggleButton>
            <ToggleButton value="batch">Batch</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Date range filter and debounced search bar. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="From"
              type="date"
              size="small"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150 }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 150 }}
            />
          </Box>
          <TextField
            placeholder="Search by text, model, or confidence\u2026"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary", fontSize: 20 }} />,
              },
            }}
            sx={{ flex: 1, minWidth: { xs: 150, sm: 200 } }}
          />
          {debouncedQuery.trim() && (
            <Typography variant="caption" color={filteredHistory.length === 0 ? "warning.main" : "text.secondary"} sx={{ ml: 1 }}>
              {filteredHistory.length === 0
                ? "No predictions match your search"
                : `Showing ${filteredHistory.length} of ${history.length} results`}
            </Typography>
          )}
        </Box>

        <PredictionHistory
          title={filterTab === "combined" ? "All Predictions" : filterTab === "single" ? "Single Predictions" : "Batch Predictions"}
          history={filteredHistory}
          onDelete={handleDelete}
          onDeleteMultiple={handleDeleteMultiple}
          onClearAll={filterTab === "single" ? handleClearSingle : filterTab === "batch" ? handleClearBatch : handleClearAll}
          onRevisit={handleRevisit}
          sortField={sortField}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          showTypeColumn
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          bookmarks={bookmarks}
          onToggleBookmark={toggleBookmark}
        />
          {/* Import dialog — lets users merge or replace their history from a JSON file. */}
          <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
            <DialogTitle>Import Prediction History</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                Found {importData?.length || 0} records in the selected file.
              </DialogContentText>
              <RadioGroup value={importMode} onChange={(e) => setImportMode(e.target.value)}>
                <FormControlLabel value="merge" control={<Radio />} label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Merge</Typography>
                    <Typography variant="caption" color="text.secondary">Adds new records that don't already exist in your history.</Typography>
                  </Box>
                } />
                <FormControlLabel value="replace" control={<Radio />} label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Replace</Typography>
                    <Typography variant="caption" color="text.secondary">Completely replaces your current history with the imported data.</Typography>
                  </Box>
                } />
              </RadioGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setImportDialogOpen(false); setImportData(null); setImportMode("merge"); }}>Cancel</Button>
              <Button variant="contained" onClick={handleImportConfirm}>Import</Button>
            </DialogActions>
          </Dialog>
          <Snackbar open={!!importSnackbar} autoHideDuration={4000} onClose={() => setImportSnackbar(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
            <Alert severity="success" onClose={() => setImportSnackbar(null)}>{importSnackbar}</Alert>
          </Snackbar>
        </>
        )}
      </Stack>
    </Box>
  );
}
