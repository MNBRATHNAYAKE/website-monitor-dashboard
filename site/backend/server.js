const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
app.use(express.json());

// JSON file paths
const MONITORS_FILE = './monitors.json';
const SUBSCRIBERS_FILE = './subscribers.json';

// Load monitors
let monitors = [];
if (fs.existsSync(MONITORS_FILE)) {
  monitors = JSON.parse(fs.readFileSync(MONITORS_FILE));
}

// Load subscribers
let subscribers = [];
if (fs.existsSync(SUBSCRIBERS_FILE)) {
  subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE));
}


const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL;
const frontendURL = process.env.FRONTEND_URL;
const port = process.env.PORT || 5000;


// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) console.error('❌ SMTP connection failed:', error.message);
  else console.log('✅ SMTP connection successful!');
});

// Function to send email alerts
async function sendEmail(monitor, status) {
  const subject = `Monitor ${status.toUpperCase()}: ${monitor.name}`;
  const text = `Monitor "${monitor.name}" (${monitor.url}) is now ${status}.`;

  console.log(`📧 Sending "${status}" email for: ${monitor.name}`);

  if (subscribers.length === 0) {
    console.log('⚠️ No subscribers to send email to.');
    return;
  }

  for (const email of subscribers) {
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject,
        text,
      });
      console.log(`✅ Email sent to: ${email}`);
    } catch (err) {
      console.error(`❌ Failed to send email to ${email}: ${err.message}`);
    }
  }
}

// Helper functions to save data
function saveMonitors() {
  fs.writeFileSync(MONITORS_FILE, JSON.stringify(monitors, null, 2));
}

function saveSubscribers() {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

// Check monitor status with 5-minute confirmation delay
async function checkMonitor(monitor) {
  try {
    await axios.get(monitor.url, { timeout: 10000 });

    // Site is UP
    if (monitor.status !== 'up') {
      monitor.status = 'up';
      monitor.history.push({ status: 'up', timestamp: new Date() });
      monitor.downSince = null;
      monitor.alertSent = false;
      await sendEmail(monitor, 'up');
      saveMonitors();
    }
  } catch {
    // Site is DOWN
    if (!monitor.downSince) {
      // First time detected as down
      monitor.downSince = new Date();
      console.log(`⚠️ ${monitor.name} might be down — starting 5-minute timer...`);
    }

    const downTimeMinutes = (new Date() - new Date(monitor.downSince)) / 60000;

    // Push current DOWN status for chart (if last history point is not down)
    const lastHistory = monitor.history[monitor.history.length - 1];
    if (!lastHistory || lastHistory.status !== 'down') {
      monitor.history.push({ status: 'down', timestamp: new Date() });
    }

    // After 5 minutes, confirm it’s still down before sending alert
    if (downTimeMinutes >= 5 && monitor.status !== 'down' && !monitor.alertSent) {
      try {
        const confirm = await axios.get(monitor.url, { timeout: 10000 });
        if (confirm.status >= 200 && confirm.status < 400) {
          console.log(`✅ ${monitor.name} recovered before 5 minutes.`);
          monitor.downSince = null;
          monitor.status = 'up';
          monitor.alertSent = false;
          saveMonitors();
          return;
        }
      } catch {
        // Still down after 5 minutes — send alert
      }

      monitor.status = 'down';
      monitor.alertSent = true;
      await sendEmail(monitor, 'down');
      saveMonitors();
    }
  }
}

// Periodically check monitors every 1 minute
setInterval(async () => {
  for (const monitor of monitors) {
    try {
      await checkMonitor(monitor);
    } catch (err) {
      console.error('Monitor check error:', err.message);
    }
  }
}, 60000);

// ========================
// API Endpoints
// ========================

// Get all monitors (include current status in chart)
app.get('/monitors', (req, res) => {
  const monitorsWithCurrent = monitors.map(m => {
    // Clone history and append current status as last point
    const history = [...m.history];
    const now = new Date();
    if (history.length === 0 || new Date(history[history.length - 1].timestamp).getTime() < now.getTime()) {
      history.push({ status: m.status, timestamp: now });
    }
    return { ...m, history };
  });
  res.json(monitorsWithCurrent);
});

// Add a new monitor
app.post('/monitors', (req, res) => {
  const { name, url } = req.body;
  const newMonitor = {
    id: uuidv4(),
    name,
    url,
    status: 'unknown',
    history: [],
    downSince: null,
    alertSent: false,
  };
  monitors.push(newMonitor);
  saveMonitors();
  res.json(newMonitor);
});

// Delete a monitor
app.delete('/monitors/:id', (req, res) => {
  monitors = monitors.filter(m => m.id !== req.params.id);
  saveMonitors();
  res.sendStatus(200);
});

// Add a subscriber
app.post('/subscribers', (req, res) => {
  const { email } = req.body;
  if (!subscribers.includes(email)) {
    subscribers.push(email);
    saveSubscribers();
  }
  res.json({ subscribers });
});

// Get all subscribers
app.get('/subscribers', (req, res) => res.json(subscribers));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
