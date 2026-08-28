import { useRef, useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from "@mui/material";
import { BarChart, PieChart } from "@mui/icons-material";

// Splits raw CSV text into an array of objects keyed by the header row.
function parseCSV(text) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    if (values.length >= 1 && values.length <= headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
      rows.push(row);
    }
  }
  return rows;
}

// Computes row count, column stats, categorical value distributions, text lengths, and missing-value counts.
function analyze(rows, textColumn) {
  if (!rows || rows.length === 0) return null;
  const columns = Object.keys(rows[0]);
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    categorical: columns
      .filter((col) => col !== textColumn)
      .map((col) => {
        const counts = {};
        let unique = 0;
        for (const r of rows) {
          const v = (r[col] ?? "").toString().trim();
          if (v === "") continue;
          if (!counts[v]) { counts[v] = 0; unique++; }
          counts[v]++;
        }
        if (unique < 2 || unique > 20) return null;
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return { name: col, values: counts, total };
      })
      .filter(Boolean),
    textColumn,
    textLengths: rows.map((r) => (r[textColumn] ?? "").toString().length),
    missing: columns.map((col) => ({
      name: col,
      count: rows.filter((r) => !r[col] || r[col].toString().trim() === "").length,
    })),
  };
}

const COLORS = d3.schemeSet3;

function countBins(values, binCount = 10) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0,
  }));
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
    bins[idx].count++;
  }
  return bins;
}

// D3 horizontal bar chart — shows value counts for a categorical column.
function CategoricalChart({ data, total }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const axisColor = isDark ? "#A09BBF" : "#5A5490";
  const textColor = isDark ? "#E8E6F0" : "#1A1A2E";
  const strokeColor = isDark ? "#000000" : "#FFFFFF";

  const sorted = useMemo(() => Object.entries(data.values).sort((a, b) => b[1] - a[1]), [data]);

  useEffect(() => {
    if (sorted.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 480;
    const height = Math.max(40 * sorted.length + 40, 80);
    const margin = { top: 20, right: 80, bottom: 20, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxVal = sorted[0][1];
    const xScale = d3.scaleLinear().domain([0, maxVal]).range([0, innerWidth]);
    const yScale = d3
      .scaleBand()
      .domain(sorted.map((d) => d[0]))
      .range([0, innerHeight])
      .padding(0.3);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", axisColor);

    g.selectAll("rect")
      .data(sorted)
      .join("rect")
      .attr("y", (d) => yScale(d[0]))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", 0)
      .attr("fill", (_, i) => COLORS[i % COLORS.length])
      .attr("rx", 3)
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr("width", (d) => xScale(d[1]));

    g.selectAll(".bar-pct")
      .data(sorted)
      .join("text")
      .attr("class", "bar-pct")
      .attr("x", (d) => xScale(d[1]) + 6)
      .attr("y", (d) => yScale(d[0]) + yScale.bandwidth() / 2 + 4)
      .attr("fill", textColor)
      .attr("stroke", strokeColor)
      .attr("stroke-width", 0.5)
      .attr("font-size", "11px")
      .text((d) => `${d[1]} (${((d[1] / total) * 100).toFixed(1)}%)`);

    return () => svg.selectAll("*").remove();
  }, [sorted, total, axisColor, strokeColor, textColor]);

  if (sorted.length === 0) return null;
  const height = Math.max(40 * sorted.length + 40, 80);
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 480 ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", display: "block" }}
    />
  );
}

// D3 donut chart — alternative view for categorical distributions.
function DonutChart({ data, total }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const textColor = isDark ? "#E8E6F0" : "#1A1A2E";
  const strokeColor = isDark ? "#000000" : "#FFFFFF";

  const sorted = useMemo(() => Object.entries(data.values).sort((a, b) => b[1] - a[1]), [data]);

  useEffect(() => {
    if (sorted.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 480;
    const height = 300;
    const radius = Math.min(width, height) / 2 - 40;

    const pie = d3.pie().value((d) => d[1]).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);
    const labelArc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.6);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const arcs = g
      .selectAll(".arc")
      .data(pie(sorted))
      .join("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("d", arc)
      .attr("fill", (_, i) => COLORS[i % COLORS.length])
      .attr("stroke", "#1a1a2e")
      .attr("stroke-width", 1)
      .transition()
      .duration(500)
      .attrTween("d", function (d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t) => arc(interpolate(t));
      });

    arcs
      .append("text")
      .attr("transform", (d) => {
        const [x, y] = labelArc.centroid(d);
        return `translate(${x},${y})`;
      })
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .attr("font-size", "11px")
      .attr("stroke", strokeColor)
      .attr("stroke-width", 0.5)
      .text((d) => `${d.data[0]} (${((d.data[1] / total) * 100).toFixed(1)}%)`);

    return () => svg.selectAll("*").remove();
  }, [sorted, total, strokeColor, textColor]);

  if (sorted.length === 0) return null;
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 480 300"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", display: "block" }}
    />
  );
}

