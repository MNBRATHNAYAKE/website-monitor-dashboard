import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

function UptimeChart({ history }) {
  if (!history || history.length === 0) return null;

  // Format date and time in short, readable form
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Group events within 5 minutes to reduce clutter
  const groupedData = [];
  const threshold = 5 * 60 * 1000; // 5 minutes in ms

  history.forEach((item) => {
    const timestamp = new Date(item.timestamp).getTime();
    if (
      groupedData.length === 0 ||
      timestamp - groupedData[groupedData.length - 1].timestamp > threshold
    ) {
      groupedData.push({ ...item, timestamp });
    } else {
      groupedData[groupedData.length - 1].status = item.status;
    }
  });

  // Prepare data for chart
  const data = groupedData.map((item) => ({
    time: formatDateTime(item.timestamp),
    status: item.status === 'up' ? 1 : 0,
  }));

  // Custom tooltip for a clean, minimal look
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const statusText = payload[0].value === 1 ? 'Up' : 'Down';
      const color = payload[0].value === 1 ? '#4caf50' : '#f44336';
      return (
        <div
          style={{
            backgroundColor: '#2c2f50',
            padding: '8px 12px',
            borderRadius: '6px',
            color: '#f0f0f0',
            fontSize: '0.85em',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          <div>
            <strong>Time:</strong> {payload[0].payload.time}
          </div>
          <div>
            <strong>Status:</strong>{' '}
            <span style={{ color }}>{statusText}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Dots for status changes
  const renderDot = (props) => {
    const { cx, cy, value } = props;
    const fillColor = value === 1 ? '#4caf50' : '#f44336';
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill={fillColor}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  };

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid stroke="#3a3f60" strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#ccc', fontSize: 10 }}
          interval="preserveStartEnd"
          tickLine={false}
          height={40}
          minTickGap={60}
        />
        <YAxis
          domain={[0, 1]}
          ticks={[0, 1]}
          tickFormatter={(val) => (val ? 'Up' : 'Down')}
          tick={{ fill: '#ccc', fontSize: 11 }}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="status"
          stroke="#4caf50"
          strokeWidth={2.5}
          dot={renderDot}
          isAnimationActive={false}
          connectNulls={true}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default UptimeChart;
