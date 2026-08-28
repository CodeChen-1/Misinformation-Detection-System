import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const COLORS = { real: "#69F0AE", fake: "#FF5252" };

const ClassDistributionChart = memo(function ClassDistributionChart({ data }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const axisColor = isDark ? '#A09BBF' : '#5A5490';
    const valueColor = isDark ? '#E8E6F0' : '#1A1433';
    const tooltipBg = isDark ? 'rgba(13,11,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipText = isDark ? '#E8E6F0' : '#1A1433';

    if (
      !data ||
      !Array.isArray(data.labels) ||
      !Array.isArray(data.counts) ||
      data.labels.length === 0
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Map label values (0/1) to Real/Fake colors

    const width = 500;
    const height = 280;
    const margin = { top: 30, right: 60, bottom: 85, left: 60 };
    const radius =
      Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
    const innerRadius = radius * 0.5;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},140)`);

    const colorMap = {};
    const labelMap = { 0: "real", 1: "fake" };
    data.labels.forEach((label, i) => {
      const strLabel = String(label).toLowerCase();
      const mapped = labelMap[label] || strLabel;
      colorMap[label] = COLORS[mapped] || COLORS[strLabel] || "#B47CFF";
    });

    // Pie layout — arcs expand on hover for a nice interactive feel
    const pie = d3
      .pie()
      .value((d) => d.value)
      .sort(null);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);

    const hoverArc = d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8);

    const chartData = data.labels.map((label, i) => ({
      label,
      value: data.counts[i],
    }));

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

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

    // Arcs
    g.selectAll("path")
      .data(pie(chartData))
      .join("path")
      .attr("d", arc)
      .attr("fill", (d) => colorMap[d.data.label])
      .attr("stroke", "#0D0B1E")
      .attr("stroke-width", 2)
      .on("mouseover", function (event, d) {
        d3.select(this).transition().duration(200).attr("d", hoverArc);
        tooltip.style("opacity", 1).html(
          `<strong>${d.data.label}</strong><br/>Count: ${d.data.value}<br/>` +
            `Percentage: ${((d.data.value / total) * 100).toFixed(1)}%`
        );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select(this).transition().duration(200).attr("d", arc);
        tooltip.style("opacity", 0);
      });

    // Center label
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.3em")
      .attr("fill", valueColor)
      .attr("font-size", "14px")
      .attr("font-weight", 700)
      .style("pointer-events", "none")
      .text(total);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("fill", axisColor)
      .attr("font-size", "12px")
      .style("pointer-events", "none")
      .text("Total Samples");

    // Legend
    const legend = g
      .append("g")
      .attr("transform", `translate(${-width / 2 + 60}, ${height / 2})`);

    chartData.forEach((d, i) => {
      const item = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 24})`);

      item
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 3)
        .attr("fill", colorMap[d.label]);

      item
        .append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("fill", axisColor)
        .attr("font-size", "18px")
        .text(d.label);
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [data, isDark]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 460 380"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
});

export default ClassDistributionChart;
