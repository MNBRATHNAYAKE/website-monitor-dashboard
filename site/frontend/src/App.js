import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

function App() {
  const [monitors, setMonitors] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("monitors");
    if (saved) setMonitors(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("monitors", JSON.stringify(monitors));
  }, [monitors]);

  const notify = (monitor, status) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") Notification.requestPermission();
    if (Notification.permission === "granted") {
      new Notification(`Monitor ${status.toUpperCase()}: ${monitor.name}`, {
        body: `The site ${monitor.url} is ${status}.`,
        icon:
          status === "down"
            ? "https://cdn-icons-png.flaticon.com/512/564/564619.png"
            : "https://cdn-icons-png.flaticon.com/512/190/190411.png",
      });
    }
  };

  const checkMonitorStatus = async (monitor) => {
    try {
      const response = await fetch(
        `http://localhost:5000/check?url=${encodeURIComponent(monitor.url)}`
      );
      const data = await response.json();

      setMonitors((prev) =>
        prev.map((m) => {
          if (m._id === monitor._id) {
            const newStatus = data.status;
            if (m.status !== newStatus) {
              notify(m, newStatus);
              m.statusHistory = [
                ...(m.statusHistory || []),
                { timestamp: new Date().toISOString(), status: newStatus },
              ];
            }
            const newIndex = (m.history[m.history.length - 1]?.index || 0) + 1;
            return {
              ...m,
              status: newStatus,
              usedFallback: data.usedFallback,
              history: [
                ...m.history.slice(-19),
                {
                  index: newIndex,
                  timestamp: new Date().toISOString(),
                  responseTime: data.responseTime,
                  status: newStatus,
                },
              ],
              statusHistory: m.statusHistory || [],
            };
          }
          return m;
        })
      );
    } catch (err) {
      setMonitors((prev) =>
        prev.map((m) => {
          if (m._id === monitor._id) {
            if (m.status !== "down") {
              notify(m, "down");
              m.statusHistory = [
                ...(m.statusHistory || []),
                { timestamp: new Date().toISOString(), status: "down" },
              ];
            }
            const newIndex = (m.history[m.history.length - 1]?.index || 0) + 1;
            return {
              ...m,
              status: "down",
              usedFallback: false,
              history: [
                ...m.history.slice(-19),
                {
                  index: newIndex,
                  timestamp: new Date().toISOString(),
                  responseTime: 0,
                  status: "down",
                },
              ],
              statusHistory: m.statusHistory || [],
            };
          }
          return m;
        })
      );
    }
  };

  useEffect(() => {
    const interval = setInterval(
      () => monitors.forEach((m) => checkMonitorStatus(m)),
      10000
    );
    return () => clearInterval(interval);
  }, [monitors]);

  const addMonitor = () => {
    if (!name || !url) return alert("Enter name and URL");
    const newMonitor = {
      _id: Date.now().toString(),
      name,
      url,
      status: "checking",
      history: [],
      statusHistory: [],
    };
    setMonitors((prev) => [...prev, newMonitor]);
    setName("");
    setUrl("");
    checkMonitorStatus(newMonitor);
  };

  const deleteMonitor = (id) =>
    setMonitors((prev) => prev.filter((m) => m._id !== id));

const toggleFullscreen = () => {
  if (!fullscreen) {
    document.documentElement.requestFullscreen();
    // Scroll first monitor card into view
    setTimeout(() => {
      const firstCard = document.querySelector(".monitor-card");
      if (firstCard) firstCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100); // slight delay to allow fullscreen rendering
  } else {
    document.exitFullscreen();
  }
  setFullscreen(!fullscreen);
};

useEffect(() => {
  const handleFullscreenChange = () => {
    // Update React state based on actual fullscreen status
    setFullscreen(!!document.fullscreenElement);
  };

  document.addEventListener("fullscreenchange", handleFullscreenChange);

  return () => {
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  };
}, []);



  const getAverageResponseTime = (history) => {
    if (!history.length) return 0;
    const sum = history.reduce((acc, h) => acc + h.responseTime, 0);
    return Math.round(sum / history.length);
  };

  const displayedMonitors = monitors
    .filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : a.status.localeCompare(b.status)
    );

  return (
    <div className={`app ${fullscreen ? "fullscreen" : ""}`}>
      {!fullscreen && <h1>Uptime Dashboard</h1>}

      {!fullscreen && (
        <div className="controls">
          <div className="add-monitor">
            <input
              placeholder="Monitor Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="Monitor URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="primary-btn" onClick={addMonitor}>
              Add Monitor
            </button>
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
          </div>
        </div>
      )}

     {!fullscreen && (
  <div className="fullscreen-toggle">
    <button className="primary-btn" onClick={toggleFullscreen}>
      Fullscreen
    </button>
  </div>
)}


      <div className="dashboard">
        {displayedMonitors.map((m) => {
          const avgResponse = getAverageResponseTime(m.history);
          const upData = m.history.map((h) =>
            h.status === "up" ? h : { ...h, responseTime: null }
          );
          const downData = m.history.map((h) =>
            h.status === "down" ? h : { ...h, responseTime: null }
          );
          const lastChanges = (m.statusHistory || []).slice(-3).reverse();

          return (
            <div key={m._id} className="monitor-card">
              <div className="monitor-header">
                <h2>{m.name}</h2>
                {!fullscreen && (
                  <button className="delete-btn" onClick={() => deleteMonitor(m._id)}>✕</button>
                )}
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
                {m.usedFallback && <span className="fallback-indicator"> (Advanced Check)</span>}
              </p>
              <p>URL: {m.url}</p>
              <p>Average Response: {avgResponse} ms</p>

              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={m.history}>
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#4caf50"
                    strokeWidth={2}
                    dot={false}
                    data={upData}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#f44336"
                    strokeWidth={2}
                    dot={false}
                    data={downData}
                  />
                  <XAxis
                    dataKey="timestamp"
                    interval={(index) => {
                      const maxTicks = 6;
                      const step = Math.ceil(m.history.length / maxTicks);
                      return index % step !== 0;
                    }}
                    tickFormatter={(tick) => {
                      const date = new Date(tick);
                      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(value, name, props) => [`${value} ms`, "Response"]}
                  />
                </LineChart>
              </ResponsiveContainer>

              {!fullscreen && lastChanges.length > 0 && (
                <div className="status-history-preview">
                  <p><strong>Recent Changes:</strong></p>
                  {lastChanges.map((c, i) => (
                    <p key={i}>
                      {new Date(c.timestamp).toLocaleString()} – {c.status}
                    </p>
                  ))}
                </div>
              )}

              {!fullscreen && (
                <>
                  <button
                    className="primary-btn small-btn"
                    onClick={() => setExpanded(expanded === m._id ? null : m._id)}
                  >
                    {expanded === m._id ? "Close History" : "Show Full History"}
                  </button>

{expanded === m._id && (
  <div
    className="modal"
    onClick={(e) => {
      // Close modal only if clicking outside modal-content
      if (e.target.classList.contains("modal")) {
        setExpanded(null);
      }
    }}
  >
    <div className="modal-content">
      <button
        className="modal-close-btn"
        onClick={() => setExpanded(null)}
      >
        ✕
      </button>
      <h3>Full History – {m.name}</h3>
      {(m.statusHistory || []).length > 0 ? (
        m.statusHistory.slice().reverse().map((c, i) => (
          <p key={i}>
            {new Date(c.timestamp).toLocaleString()} – {c.status}
          </p>
        ))
      ) : (
        <p>No history available</p>
      )}
    </div>
  </div>
)}


                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
