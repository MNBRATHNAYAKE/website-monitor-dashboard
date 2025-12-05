// UptimeChart.js
import React, { useState, useMemo } from "react";
import Chart from "react-apexcharts";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const UptimeChart = ({ history = [] }) => {
  const [range, setRange] = useState("24h");
  const chartId = useMemo(() => `chart-${Math.random().toString(36).substring(2, 9)}`, []);

  if (!history || history.length === 0)
    return <p style={{ color: "#aaa" }}>No uptime data available.</p>;

  const now = new Date();
  const cutoff = new Date(
    range === "48h"
      ? now.getTime() - 48 * 60 * 60 * 1000
      : range === "72h"
      ? now.getTime() - 72 * 60 * 60 * 1000
      : now.getTime() - 24 * 60 * 60 * 1000
  );

  // Filter by selected range
  let filtered = history
    .filter(item => {
      const t = new Date(item.timestamp).getTime();
      return t >= cutoff.getTime() && t <= now.getTime();
    })
    .map(item => ({
      x: new Date(item.timestamp).getTime(),
      y: clamp(item.status === "up" ? 100 : 0, 0, 100),
      status: item.status,
      timestamp: item.timestamp,
    }));

  // --- 👇 Add step points when status changes for visible dips
  const stepped = [];
  for (let i = 0; i < filtered.length; i++) {
    const curr = filtered[i];
    const prev = filtered[i - 1];
    stepped.push(curr);
    if (prev && prev.status !== curr.status) {
      // Add intermediate point to emphasize the change
      stepped.push({
        x: curr.x - 1000, // 1 second before change
        y: prev.y,
        status: prev.status,
        timestamp: curr.timestamp,
      });
    }
  }

  let uniqueData = Array.from(new Map(stepped.map(d => [d.x, d])).values()).sort(
    (a, b) => a.x - b.x
  );

  if (uniqueData.length === 0)
    return <p style={{ color: "#aaa" }}>No uptime data available for this range.</p>;

  // Add start/end points
  if (uniqueData[0].x > cutoff.getTime())
    uniqueData.unshift({
      x: cutoff.getTime(),
      y: uniqueData[0].y,
      status: uniqueData[0].status,
    });

  if (uniqueData[uniqueData.length - 1].x < now.getTime())
    uniqueData.push({
      x: now.getTime(),
      y: uniqueData[uniqueData.length - 1].y,
      status: uniqueData[uniqueData.length - 1].status,
    });

  const series = [{ name: "Uptime", data: uniqueData }];

  // --- 🟩 ApexCharts options
  const chartOptions = {
    chart: {
      id: chartId,
      type: "line",
      background: "transparent",
      zoom: { enabled: true, type: "x", autoScaleYaxis: true },
      toolbar: { show: true, tools: { download: false, reset: true, zoom: true } },
      animations: { enabled: true, easing: "easeinout", speed: 400 },
    },
    stroke: {
      curve: "stepline", // ✅ step-style for uptime/downtime
      width: 2,
      colors: ["#00e676"],
    },
    markers: {
      size: 4,
      strokeWidth: 1,
      hover: { size: 6 },
      discrete: uniqueData
        .filter(d => d.status === "down")
        .map(d => ({
          seriesIndex: 0,
          dataPointIndex: uniqueData.indexOf(d),
          fillColor: "#ff1744",
          strokeColor: "#fff",
          size: 6,
          shape: "circle",
        })),
    },
    yaxis: {
      min: 0,
      max: 100,
      tickAmount: 2,
      labels: {
        formatter: val => (val === 100 ? "Up" : "Down"),
        style: { colors: "#aaa" },
      },
    },
    xaxis: {
      type: "datetime",
      min: cutoff.getTime(),
      max: now.getTime(),
      labels: { datetimeUTC: false, style: { colors: "#ccc", fontSize: "11px" } },
    },
    tooltip: {
      theme: "dark",
      x: { format: "dd MMM HH:mm" },
      y: {
        formatter: val => (val === 100 ? "Up" : "Down"),
      },
    },
    grid: {
      borderColor: "rgba(255,255,255,0.06)",
      strokeDashArray: 4,
      padding: { left: 8, right: 8 },
    },
    legend: { show: false },
  };

  // --- Download events (past 6 days)
  const downloadCSV = () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const dataToExport = history
      .filter(item => new Date(item.timestamp) >= sixDaysAgo)
      .map(item => ({ Timestamp: item.timestamp, Status: item.status }));

    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Timestamp,Status", ...dataToExport.map(e => `${e.Timestamp},${e.Status}`)].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "uptime_events_past_6_days.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Table of events (past 6 days)
  const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const recentEvents = history
    .filter(item => new Date(item.timestamp) >= sixDaysAgo)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div style={{ width: "100%" }}>
      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <select
          value={range}
          onChange={e => setRange(e.target.value)}
          style={{
            background: "#2c2c3c",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 13,
          }}
        >
          <option value="24h">Last 24 hours</option>
          <option value="48h">Last 48 hours</option>
          <option value="72h">Last 72 hours</option>
        </select>

        <button
          onClick={downloadCSV}
          style={{
            background: "#009688",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 12px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Download Events (6 days)
        </button>
      </div>

      {/* Chart */}
      <div style={{ backgroundColor: "#1e1e2f", borderRadius: 10, padding: 8 }}>
        <Chart options={chartOptions} series={series} type="line" height={260} />
      </div>

      {/* Events Table */}
      <div
        style={{
          marginTop: 20,
          backgroundColor: "#1e1e2f",
          borderRadius: 10,
          padding: 10,
          color: "#ddd",
        }}
      >
        <h4 style={{ marginBottom: 8, color: "#00e676" }}>Events (Past 6 Days)</h4>
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                <th style={{ textAlign: "left", padding: "6px" }}>Timestamp</th>
                <th style={{ textAlign: "left", padding: "6px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e, i) => (
                <tr
                  key={i}
                  style={{
                    backgroundColor: e.status === "down" ? "#3b1a1a" : "#1b3b1b",
                  }}
                >
                  <td style={{ padding: "6px", color: "#ccc" }}>
                    {new Date(e.timestamp).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "6px",
                      color: e.status === "down" ? "#ff5252" : "#00e676",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {e.status}
                  </td>
                </tr>
              ))}
              {recentEvents.length === 0 && (
                <tr>
                  <td colSpan="2" style={{ textAlign: "center", padding: "8px", color: "#888" }}>
                    No events found in the last 6 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UptimeChart;
