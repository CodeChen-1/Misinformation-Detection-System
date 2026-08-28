import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const ConfidenceDistributionChart = memo(function ConfidenceDistributionChart({ history = [] }) {
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

    // Split predictions into confidence buckets (0-20%, 20-40%, … 80-100%)
    const buckets = [
      { key: "0–20%", min: 0, max: 0.2 },
      { key: "20–40%", min: 0.2, max: 0.4 },
      { key: "40–60%", min: 0.4, max: 0.6 },
      { key: "60–80%", min: 0.6, max: 0.8 },
      { key: "80–100%", min: 0.8, max: 1.01 },
    ];

    const data = buckets.map((b) => {
      const items = history.filter((h) => h.confidence >= b.min && h.confidence < b.max);
      return {
        label: b.key,
        real: items.filter((h) => h.label === "real").length,
        fake: items.filter((h) => h.label === "fake").length,
        total: items.length,
      };
    });

    const width = 600;
    const height = 375;
    const margin = { top: 20, right: 30, bottom: 95, left: 75 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // X axis — confidence buckets, Y axis — count
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerWidth])
      .padding(0.25);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.total) * 1.15 || 1])
      .range([innerHeight, 0]);

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
      .call(d3.axisLeft(yScale).ticks(Math.min(d3.max(data, (d) => d.total) || 1, 8)))
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
      const x = xScale(d.label);
      const bw = xScale.bandwidth();
      const realH = d.total > 0 ? innerHeight - yScale(d.real) : 0;
      const fakeH = d.total > 0 ? yScale(d.real) - yScale(d.total) : 0;
      const realY = yScale(d.real);
      const fakeY = yScale(d.total);

      const group = g.append("g");

      const fakeBar = group.append("rect")
        .attr("x", x)
        .attr("y", fakeY)
        .attr("width", bw)
        .attr("height", 0)
        .attr("fill", "#FF5252")
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("opacity", 0.85);

      fakeBar.transition().duration(500).delay(100).attr("height", fakeH);

      const realBar = group.append("rect")
        .attr("x", x)
        .attr("y", realY)
        .attr("width", bw)
        .attr("height", 0)
        .attr("fill", "#69F0AE")
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("opacity", 0.85);

      realBar.transition().duration(500).delay(200).attr("height", realH);

      group.on("mouseover", (event) => {
        tooltip.style("opacity", 1).html(
          `<strong>${d.label}</strong><br/>` +
          `Real: ${d.real}<br/>` +
          `Fake: ${d.fake}<br/>` +
          `Total: ${d.total}`
        );
      }).on("mousemove", (event) => {
        tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
      }).on("mouseout", () => tooltip.style("opacity", 0));

      if (d.total > 0) {
        group.append("text")
          .attr("x", x + bw / 2)
          .attr("y", yScale(d.total) - 6)
          .attr("text-anchor", "middle")
          .attr("fill", titleColor)
          .attr("font-size", "16px")
          .attr("font-weight", "bold")
          .text(d.total);
      }
    });

    // Y axis label
    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", titleColor)
      .attr("font-size", "16px")
      .text("Count");

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", titleColor)
      .attr("font-size", "16px")
      .text("Confidence Range");

    // Legend
    const legendGroup = svg.append("g")
      .attr("transform", `translate(${margin.left + 10}, ${margin.top + innerHeight + 55})`);

    const legendItems = [
      { label: "Real", color: "#69F0AE" },
      { label: "Fake", color: "#FF5252" },
    ];

    legendItems.forEach((item, i) => {
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
        .attr("fill", titleColor)
        .attr("font-size", "14px")
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
      style={{ width: "100%", height: "100%", minHeight: 360 }}
    />
  );
});

export default ConfidenceDistributionChart;
