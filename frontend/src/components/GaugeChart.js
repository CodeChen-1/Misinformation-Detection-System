import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";

const GaugeChart = memo(function GaugeChart({ value = 0.5, label = "real" }) {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Gauge dimensions — fixed 200x140 viewBox
    const width = 200;
    const height = 140;
    const margin = { top: 10, bottom: 20 };
    const arcHeight = height - margin.top - margin.bottom;
    const arcWidth = width - 20;
    const radius = arcWidth / 2;
    const centerX = width / 2;
    const centerY = margin.top + arcHeight;

    // Background arc — grey semicircular track
    const backgroundArc = d3
      .arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius)
      .cornerRadius(4)
      .startAngle(-Math.PI)
      .endAngle(0);

    svg
      .append("path")
      .attr("d", backgroundArc)
      .attr("transform", `translate(${centerX},${centerY})`)
      .attr("fill", "#333");

    // Pick color and angle based on confidence value
    const color = label === "fake" ? "#FF5252" : "#69F0AE";
    const angleScale = d3.scaleLinear().domain([0, 1]).range([-Math.PI, 0]);
    const angle = angleScale(value);

    // Foreground arc — fills from 0% up to the current confidence level
    const foregroundArc = d3
      .arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius)
      .cornerRadius(4)
      .startAngle(-Math.PI)
      .endAngle(angle);

    svg
      .append("path")
      .attr("d", foregroundArc)
      .attr("transform", `translate(${centerX},${centerY})`)
      .attr("fill", color);

    // Centered percentage label inside the gauge
    svg
      .append("text")
      .attr("x", centerX)
      .attr("y", centerY - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#1a1a2e")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .text(`${(value * 100).toFixed(0)}%`);

    return () => {
      svg.selectAll("*").remove();
    };
  }, [value, label]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 140"
      style={{ width: "100%", maxWidth: 200 }}
    />
  );
});

export default GaugeChart;