import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const MODEL_CONFIG = {
  "Logistic Regression": { color: "#7C4DFF", label: "Logistic Regression" },
  "Random Forest": { color: "#00BFA5", label: "Random Forest" },
  "Hybrid Random Forest": { color: "#FFD54F", label: "Hybrid RF" },
};

const ROCCurveChart = memo(function ROCCurveChart({ data }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const axisColor = isDark ? '#A09BBF' : '#5A5490';
    const titleColor = isDark ? '#A09BBF' : '#4A4580';
    const tooltipBg = isDark ? 'rgba(13,11,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipText = isDark ? '#E8E6F0' : '#1A1433';
    const axisStroke = isDark ? 'rgba(124,77,255,0.2)' : 'rgba(124,77,255,0.35)';

    if (!data || typeof data !== "object" || Object.keys(data).length === 0)
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // SVG canvas sized for one ROC curve per model
    const width = 820;
    const height = 455;
    const margin = { top: 20, right: 20, bottom: 195, left: 115 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Diagonal reference line
    g.append("line")
      .attr("x1", xScale(0))
      .attr("y1", yScale(0))
      .attr("x2", xScale(1))
      .attr("y2", yScale(1))
      .attr("stroke", isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "6,4");

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

    // Lines
    const models = Object.keys(data);

    models.forEach((modelKey) => {
      const config = MODEL_CONFIG[modelKey] || {
        color: "#7C4DFF",
        label: modelKey,
      };
      const modelData = data[modelKey];
      if (!modelData || !modelData.fpr || !modelData.tpr) return;

      const points = modelData.fpr.map((fpr, i) => ({
        fpr,
        tpr: modelData.tpr[i],
      }));

      points.sort((a, b) => a.fpr - b.fpr);

      const lineGen = d3
        .line()
        .x((d) => xScale(d.fpr))
        .y((d) => yScale(d.tpr))
        .curve(d3.curveMonotoneX);

      // Line area
      g.append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", config.color)
        .attr("stroke-width", 2.5)
        .attr("d", lineGen);

      g.selectAll(`.dot-${modelKey.replace(/\s+/g, "")}`)
        .data(points)
        .join("circle")
        .attr("cx", (d) => xScale(d.fpr))
        .attr("cy", (d) => yScale(d.tpr))
        .attr("r", 0)
        .attr("fill", config.color)
        .on("mouseover", (event, d) => {
          d3.select(event.target).transition().duration(200).attr("r", 5);
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${config.label}</strong><br/>` +
                `FPR: ${d.fpr.toFixed(3)}<br/>` +
                `TPR: ${d.tpr.toFixed(3)}`
            );
        })
        .on("mousemove", (event) => {
          tooltip
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
          d3.select(event.target).transition().duration(200).attr("r", 0);
          tooltip.style("opacity", 0);
        });
    });

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".0%")))
      .selectAll("text")
      .attr("font-size", "24px")
      .attr("fill", axisColor);

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(".0%")))
      .selectAll("text")
      .attr("font-size", "24px")
      .attr("fill", axisColor);

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", titleColor)
      .attr("font-size", "24px")
      .text("False Positive Rate (FPR)");

    // Y axis label
    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", titleColor)
      .attr("font-size", "24px")
      .text("True Positive Rate (TPR)");

    // Legend
    const legend = g
      .append("g")
      .attr("transform", `translate(0, ${innerHeight + 90})`);

    models.forEach((modelKey, i) => {
      const config = MODEL_CONFIG[modelKey] || {
        color: "#7C4DFF",
        label: modelKey,
      };
      const auc = data[modelKey]?.auc;

      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      legendItem
        .append("line")
        .attr("x1", 0)
        .attr("y1", 7)
        .attr("x2", 20)
        .attr("y2", 7)
        .attr("stroke", config.color)
        .attr("stroke-width", 3);

      legendItem
        .append("text")
        .attr("x", 26)
        .attr("y", 11)
        .attr("fill", axisColor)
        .attr("font-size", "24px")
        .text(
          `${config.label}${auc != null ? ` (AUC: ${auc.toFixed(3)})` : ""}`
        );
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [data, isDark]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 840 635"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
});

export default ROCCurveChart;