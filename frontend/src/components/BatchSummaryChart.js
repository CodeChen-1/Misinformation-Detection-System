import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const COLORS = { real: "#69F0AE", fake: "#FF5252", error: "#FFD740" };

function normalizeLabel(label) {
  if (label == null) return "error";
  const str = String(label).toLowerCase();
  if (str === "real" || str === "0" || str === "true") return "real";
  if (str === "fake" || str === "1" || str === "false") return "fake";
  if (str === "error" || str === "unknown" || str === "null") return "error";
  const num = Number(label);
  if (!isNaN(num)) return num === 0 ? "real" : num === 1 ? "fake" : "error";
  return "error";
}

const BatchSummaryChart = memo(function BatchSummaryChart({ results, threshold = 0.5 }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const axisColor = isDark ? '#A09BBF' : '#5A5490';
    const tooltipBg = isDark ? 'rgba(13,11,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipText = isDark ? '#E8E6F0' : '#1A1433';

    if (!results || !Array.isArray(results) || results.length === 0) return;

    // Count Real / Fake / Error from batch results
    const counts = { real: 0, fake: 0, error: 0 };
    results.forEach((r) => {
      const key = normalizeLabel(r.label);
      if (key in counts) counts[key]++;
      else counts.error++;
    });

    const total = results.length;
    const chartData = [
      { category: "Real", key: "real", count: counts.real },
      { category: "Fake", key: "fake", count: counts.fake },
      { category: "Errors", key: "error", count: counts.error },
    ].filter((d) => d.count > 0);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 500;
    const height = 340;
    const margin = { top: 30, right: 30, bottom: 100, left: 75 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const maxCount = d3.max(chartData, (d) => d.count) || 1;

    const xScale = d3
      .scaleBand()
      .domain(chartData.map((d) => d.category))
      .range([0, innerWidth])
      .padding(0.25);

    const yScale = d3.scaleLinear().domain([0, maxCount]).range([innerHeight, 0]).nice();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);



    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .attr("color", axisColor)
      .style("font-size", "16px");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(Math.min(maxCount, 6)))
      .attr("color", axisColor)
      .style("font-size", "16px");

    // Y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 14)
      .attr("text-anchor", "middle")
      .attr("fill", axisColor)
      .attr("font-size", "14px")
      .text("Count");

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background", tooltipBg)
      .style("color", tooltipText)
      .style("border", "1px solid rgba(124, 77, 255, 0.3)")
      .style("borderRadius", "8px")
      .style("padding", "8px 14px")
      .style("fontSize", "13px")
      .style("fontWeight", 500)
      .style("pointerEvents", "none")
      .style("opacity", 0)
      .style("zIndex", 1000);

    // Bars
    g.selectAll("rect")
      .data(chartData)
      .join("rect")
      .attr("x", (d) => xScale(d.category))
      .attr("y", innerHeight)
      .attr("width", xScale.bandwidth())
      .attr("height", 0)
      .attr("fill", (d) => COLORS[d.key] || "#B47CFF")
      .attr("rx", 4)
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(200).attr("opacity", 0.85);
        tooltip.style("opacity", 1).html(
          `<strong>${d.category}</strong><br/>Count: ${d.count}<br/>` +
            `Percentage: ${((d.count / total) * 100).toFixed(1)}%`
        );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(200).attr("opacity", 1);
        tooltip.style("opacity", 0);
      })
      .transition()
      .duration(600)
      .ease(d3.easeCubicOut)
      .attr("y", (d) => yScale(d.count))
      .attr("height", (d) => innerHeight - yScale(d.count));

    // Value labels on bars
    g.selectAll(".bar-label")
      .data(chartData)
      .join("text")
      .attr("class", "bar-label")
      .attr("x", (d) => xScale(d.category) + xScale.bandwidth() / 2)
      .attr("y", (d) => yScale(d.count) - 8)
      .attr("text-anchor", "middle")
      .attr("fill", "#1a1a2e")
      .attr("font-size", "15px")
      .attr("font-weight", 600)
      .text((d) => d.count);



    const legendG = g.append("g")
      .attr("transform", `translate(0, ${innerHeight + 65})`);
    const legendData = [
      { label: "Real", color: "#69F0AE" },
      { label: "Fake", color: "#FF5252" },
    ];
    legendData.forEach((d, i) => {
      const item = legendG.append("g")
        .attr("transform", `translate(0, ${i * 24})`);
      item.append("rect")
        .attr("width", 12).attr("height", 12).attr("rx", 3)
        .attr("fill", d.color);
      item.append("text")
        .attr("x", 18).attr("y", 11)
        .attr("fill", axisColor).attr("font-size", "16px")
        .text(d.label);
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [results, isDark]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 500 380"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
});

export default BatchSummaryChart;