// D3 histogram — bins text lengths so you can see the character-count spread at a glance.
function TextLengthChart({ lengths }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const axisColor = isDark ? "#A09BBF" : "#5A5490";
  const textColor = isDark ? "#E8E6F0" : "#1A1A2E";

  useEffect(() => {
    if (!lengths || lengths.length === 0) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const bins = countBins(lengths, 10);
    const width = 480;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const maxCount = d3.max(bins, (b) => b.count) || 1;
    const xScale = d3
      .scaleBand()
      .domain(bins.map((_, i) => i))
      .range([0, innerW])
      .padding(0.1);
    const yScale = d3.scaleLinear().domain([0, maxCount]).range([innerH, 0]).nice();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat((i) => `${bins[i].start.toFixed(0)}-${bins[i].end.toFixed(0)}`)
      )
      .attr("color", axisColor)
      .style("font-size", "10px")
      .selectAll("text")
      .attr("transform", "rotate(-30)")
      .style("text-anchor", "end");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", axisColor)
      .style("font-size", "10px");

    g.selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", (_, i) => xScale(i))
      .attr("y", innerH)
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", "#7C4DFF")
      .attr("rx", 2)
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => innerH - yScale(d.count));

    g.selectAll(".bar-val")
      .data(bins)
      .join("text")
      .attr("class", "bar-val")
      .attr("x", (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.count) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", textColor)
      .attr("font-size", "10px")
      .text((d) => d.count);

    return () => svg.selectAll("*").remove();
  }, [lengths, axisColor, textColor]);

  if (!lengths || lengths.length === 0) return null;
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", display: "block" }}
    />
  );
}

// CSV preview with row/column stats, categorical charts, and text-length distribution — helps users explore their dataset before running predictions.
export default function DataExplorer({ csvText, textColumn }) {
  const rows = useMemo(() => (csvText ? parseCSV(csvText) : []), [csvText]);
  const analysis = useMemo(() => analyze(rows, textColumn), [rows, textColumn]);

  const [selectedCol, setSelectedCol] = useState("");
  const [chartType, setChartType] = useState("bar");

  useEffect(() => {
    if (analysis?.categorical?.length > 0 && !selectedCol) {
      setSelectedCol(analysis.categorical[0].name);
    }
  }, [analysis, selectedCol]);

  if (!analysis || analysis.rowCount === 0) return null;

  const currentCat = analysis.categorical.find((c) => c.name === selectedCol);
  const catEntries = currentCat ? Object.entries(currentCat.values) : [];
  const sortedByCount = [...catEntries].sort((a, b) => b[1] - a[1]);
  const mostCommon = sortedByCount.length > 0 ? sortedByCount[0] : null;
  const leastCommon = sortedByCount.length > 0 ? sortedByCount[sortedByCount.length - 1] : null;

  return (
    <Stack spacing={2}>
      {/* Dataset overview — shows row/column counts, column names, and missing-value breakdown */}
      <Card variant="outlined" sx={{ bgcolor: "rgba(124, 77, 255, 0.05)", borderColor: "rgba(124, 77, 255, 0.2)" }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={600}>
              Dataset Overview
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
              <Chip label={`${analysis.rowCount} rows`} color="primary" variant="outlined" size="small" />
              <Chip label={`${analysis.columnCount} columns`} color="info" variant="outlined" size="small" />
              {analysis.missing.filter((m) => m.count > 0).length > 0 && (
                <Chip
                  label={`${analysis.missing.filter((m) => m.count > 0).length} columns with missing values`}
                  color="warning"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Columns: {analysis.columns.join(", ")}
            </Typography>
            {analysis.missing.filter((m) => m.count > 0).length > 0 && (
              <Box>
                <Typography variant="caption" color="warning.main" fontWeight={500}>
                  Missing values:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mt: 0.5 }}>
                  {analysis.missing.filter((m) => m.count > 0).map((m) => (
                    <Chip
                      key={m.name}
                      label={`${m.name}: ${m.count} (${((m.count / analysis.rowCount) * 100).toFixed(1)}%)`}
                      size="small"
                      color="default"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Data distributions — pick a column and toggle between bar / pie chart to see how values are spread */}
      <Card variant="outlined" sx={{ borderColor: "rgba(105, 240, 174, 0.2)" }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Data Distributions
          </Typography>
          {analysis.categorical.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No categorical columns to visualize.
            </Typography>
          ) : (
            <>
              <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: "center" }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Column</InputLabel>
                  <Select
                    value={selectedCol}
                    label="Column"
                    onChange={(e) => setSelectedCol(e.target.value)}
                  >
                    {analysis.categorical.map((cat) => (
                      <MenuItem key={cat.name} value={cat.name}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={(_, val) => val && setChartType(val)}
                  size="small"
                >
                  <ToggleButton value="bar">
                    <BarChart />
                  </ToggleButton>
                  <ToggleButton value="pie">
                    <PieChart />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              {currentCat && (
                <Box>
                  {chartType === "bar" ? (
                    <CategoricalChart data={currentCat} total={currentCat.total} />
                  ) : (
                    <DonutChart data={currentCat} total={currentCat.total} />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Unique values: {catEntries.length}
                    {mostCommon && ` | Most common: ${mostCommon[0]} (${mostCommon[1]})`}
                    {leastCommon && ` | Least common: ${leastCommon[0]} (${leastCommon[1]})`}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Text length distribution — histogram of character counts, plus min / max / avg stats */}
      {analysis.textLengths.length > 0 && (
        <Card variant="outlined" sx={{ borderColor: "rgba(124, 77, 255, 0.2)" }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Text Length Distribution
            </Typography>
            <TextLengthChart lengths={analysis.textLengths} />
            <Typography variant="caption" color="text.secondary">
              Characters in &ldquo;{textColumn}&rdquo; column &mdash; min: {Math.min(...analysis.textLengths)}, max: {Math.max(...analysis.textLengths)}, avg: {(analysis.textLengths.reduce((a, b) => a + b, 0) / analysis.textLengths.length).toFixed(0)}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
