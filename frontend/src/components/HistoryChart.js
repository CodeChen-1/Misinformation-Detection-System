import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const HistoryChart = memo(function HistoryChart({ history = [] }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const tooltipBg = isDark ? 'rgba(13,11,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipText = isDark ? '#E8E6F0' : '#1A1433';

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (!history.length) return;

    // Tally Real vs Fake from prediction history
    const realCount = history.filter((e) => e.label === "real").length;
    const fakeCount = history.filter((e) => e.label === "fake").length;
    const total = realCount + fakeCount;

    const width = 400;
    const centerX = 200;
    const centerY = 150;
    const innerRadius = 60;
    const outerRadius = 90;

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
      .attr("viewBox", `0 0 ${width} 315`)
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${centerX},${centerY})`);

    // Pie layout — two segments: Real (green) and Fake (red)
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const data = pie([
      { label: "Real", value: realCount, color: "#69F0AE" },
      { label: "Fake", value: fakeCount, color: "#FF5252" }
    ]);

    // Draw the donut arcs with staggered fade-in
    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    const arcs = g.selectAll("path")
      .data(data)
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => d.data.color)
      .attr("stroke", isDark ? "#0D0B1E" : "#ffffff")
      .attr("stroke-width", 2)
      .attr("opacity", 0);

    arcs.transition()
      .duration(600)
      .delay((_, i) => i * 200)
      .attr("opacity", 1);

    arcs.on("mouseover", (event, d) => {
      const pct = total ? (d.data.value / total) * 100 : 0;
      tooltip.style("opacity", 1).html(`<strong>${d.data.label}</strong><br/>${d.data.value} (${pct.toFixed(1)}%)`);
    }).on("mousemove", (event) => {
      tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
    }).on("mouseout", () => tooltip.style("opacity", 0));

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "32px")
      .attr("font-weight", "bold")
      .attr("fill", tooltipText)
      .attr("dy", "-0.2em")
      .text(total);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", "#888888")
      .attr("dy", "1.2em")
      .text(total ? `${((realCount / total) * 100).toFixed(0)}% Real` : "");

    // Legend
    const legendY = 270;
    const legendData = [
      { label: "Real", color: "#69F0AE" },
      { label: "Fake", color: "#FF5252" },
    ];
    const legendGroup = svg.append("g")
      .attr("transform", `translate(${centerX - 130}, ${legendY + 5})`);

    legendData.forEach((item, i) => {
      const gLeg = legendGroup.append("g")
        .attr("transform", `translate(0, ${i * 24})`);
      gLeg.append("rect")
        .attr("x", 0)
        .attr("y", -6)
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", item.color);
      gLeg.append("text")
        .attr("x", 18)
        .attr("y", 3)
        .attr("fill", tooltipText)
        .attr("font-size", "12px")
        .attr("font-weight", 500)
        .text(item.label);
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [history, isDark]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", minHeight: 100 }}
    />
  );
});

export default HistoryChart;
