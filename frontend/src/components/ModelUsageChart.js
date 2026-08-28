import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const MODEL_LABELS = {
  hybrid: "Hybrid RF",
  logistic: "Logistic Reg",
  rf: "Random Forest",
};

const MODEL_COLORS = {
  hybrid: "#B47CFF",
  logistic: "#7C4DFF",
  rf: "#00BFA5",
};

const ModelUsageChart = memo(function ModelUsageChart({ history = [] }) {
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

    // Tally how many predictions each model handled
    const counts = {};
    history.forEach((h) => {
      const key = h.model || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    });

    // Sort by usage descending so the most-used model sits on top
    const data = Object.entries(counts)
      .map(([key, count]) => ({
        key,
        label: MODEL_LABELS[key] || key,
        count,
        color: MODEL_COLORS[key] || "#7C4DFF",
      }))
      .sort((a, b) => b.count - a.count);

    const total = history.length;

    const width = 600;
    const height = 360;
    const margin = { top: 30, right: 80, bottom: 30, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Horizontal bar chart — models on Y, count on X
    const yScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerHeight])
      .padding(0.3);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.count) * 1.2 || 1])
      .range([0, innerWidth]);

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

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "16px");

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "16px");

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // Animated horizontal bars with count label and percentage
    data.forEach((d) => {
      const pct = ((d.count / total) * 100).toFixed(1);
      const barWidth = xScale(d.count);

      const bar = g.append("rect")
        .attr("y", yScale(d.label))
        .attr("height", yScale.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .attr("fill", d.color)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("opacity", 0.85);

      bar.transition().duration(600).delay(100).attr("width", barWidth);

      bar.on("mouseover", (event) => {
        tooltip.style("opacity", 1).html(
          `<strong>${d.label}</strong><br/>${d.count} (${pct}%)`
        );
      }).on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
      }).on("mouseout", () => tooltip.style("opacity", 0));

      const labelX = barWidth < 40 ? barWidth + 6 : barWidth - 6;
      const labelAnchor = barWidth < 40 ? "start" : "end";

      g.append("text")
        .attr("x", labelX)
        .attr("y", yScale(d.label) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", labelAnchor)
        .attr("fill", barWidth < 40 ? titleColor : "#fff")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .text(d.count);

      g.append("text")
        .attr("x", barWidth + 8)
        .attr("y", yScale(d.label) + yScale.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", titleColor)
        .attr("font-size", "13px")
        .text(`${pct}%`);
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [history, isDark]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", minHeight: 360 }}
    />
  );
});

export default ModelUsageChart;
