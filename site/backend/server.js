import express from "express";
import fetch from "node-fetch";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));

app.get("/check", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing url parameter" });

  const start = Date.now();

  // First attempt: fast fetch
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
      timeout: 10000,
    });

    const responseTime = Date.now() - start;
    const status =
      response.ok || (response.status >= 300 && response.status < 400) ? "up" : "down";

    if (status === "up") return res.json({ status, responseTime, usedFallback: false });
  } catch (err) {
    // fetch failed → fallback
  }

  // Fallback: Puppeteer for tricky sites
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const responseTime = Date.now() - start;
    res.json({ status: "up", responseTime, usedFallback: true });
  } catch (err) {
    res.json({ status: "down", responseTime: 0, usedFallback: true });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
