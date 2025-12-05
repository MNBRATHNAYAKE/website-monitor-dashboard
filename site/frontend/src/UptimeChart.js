// UptimeChart.js
import React, { useState } from "react";
import Chart from "react-apexcharts";

const UptimeChart = ({ history = [], detailed = false }) => {
  const [range] = useState("24h");

  // Logic to process data...
  // (Use your existing logic from the provided UptimeChart.js here)
  // Ensure that when mapping, you handle MongoDB dates:
  // const t = new Date(item.timestamp).getTime();

  // If detailed is false (Dashboard view), return a tiny sparkline
  if (!detailed) {
    const sparkOptions = {
      chart: { type: 'line', sparkline: { enabled: true } },
      stroke: { curve: 'stepline', width: 2, colors: ['#4caf50'] },
      tooltip: { fixed: { enabled: false }, x: { show: false }, y: { title: { formatter: () => '' } }, marker: { show: false } }
    };
    // Map data simply for sparkline
    const simpleData = history.slice(-20).map(h => h.status === 'up' ? 100 : 0);
    return <Chart options={sparkOptions} series={[{data: simpleData}]} type="line" height={50} width="100%" />;
  }

  // ... Return full chart logic if detailed === true
  // (Paste your existing return statement from here)
  return (
      <p style={{color:'white'}}>Detailed Chart Placeholder (Paste your complex logic here)</p>
  );
};

export default UptimeChart;