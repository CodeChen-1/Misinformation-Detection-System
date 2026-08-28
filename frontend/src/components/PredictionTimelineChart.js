import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

// Format a timestamp as HH:MM for the X axis labels
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const PredictionTimelineChart = memo(function PredictionTimelineChart({ history = [] }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const axisColor = isDark ? '#A09BBF' : '#5A5490';
    const titleColor = isDark ? '#A09BBF' : '#4A4580';
    const tooltipBg = isDark ? 'rgba(13,11,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipText = isDark ? '#E8E6F0' : '#1A1433';
    const axisStroke = isDark ? 'rgba(124,77,255,0.2)' : 'rgba(124,77,255,0.35)';

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!history.length) return;

    // Pull last 50 predictions, sorted chronologically
    const data = history
      .map((h) => ({
        time: h.timestamp,
        label: h.label,
        confidence: h.confidence,
      }))
      .sort((a, b) => a.time - b.time)
      .slice(-50);

    const width = 800;
    const height = 455;
    const margin = { top: 30, right: 30, bottom: 135, left: 75 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const n = data.length;
    const xScale = d3.scaleLinear().domain([0, n - 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    const svgEl = svg.attr("viewBox", `0 0 ${width} ${height}`);
    const g = svgEl.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const tickVals = n > 1
      ? d3.ticks(0, n - 1, Math.min(n, 8)).map(Math.round)
      : [0];

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickValues(tickVals).tickFormat((d) => formatDate(data[d].time)))
      .selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "16px");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${Math.round(d * 100)}%`))
      .selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "16px");

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // Compute moving average for trend line
    const windowSize = Math.min(5, n);
    const trendData = data.map((d, i) => {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(n, i + Math.ceil(windowSize / 2));
      const slice = data.slice(start, end);
      const avg = slice.reduce((s, p) => s + p.confidence, 0) / slice.length;
      return { x: xScale(i), y: yScale(avg) };
    });

    // Trend line
    const lineGen = d3.line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(trendData)
      .attr("fill", "none")
      .attr("stroke", isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)')
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,3")
      .attr("d", lineGen)
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .attr("opacity", 1);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip")
      .style("position", "absolute")
      .style("background", tooltipBg)
      .style("color", tooltipText)
      .style("padding", "6px 10px")
      .style("border-radius", "6px")
      .style("font-size", "16px")
      .style("pointer-events", "none")
      .style("opacity", 0);

    data.forEach((d, i) => {
      const cx = xScale(i);
      const cy = yScale(d.confidence);
      const color = d.label === "fake" ? "#FF5252" : "#69F0AE";

      const dot = g
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 0)
        .attr("fill", color)
        .attr("opacity", 0.8);

      dot
        .transition()
        .delay(i * 5)
        .attr("r", 4);

      dot
        .on("mouseover", (event) => {
          d3.select(event.target).transition().duration(200).attr("r", 7);
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${d.label.toUpperCase()}</strong><br/>${formatDate(d.time)}<br/>${(d.confidence * 100).toFixed(1)}%`
            );
        })
        .on("mousemove", (event) => {
          tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
          d3.select(event.target).transition().duration(200).attr("r", 4);
          tooltip.style("opacity", 0);
        });
    });

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", titleColor)
      .attr("font-size", "18px")
      .text("Time");

    // Y axis label
    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", titleColor)
      .attr("font-size", "18px")
      .text("Confidence");

    const legendG = g.append("g")
      .attr("transform", `translate(0, ${innerHeight + 90})`);
    const legendData = [
      { label: "Real", color: "#69F0AE" },
      { label: "Fake", color: "#FF5252" },
      { label: "Trend", color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' },
    ];
    legendData.forEach((d, i) => {
      const item = legendG.append("g")
        .attr("transform", `translate(0, ${i * 24})`);
      if (d.label === "Trend") {
        item.append("line")
          .attr("x1", 0).attr("y1", 6)
          .attr("x2", 14).attr("y2", 6)
          .attr("stroke", d.color)
          .attr("stroke-width", 2.5)
          .attr("stroke-dasharray", "3,2");
      } else {
        item.append("circle").attr("r", 5).attr("cx", 7).attr("cy", 6)
          .attr("fill", d.color);
      }
      item.append("text")
        .attr("x", 22).attr("y", 10)
        .attr("fill", axisColor).attr("font-size", "16px")
        .text(d.label);
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [history, isDark]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 455"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", minHeight: 360 }}
    />
  );
});

export default PredictionTimelineChart;
