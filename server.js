const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" })); // URL в body — маленький

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/scan", async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 }
    });

    // важливо: нормалізуємо URL (щоб не падало на "example.com" без https)
    const normalized = url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;

    await page.goto(normalized, { waitUntil: "networkidle", timeout: 45000 });

    const buffer = await page.screenshot({ fullPage: true, type: "png" });
    const base64 = buffer.toString("base64");

    return res.json({
      success: true,
      mime: "image/png",
      dataUrl: `data:image/png;base64,${base64}`
    });
  } catch (e) {
    return res.status(500).json({
      error: "scan failed",
      details: String(e?.message || e)
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API running on", port));
