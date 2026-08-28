import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const FeatureImportanceChart = memo(function FeatureImportanceChart({ data }) {
  const svgRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    const axisColor = isDark ? '#A09BBF' : '#5A5490';
    const titleColor = isDark ? '#A09BBF' : '#4A4580';
    const tooltipBg = isDark ? 'rgba(13,11,30,0.95)' : 'rgba(255,255,255,0.95)';
    const tooltipText = isDark ? '#E8E6F0' : '#1A1433';
    const axisStroke = isDark ? 'rgba(124,77,255,0.2)' : 'rgba(124,77,255,0.35)';

    if (!data || !Array.isArray(data) || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 850;
    const height = 550;
    const margin = { top: 20, right: 40, bottom: 180, left: 220 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Sort features by importance and keep top 10
    const sorted = [...data]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

    const xScale = d3
      .scaleLinear()
      .domain([0, d3.max(sorted, (d) => d.importance) * 1.1])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleBand()
      .domain(sorted.map((d) => d.name))
      .range([0, innerHeight])
      .padding(0.2);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

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
      .data(sorted)
      .join("rect")
      .attr("y", (d) => yScale(d.name))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => xScale(d.importance))
      .attr("fill", "#00BFA5")
      .attr("rx", 4)
      .attr("ry", 4)
      .on("mouseover", (event, d) => {
        d3.select(event.target).transition().duration(200).attr("opacity", 0.7);
        tooltip
          .style("opacity", 1)
          .html(`<strong>${d.name}</strong><br/>Importance: ${d.importance.toFixed(4)}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", (event) => {
        d3.select(event.target).transition().duration(200).attr("opacity", 1);
        tooltip.style("opacity", 0);
      });

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("font-size", "24px")
      .attr("fill", axisColor);

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .selectAll("text")
      .attr("font-size", "24px")
      .attr("fill", axisColor);

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // Y axis label
    g.append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -margin.left + 18)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("fill", titleColor)
      .attr("font-size", "24px")
      .text("Features");

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", titleColor)
      .attr("font-size", "24px")
      .text("Importance");

    const legendG = g.append("g")
      .attr("transform", `translate(0, ${innerHeight + 90})`);
    const legendData = [
      { label: "TF-IDF Features", color: "#B47CFF" },
      { label: "Meta Features", color: "#FFD740" },
    ];
    legendData.forEach((d, i) => {
      const item = legendG.append("g")
        .attr("transform", `translate(0, ${i * 24})`);
      item.append("rect")
        .attr("width", 12).attr("height", 12).attr("rx", 3)
        .attr("fill", d.color);
      item.append("text")
        .attr("x", 18).attr("y", 11)
        .attr("fill", axisColor).attr("font-size", "24px")
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
      viewBox="0 0 870 590"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
});

export default FeatureImportanceChart;