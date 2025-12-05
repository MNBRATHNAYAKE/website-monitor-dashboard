// App.js
import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import UptimeChart from "./UptimeChart";
import axios from "axios";

function App() {
  const [monitors, setMonitors] = useState([]);
  const [email, setEmail] = useState("");
  const [subCount, setSubCount] = useState(0);
  const [subMessage, setSubMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Use Environment Variable or fallback to localhost for dev
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const [monRes, subRes] = await Promise.all([
        axios.get(`${API_URL}/monitors`),
        axios.get(`${API_URL}/subscribers`)
      ]);
      setMonitors(monRes.data);
      setSubCount(subRes.data.count);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, [API_URL]);

  const addSubscriber = async () => {
    if (!email) return;
    try {
      await axios.post(`${API_URL}/subscribers`, { email });
      setEmail("");
      setSubMessage("✅ Subscribed successfully!");
      fetchData();
    } catch (err) {
      setSubMessage("❌ Error subscribing.");
    }
    setTimeout(() => setSubMessage(""), 4000);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const handleFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, []);

  return (
    <div className={`App ${fullscreen ? "fs-mode" : ""}`}>
      
      {/* Header Section */}
      {!fullscreen && (
        <header>
          <div className="header-top">
            <h1>System Status</h1>
            <div className="live-indicator">
               <span className="dot"></span>
               Live {lastUpdated && `(${lastUpdated.toLocaleTimeString()})`}
            </div>
          </div>
          
          <div className="controls">
            <button className="fs-btn" onClick={toggleFullscreen}>
              ⛶ Fullscreen
            </button>
          </div>

          <div className="subscriber-section">
            <div className="sub-input-group">
              <input
                type="email"
                placeholder="alert@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button onClick={addSubscriber}>Get Alerts</button>
            </div>
            {subMessage && <span className="sub-msg">{subMessage}</span>}
            <small className="sub-count">{subCount} active subscribers</small>
          </div>
        </header>
      )}

      {/* Grid */}
      <div className="monitors-grid">
        {monitors.map((m) => (
          <div key={m._id} className={`monitor-card ${m.status}`}>
            <div className="status-badge">{m.status}</div>
            <div className="monitor-details">
              <h3>{m.name}</h3>
              <a href={m.url} target="_blank" rel="noreferrer" className="monitor-link">{m.url}</a>
            </div>
            <div className="mini-chart">
               {/* Pass false to detailed to show simplified view */}
               <UptimeChart history={m.history} /> 
            </div>
            <button className="details-btn" onClick={() => setSelectedMonitor(m)}>
              Analytics &rarr;
            </button>
          </div>
        ))}
      </div>

      {/* Popup Modal */}
      {selectedMonitor && (
        <div className="modal-overlay" onClick={() => setSelectedMonitor(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedMonitor(null)}>×</button>
            
            <div className="modal-header">
              <h2>{selectedMonitor.name}</h2>
              <span className={`status-pill ${selectedMonitor.status}`}>
                {selectedMonitor.status.toUpperCase()}
              </span>
            </div>
            
            <p className="modal-url">{selectedMonitor.url}</p>
            
            <div className="chart-wrapper">
              <UptimeChart history={selectedMonitor.history} detailed />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;