// App.js
import React, { useEffect, useState } from "react";
import "./App.css";
import UptimeChart from "./UptimeChart";
import axios from "axios";

function App() {
  const [monitors, setMonitors] = useState([]);
  const [email, setEmail] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subMessage, setSubMessage] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState(null);

  // ✅ FIX 1: Unify the URL. Use your actual Vercel Backend URL here.
  // Remove the trailing slash '/' if it exists.
  const BACKEND_URL = "https://website-monitor-dashboard-6rmic2pys-nuwans-projects-0d23b1ca.vercel.app"; 

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => console.error(err.message));
      document.body.classList.add("fullscreen-active");
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      document.body.classList.remove("fullscreen-active");
      setFullscreen(false);
    }
  };

  const fetchMonitors = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/monitors.json`);
      setMonitors(res.data);
    } catch (err) {
      console.error("Monitor fetch error:", err.message);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/subscribers.json`);
      setSubscriberCount(res.data.length);
    } catch (err) {
      console.error("Subscriber fetch error:", err.message);
    }
    // ❌ REMOVED: The accidental axios.post here was trying to subscribe an empty email on every page load!
  };

  const addSubscriber = async () => {
    if (!email) return;
    try {
      // ✅ FIX 2: Use the variable BACKEND_URL instead of the placeholder "your-backend.vercel.app"
      await axios.post(`${BACKEND_URL}/subscribers`, { email });
      setEmail("");
      setSubMessage("Subscribed successfully! ✅");
      // Refresh count after adding
      fetchSubscribers(); 
    } catch (err) {
      console.error("Subscription error:", err.message);
      setSubMessage("Error subscribing. Please try again. ❌");
    }
    setTimeout(() => setSubMessage(""), 4000);
  };

  useEffect(() => {
    fetchMonitors();
    fetchSubscribers();
    const interval = setInterval(fetchMonitors, 10000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
      document.body.classList.toggle("fullscreen-active", !!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="App">
      {!fullscreen && (
        <>
          <h1>Website Monitoring Dashboard</h1>
          <div className="fullscreen-toggle">
            <button onClick={toggleFullscreen}>
              {fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            </button>
          </div>

          <div className="subscriber">
            <input
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={addSubscriber}>Subscribe for alerts</button>
          </div>
          {subMessage && <p className="sub-message">{subMessage}</p>}
          <p style={{ textAlign: "center", marginTop: "8px", color: "#ccc" }}>
            Total Subscribers: {subscriberCount}
          </p>
        </>
      )}

      <div className={`monitors ${fullscreen ? "fullscreen-active" : ""}`}>
        {monitors.map((m, index) => (
          <div key={index} className={`monitor ${m.status}`}>
            <div className="monitor-content">
              <div className="monitor-info">
                <h3>{m.name}</h3>
                <p>{m.url}</p>
                <p>
                  Status: <span className={`status-${m.status}`}>{m.status}</span>
                </p>
                <button 
                  style={{
                    background: "#4caf50",
                    border: "none",
                    borderRadius: "6px",
                    color: "#fff",
                    padding: "6px 12px",
                    marginTop: "6px",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedMonitor(m)}
                >
                  More details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedMonitor && (
        <div className="monitor-popup-overlay" onClick={() => setSelectedMonitor(null)}>
          <div className="monitor-popup" onClick={(e) => e.stopPropagation()}>
            <button className="close-popup" onClick={() => setSelectedMonitor(null)}>
              ✖
            </button>
            <h2>{selectedMonitor.name}</h2>
            <p>
              <strong>URL:</strong> {selectedMonitor.url}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              <span className={`status-${selectedMonitor.status}`}>
                {selectedMonitor.status}
              </span>
            </p>
            <div className="popup-chart">
              <UptimeChart history={selectedMonitor.history} detailed />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;