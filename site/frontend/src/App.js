import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "./App.css";

function App() {
  const [monitors, setMonitors] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [fullscreen, setFullscreen] = useState(false);

  // Load monitors from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("monitors");
    if (saved) setMonitors(JSON.parse(saved));
  }, []);

  // Save monitors to localStorage
  useEffect(() => {
    localStorage.setItem("monitors", JSON.stringify(monitors));
  }, [monitors]);

  // Notifications function
  const notify = (monitor, status) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") Notification.requestPermission();

    if (Notification.permission === "granted") {
      new Notification(`Monitor ${status.toUpperCase()}: ${monitor.name}`, {
        body: `The site ${monitor.url} is ${status}.`,
        icon: status === "down"
          ? "https://cdn-icons-png.flaticon.com/512/564/564619.png"
          : "https://cdn-icons-png.flaticon.com/512/190/190411.png",
      });
    }

    const audioUrl =
      status === "down"
        ? "https://www.soundjay.com/buttons/sounds/beep-07.mp3"
        : "https://www.soundjay.com/buttons/sounds/button-10.mp3";

    const audio = new Audio(audioUrl);
    audio.play();
  };

  // Check monitor status
  const checkMonitorStatus = async (monitor) => {
    try {
      const response = await fetch(
        `http://localhost:5000/check?url=${encodeURIComponent(monitor.url)}`
      );
      const data = await response.json();

      setMonitors((prev) =>
        prev.map((m) => {
          if (m._id === monitor._id) {
            if (data.status === "down" && m.status !== "down") notify(m, "down");
            if (data.status === "up" && m.status === "down") notify(m, "up");

            return {
              ...m,
              status: data.status,
              usedFallback: data.usedFallback,
              history: [
                ...m.history.slice(-9),
                { timestamp: new Date().toISOString(), responseTime: data.responseTime },
              ],
            };
          }
          return m;
        })
      );
    } catch (err) {
      setMonitors((prev) =>
        prev.map((m) => {
          if (m._id === monitor._id) {
            if (m.status !== "down") notify(m, "down");
            return {
              ...m,
              status: "down",
              usedFallback: false,
              history: [
                ...m.history.slice(-9),
                { timestamp: new Date().toISOString(), responseTime: 0 },
              ],
            };
          }
          return m;
        })
      );
    }
  };

  // Periodic status update every 20s
  useEffect(() => {
    const interval = setInterval(() => monitors.forEach((m) => checkMonitorStatus(m)), 20000);
    return () => clearInterval(interval);
  }, [monitors]);

  const addMonitor = () => {
    if (!name || !url) {
      // 🔹 Just ignore invalid input silently, no blocking alert
      return;
    }
    const newMonitor = {
      _id: Date.now().toString(),
      name,
      url,
      status: "checking",
      history: [],
    };
    setMonitors((prev) => [...prev, newMonitor]);
    setName("");
    setUrl("");
    checkMonitorStatus(newMonitor);
  };

  const deleteMonitor = (id) => setMonitors((prev) => prev.filter((m) => m._id !== id));

  const toggleFullscreen = () => {
    if (!fullscreen) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
    setFullscreen(!fullscreen);
  };

  const getAverageResponseTime = (history) => {
    if (!history.length) return 0;
    return Math.round(history.reduce((acc, h) => acc + h.responseTime, 0) / history.length);
  };

  const displayedMonitors = monitors
    .filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : a.status.localeCompare(b.status)
    );

  return (
    <div className="app">
      <h1>Uptime Dashboard</h1>

      <div className="controls">
        <div className="add-monitor">
          <input placeholder="Monitor Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Monitor URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button onClick={addMonitor}>Add Monitor</button>
        </div>

        <div className="filter-sort">
          <input
            placeholder="Search by name"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
          </select>
          <button onClick={toggleFullscreen}>
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div className="dashboard">
        {displayedMonitors.map((m) => {
          const avgResponse = getAverageResponseTime(m.history);
          const lineColor =
            m.status === "up"
              ? "#4caf50"
              : m.status === "down"
              ? "#f44336"
              : "#ffeb3b";

          return (
            <div key={m._id} className="monitor-card">
              <div className="monitor-header">
                <h2>{m.name}</h2>
                <button onClick={() => deleteMonitor(m._id)}>✕</button>
              </div>
              <p>
                Status:{" "}
                <span
                  className={
                    m.status === "up"
                      ? "status-up"
                      : m.status === "down"
                      ? "status-down"
                      : "status-checking"
                  }
                >
                  {m.status}
                </span>
                {m.usedFallback && (
                  <span className="fallback-indicator"> (Advanced Check)</span>
                )}
              </p>
              <p>URL: {m.url}</p>
              <p>Average Response: {avgResponse} ms</p>

              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={m.history}>
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={false}
                  />
                  <XAxis dataKey="timestamp" hide />
                  <YAxis />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
