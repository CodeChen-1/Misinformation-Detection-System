import { useRef, useEffect, memo } from "react";
import * as d3 from "d3";
import { useTheme } from "@mui/material/styles";

const MODEL_COLORS = {
  "Logistic Regression": "#7C4DFF",
  "Random Forest": "#00BFA5",
  "Hybrid Random Forest": "#B47CFF",
};

const MODEL_LABELS = {
  "Logistic Regression": "Logistic Regression",
  "Random Forest": "Random Forest",
  "Hybrid Random Forest": "Hybrid RF",
};

const AccuracyComparisonChart = memo(function AccuracyComparisonChart({ data }) {
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

    const width = 800;
    const height = 455;
    const margin = { top: 50, right: 20, bottom: 170, left: 95 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Group accuracy data by test set, with one entry per model per group
    const groups = [...new Set(data.map((d) => d.test_set))];
    const models = [...new Set(data.map((d) => d.model))];

    const nested = groups.map((group) => ({
      group,
      values: models.map((model) => {
        const match = data.find(
          (d) => d.test_set === group && d.model === model
        );
        return { model, accuracy: match ? match.accuracy : 0 };
      }),
    }));

    const x0Scale = d3
      .scaleBand()
      .domain(groups)
      .range([0, innerWidth])
      .padding(0.3);

    const x1Scale = d3
      .scaleBand()
      .domain(models)
      .range([0, x0Scale.bandwidth()])
      .padding(0.15);

    const yScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([innerHeight, 0]);

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
    nested.forEach(({ group, values }) => {
      g.selectAll(`.bar-${group.replace(/\s+/g, "")}`)
        .data(values)
        .join("rect")
        .attr("x", (d) => x0Scale(group) + x1Scale(d.model))
        .attr("y", (d) => yScale(d.accuracy))
        .attr("width", x1Scale.bandwidth())
        .attr("height", (d) => innerHeight - yScale(d.accuracy))
        .attr("fill", (d) => MODEL_COLORS[d.model] || "#7C4DFF")
        .attr("rx", 3)
        .attr("ry", 3)
        .on("mouseover", (event, d) => {
          d3.select(event.target).transition().duration(200).attr("opacity", 0.75);
          tooltip
            .style("opacity", 1)
            .html(
              `<strong>${MODEL_LABELS[d.model] || d.model}</strong><br/>` +
                `Accuracy: ${(d.accuracy * 100).toFixed(1)}%`
            );
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
    });

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(".0%")))
      .selectAll("text")
      .attr("font-size", "24px")
      .attr("fill", axisColor);

    g.selectAll(".domain, .tick line").attr("stroke", axisStroke);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0Scale))
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
      .text("Accuracy");

    // X axis label
    g.append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 50)
      .attr("text-anchor", "middle")
      .attr("fill", titleColor)
      .attr("font-size", "24px")
      .text("Test Set");

    // Legend
    const legend = g
      .append("g")
      .attr("transform", `translate(0, ${innerHeight + 90})`);

    models.forEach((model, i) => {
      const legendItem = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 28})`);

      legendItem
        .append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 3)
        .attr("fill", MODEL_COLORS[model] || "#7C4DFF");

      legendItem
        .append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("fill", axisColor)
        .attr("font-size", "24px")
        .text(MODEL_LABELS[model] || model);
    });

    return () => {
      svg.selectAll("*").remove();
      tooltip.remove();
    };
  }, [data, isDark]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 570"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  );
});

export default AccuracyComparisonChart;