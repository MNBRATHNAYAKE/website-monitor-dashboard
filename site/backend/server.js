const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
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

// Check monitor status
async function checkMonitor(monitor) {
  try {
    await axios.get(monitor.url, { timeout: 10000 });

    // Site is up
    if (monitor.status !== 'up') {
      monitor.status = 'up';
      monitor.history.push({ status: 'up', timestamp: new Date() });
      monitor.downSince = null;
      await sendEmail(monitor, 'up');
      saveMonitors();
    }
  } catch {
    // Site is down
    if (!monitor.downSince) monitor.downSince = new Date();

    const downTimeMinutes = (new Date() - new Date(monitor.downSince)) / 60000;

    if (downTimeMinutes >= 5 && monitor.status !== 'down') {
      // Down for 5 minutes → send alert
      monitor.status = 'down';
      monitor.history.push({ status: 'down', timestamp: new Date() });
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

// Helper functions to save data
function saveMonitors() {
  fs.writeFileSync(MONITORS_FILE, JSON.stringify(monitors, null, 2));
}

function saveSubscribers() {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

// ========================
// API Endpoints
// ========================

// Get all monitors
app.get('/monitors', (req, res) => res.json(monitors));

// Add a new monitor
app.post('/monitors', (req, res) => {
  const { name, url } = req.body;
  const newMonitor = { id: uuidv4(), name, url, status: 'unknown', history: [], downSince: null };
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
