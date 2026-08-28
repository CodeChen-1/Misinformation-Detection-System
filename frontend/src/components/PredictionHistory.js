import { useState, memo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Button,
  Collapse,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
  Checkbox,
  TablePagination,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import HistoryIcon from "@mui/icons-material/History";

// Checks whether a history entry (single or batch) is flagged as fake.
function isFakeEntry(item) {
  if (item.type === "batch") return item.fake_count > 0;
  return item.label === "fake";
}

const MODEL_DISPLAY = {
  hybrid: "Hybrid RF",
  rf: "RF",
  logistic: "Logistic Regression",
};

// Maps a raw confidence score to a human-readable tier label.
function getConfidenceTier(confidence, threshold = 0.5) {
  if (confidence >= 0.9) return "Highly";
  if (confidence >= 0.7) return "Likely";
  return "Possibly";
}

const PredictionHistory = memo(function PredictionHistory({ history = [], onDelete, onDeleteMultiple, onClearAll, onRevisit, title, sortField, sortDir, onSortChange, showTypeColumn = false, page = 0, rowsPerPage = 15, onPageChange, onRowsPerPageChange, bookmarks, onToggleBookmark }) {
  const [deleteItem, setDeleteItem] = useState(null);

  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedTimestamps, setSelectedTimestamps] = useState(new Set());
  const [showAllRows, setShowAllRows] = useState(false);
  const handleDeleteLocal = useCallback((timestamps) => {
    const nonBookmarked = timestamps.filter(t => !bookmarks?.has(t));
    if (nonBookmarked.length > 0) {
      onDeleteMultiple?.(nonBookmarked);
      setSelectedTimestamps(new Set());
    }
  }, [onDeleteMultiple, bookmarks]);

  // Empty state — show a friendly message when there's no history yet.
  if (history.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <HistoryIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
        <Typography color="text.secondary">No predictions yet</Typography>
      </Box>
    );
  }

  const allSelected = history.length > 0 && selectedTimestamps.size === history.length;

  // Select / deselect all rows — powers the multi-delete flow.
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedTimestamps(new Set());
    } else {
      setSelectedTimestamps(new Set(history.map(h => h.timestamp)));
    }
  };

  // Toggle a single row's checkbox in the selection set.
  const handleSelectOne = (timestamp) => {
    const next = new Set(selectedTimestamps);
    if (next.has(timestamp)) {
      next.delete(timestamp);
    } else {
      next.add(timestamp);
    }
    setSelectedTimestamps(next);
  };

  const pageStart = page * rowsPerPage;
  const pageEnd = pageStart + rowsPerPage;
  const visibleHistory = showAllRows ? history : history.slice(pageStart, pageEnd);

  return (
    <>
      {/* Toolbar — show-all toggle, expand/collapse all rows, and multi-delete button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        {title && <Typography variant="h6" fontWeight={600} sx={{ background: "linear-gradient(135deg, #B47CFF 0%, #7C4DFF 40%, #5DF2D6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</Typography>}
        {!title && <Box />}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {history.length > 15 && (
            <Button variant="outlined" size="small" onClick={() => setShowAllRows(!showAllRows)}>
              {showAllRows ? "Show less" : "Show All"}
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={() => {
            if (expandedRow !== null) {
              setExpandedRow(null);
            } else {
              setExpandedRow("all");
            }
          }} sx={(theme) => ({
            borderColor: theme.palette.mode === "dark" ? theme.palette.primary.light : "#7C4DFF",
            color: theme.palette.mode === "dark" ? "#FFFFFF" : "#7C4DFF",
            backgroundColor: theme.palette.mode === "dark" ? theme.palette.primary.main : "transparent",
            "&:hover": {
              borderColor: theme.palette.mode === "dark" ? theme.palette.primary.main : "#B47CFF",
              backgroundColor: theme.palette.mode === "dark" ? theme.palette.primary.dark : "rgba(124,77,255,0.08)",
            },
          })}>
            {expandedRow !== null ? "Collapse All" : "Expand All"}
          </Button>
          {onClearAll && (
            <Button variant="outlined" color="error" size="small" onClick={() => {
              if (selectedTimestamps.size > 0) {
                handleDeleteLocal([...selectedTimestamps]);
              } else {
                onClearAll();
              }
            }}>
              {selectedTimestamps.size > 0 ? `Delete Selected (${selectedTimestamps.size})` : "Delete All"}
            </Button>
          )}
        </Box>
      </Box>
      {/* Sortable table — column headers toggle sort field/direction, arrow indicator shows active sort */}
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto", overflowY: "visible" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, px: 0.5 }}>
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={selectedTimestamps.size > 0 && !allSelected}
                  onChange={handleSelectAll}
                  sx={{ p: 0.5 }}
                />
              </TableCell>
              <TableCell sx={{ width: 55, whiteSpace: "nowrap", cursor: "pointer", userSelect: "none" }} onClick={() => onSortChange?.("timestamp")}>
                # {sortField === "timestamp" && (sortDir === "asc" ? " \u2191" : " \u2193")}
              </TableCell>
              <TableCell sx={{ width: 250, cursor: "pointer", userSelect: "none" }} onClick={() => onSortChange?.("text")}>
                Text / Summary {sortField === "text" && (sortDir === "asc" ? " \u2191" : " \u2193")}
              </TableCell>
              {showTypeColumn && <TableCell sx={{ width: 80, cursor: "pointer", userSelect: "none" }} onClick={() => onSortChange?.("type")}>
                Type {sortField === "type" && (sortDir === "asc" ? " \u2191" : " \u2193")}
              </TableCell>}
              <TableCell sx={{ whiteSpace: "nowrap", width: 80, cursor: "pointer", userSelect: "none" }} onClick={() => onSortChange?.("label")}>
                Label {sortField === "label" && (sortDir === "asc" ? " \u2191" : " \u2193")}
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap", width: 120, cursor: "pointer", userSelect: "none" }} onClick={() => onSortChange?.("confidence")}>
                Confidence {sortField === "confidence" && (sortDir === "asc" ? " \u2191" : " \u2193")}
              </TableCell>
              <TableCell sx={{ minWidth: 80, cursor: "pointer", userSelect: "none" }} onClick={() => onSortChange?.("model")}>
                Model {sortField === "model" && (sortDir === "asc" ? " \u2191" : " \u2193")}
              </TableCell>
              <TableCell align="right" sx={{ width: 60 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleHistory.map((item, i) => {
              const fake = isFakeEntry(item);
              const expanded = expandedRow === "all" || expandedRow === i;

              return (
              <TableRow
                key={item.timestamp || item.text || i}
                hover
                sx={{
                  cursor: "pointer",
                  backgroundColor: fake
                    ? "rgba(255, 82, 82, 0.08)"
                    : "rgba(105, 240, 174, 0.08)",
                  "&:hover": { backgroundColor: fake ? "rgba(255, 82, 82, 0.14)" : "rgba(105, 240, 174, 0.14)" },
                }}
                onClick={() => {
                  if (item.type === "batch") {
                    onRevisit?.({
                      type: "batch",
                      batchResult: {
                        total_rows: item.total_rows,
                        results: item.results ?? [],
                        model_used: MODEL_DISPLAY[item.model] || item.model,
                        threshold: item.threshold,
                        processing_time_ms: (item.results ?? []).reduce((s, r) => s + (r.processing_time_ms || 0), 0),
                      },
                      model: item.model,
                      threshold: item.threshold,
                    });
                  } else {
                    onRevisit?.({
                      type: "single",
                      text: item.text,
                      model: item.model,
                      threshold: item.threshold,
                      ...item,
                    });
                  }
                }}
              >
                  <TableCell sx={{ width: 40, px: 0.5 }}>
                    <Checkbox
                      size="small"
                      checked={selectedTimestamps.has(item.timestamp)}
                      onChange={() => {
                        handleSelectOne(item.timestamp);
                        if (expandedRow === "all") return;
                        setExpandedRow(expanded ? null : i);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      sx={{ p: 0.5 }}
                    />
                  </TableCell>
                  <TableCell sx={{ width: 40 }}>
                    <Typography variant="body2" color="text.secondary">
                      {i + 1}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ maxWidth: 220, overflow: "hidden" }}>
                    {item.type === "batch" ? (
                      <>
                        <Typography variant="body2" fontWeight={600}>
                          Batch: {item.total_rows} rows{item.column_count != null ? ` · ${item.column_count} cols` : ""}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                          <Chip label={`${item.real_count} Real`} size="small" color="success" variant="outlined" />
                          <Chip label={`${item.fake_count} Fake`} size="small" color="error" variant="outlined" />
                          {item.error_count > 0 && (
                            <Chip label={`${item.error_count} Error`} size="small" color="warning" variant="outlined" />
                          )}
                        </Box>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {item.text?.length ?? 0} chars
                      </Typography>
                    )}

                    {item.type === "batch" ? (
                      <Collapse in={expanded}>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                            Individual Results
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ py: 0.5, px: 0.5 }}>#</TableCell>
                                <TableCell sx={{ py: 0.5, px: 0.5 }}>Text</TableCell>
                                <TableCell sx={{ py: 0.5, px: 0.5 }}>Label</TableCell>
                                <TableCell sx={{ py: 0.5, px: 0.5 }}>Confidence</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {(item.results ?? []).slice(0, 50).map((r, ri) => (
                                <TableRow key={ri} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                                  <TableCell sx={{ py: 0.3, px: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">{ri + 1}</Typography>
                                  </TableCell>
                                  <TableCell sx={{ py: 0.3, px: 0.5, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    <Tooltip title={r.text ?? ""}>
                                      <Typography variant="caption">
                                        {(r.text ?? "").length > 40 ? (r.text ?? "").slice(0, 40) + "\u2026" : (r.text ?? "")}
                                      </Typography>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell sx={{ py: 0.3, px: 0.5 }}>
                                    <Chip
                                      label={r.label ?? "—"}
                                      size="small"
                                      color={r.label === "fake" ? "error" : r.label === "real" ? "success" : "default"}
                                      variant="outlined"
                                      sx={{ height: 20, "& .MuiChip-label": { fontSize: 10, px: 0.5 } }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ py: 0.3, px: 0.5 }}>
                                    <Typography variant="caption">
                                      {r.confidence != null ? (r.confidence * 100).toFixed(1) + "%" : "—"}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    ) : (
                      <Collapse in={expanded}>
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "action.hover", borderRadius: 2 }}>
                          <Typography variant="caption" sx={{ lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {item.text ?? ""}
                          </Typography>
                        </Box>
                      </Collapse>
                    )}
                  </TableCell>

                  {showTypeColumn && (
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Chip
                        label={item.type === "batch" ? "Batch" : "Single"}
                        size="small"
                        variant="outlined"
                        color={item.type === "batch" ? "info" : "default"}
                        sx={{ height: 20, "& .MuiChip-label": { fontSize: 10 } }}
                      />
                    </TableCell>
                  )}

                  {item.type === "batch" ? (
                    <>
                      <TableCell
                        sx={{
                          color: item.fake_count > item.real_count ? "error.main" : "success.main",
                          fontWeight: 600, whiteSpace: "nowrap", width: 130,
                        }}
                      >
                        {item.fake_count > item.real_count ? "Mostly Fake" : item.real_count > item.fake_count ? "Mostly Real" : "Mixed"}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", width: 120 }}>
                        {item.results && item.results.length > 0
                          ? (() => {
                              const avg = item.results.reduce((s, r) => s + (r.confidence || 0), 0) / item.results.length;
                              const tier = getConfidenceTier(avg);
                              return `${tier} (${(avg * 100).toFixed(1)}%)`;
                            })()
                          : "—"}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell
                        sx={{
                          color: isFakeEntry(item) ? "error.main" : "success.main",
                          fontWeight: 600, whiteSpace: "nowrap", width: 130,
                        }}
                      >
                        {getConfidenceTier(item.confidence, item.threshold)} {item.label === "fake" ? "Fake" : "Real"}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", width: 120 }}>
                        {item.confidence != null ? (item.confidence * 100).toFixed(1) + "%" : "—"}
                      </TableCell>
                    </>
                  )}

                  <TableCell sx={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                    {MODEL_DISPLAY[item.model] || item.model}
                  </TableCell>

                  <TableCell align="right" sx={{ width: 60, whiteSpace: "nowrap" }}>
                    {onToggleBookmark && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onToggleBookmark(item.timestamp); }} sx={{ color: bookmarks?.has(item.timestamp) ? "#FFB300" : "text.disabled" }}>
                        {bookmarks?.has(item.timestamp) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    )}
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination controls — only shown when the table has more rows than the current page limit */}
      {!showAllRows && history.length > rowsPerPage && onPageChange && (
        <TablePagination
          component="div"
          count={history.length}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[10, 15, 25, 50]}
        />
      )}

      {/* Delete confirmation — blocks deletion if the entry is bookmarked (must un-bookmark first) */}
      <Dialog open={deleteItem != null} onClose={() => setDeleteItem(null)}>
        <DialogTitle>Delete entry?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This cannot be undone.
            {bookmarks?.has(deleteItem?.timestamp) && (
              <Box component="span" sx={{ display: "block", mt: 1, color: "warning.main" }}>
                ⚠ This entry is bookmarked. Remove the bookmark to delete it.
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItem(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={bookmarks?.has(deleteItem?.timestamp)}
            onClick={() => {
              onDelete?.(deleteItem.timestamp);
              setDeleteItem(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>



    </>
  );
});

export default PredictionHistory;
