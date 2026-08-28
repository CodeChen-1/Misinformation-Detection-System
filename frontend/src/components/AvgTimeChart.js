import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const MODEL_COLORS = {
  "Logistic Regression": "#7C4DFF",
  "Random Forest": "#00BFA5",
  "Hybrid RF": "#FFD54F",
};

const AvgTimeChart = memo(function AvgTimeChart({ history = [] }) {
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

    // Aggregate average processing time per model
    const byModel = {};
    history.forEach(h => {
      if (!h.model || h.processing_time_ms == null) return;
      if (!byModel[h.model]) byModel[h.model] = { total: 0, count: 0 };
      byModel[h.model].total += h.processing_time_ms;
      byModel[h.model].count += 1;
    });

    const data = Object.entries(byModel)
      .filter(([, v]) => v.count > 0)
      .map(([model, v]) => ({
        model: model === "Hybrid Random Forest" ? "Hybrid RF" : model,
        avg: parseFloat((v.total / v.count).toFixed(1)),
      }))
      .sort((a, b) => b.avg - a.avg);

    if (!data.length) return;

    const width = 800;
    const height = 440;
    const margin = { top: 40, right: 80, bottom: 120, left: 75 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.model))
      .range([0, innerWidth])
      .padding(0.4);

    const maxVal = d3.max(data, (d) => d.avg) * 1.2 || 1;
    const yScale = d3.scaleLinear().domain([0, maxVal]).range([innerHeight, 0]);

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
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "16px");

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("fill", axisColor)
      .attr("font-size", "16px");

    data.forEach((d) => {
      const x = xScale(d.model) + xScale.bandwidth() / 2;
      const y = yScale(d.avg);
      const color = MODEL_COLORS[d.model] || "#7C4DFF";

      // Lollipop stem — vertical line from baseline to dot
      g.append("line")
        .attr("x1", x)
        .attr("y1", innerHeight)
        .attr("x2", x)
        .attr("y2", innerHeight)
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("opacity", 0.4)
        .transition()
        .duration(500)
        .attr("y2", y);

      // Lollipop dot — circle on the stem, animated up from baseline
      const dot = g.append("circle")
        .attr("cx", x)
        .attr("cy", innerHeight)
        .attr("r", 0)
        .attr("fill", color)
        .attr("stroke", "#0D0B1E")
        .attr("stroke-width", 1.5);

      dot.transition().duration(500).delay(200).attr("cy", y).attr("r", 7);

      dot.on("mouseover", (event) => {
        d3.select(event.target).transition().duration(200).attr("r", 10);
        tooltip.style("opacity", 1).html(`<strong>${d.model}</strong><br/>Avg: ${d.avg} ms`);
      }).on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
      }).on("mouseout", (event) => {
        d3.select(event.target).transition().duration(200).attr("r", 7);
        tooltip.style("opacity", 0);
      });

      // Value label
      g.append("text")
        .attr("x", x + 14)
        .attr("y", y + 4)
        .attr("fill", titleColor)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(`${d.avg}ms`);
    });

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", titleColor)
      .attr("font-size", "18px")
      .text("Model");

    // Y axis label
    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", titleColor)
      .attr("font-size", "18px")
      .text("Avg Time (ms)");

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

export default AvgTimeChart;
