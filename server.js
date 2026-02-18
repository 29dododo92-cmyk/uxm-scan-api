const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const { fetchTextWithTimeout, buildSitemapCandidates } = require("./src/sitemapFetch.js");
const { parseSitemapXml } = require("./src/sitemapParse.js");
const { buildFullStructure } = require("./src/structureBuild.js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

/* =========================================
   EXISTING: Single page screenshot scan
========================================= */

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

    const normalized =
      url.startsWith("http://") || url.startsWith("https://")
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

/* =========================================
   NEW: Domain → Sitemap → Full Structure
========================================= */

app.post("/api/scan/domain", async (req, res) => {
  try {
    const { domain } = req.body || {};

    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "domain is required" });
    }

    const candidates = buildSitemapCandidates(domain);

    let xmlText = null;
    let usedSitemapUrl = null;

    for (const url of candidates) {
      try {
        xmlText = await fetchTextWithTimeout(url, 15000);
        usedSitemapUrl = url;
        break;
      } catch (e) {
        // пробуємо наступний варіант
      }
    }

    if (!xmlText) {
      return res.status(404).json({
        error: "sitemap.xml not found",
        tried: candidates
      });
    }

    const parsed = parseSitemapXml(xmlText);

    const MAX_SITEMAPS = 20;
    const MAX_URLS = 50000;

    let urls = [];

    if (parsed.type === "urlset") {
      urls = parsed.urls;
    } else {
      const sitemaps = parsed.sitemaps.slice(0, MAX_SITEMAPS);

      for (const sm of sitemaps) {
        try {
          const smXml = await fetchTextWithTimeout(sm, 15000);
          const smParsed = parseSitemapXml(smXml);

          if (smParsed.type === "urlset") {
            urls.push(...smParsed.urls);
            if (urls.length >= MAX_URLS) break;
          }
        } catch (e) {
          // пропускаємо биті sitemap
        }
      }
    }

    // прибираємо дублікати
    urls = Array.from(new Set(urls)).slice(0, MAX_URLS);

    const fullStructure = buildFullStructure(urls);

    const groupedPatternsCount =
      fullStructure.children.reduce(
        (sum, bucket) => sum + (bucket.children?.length || 0),
        0
      );

    return res.json({
      domain: domain.replace(/^https?:\/\//, "").replace(/\/+$/, ""),
      meta: {
        sitemapUrl: usedSitemapUrl,
        totalUrlsDiscovered: urls.length,
        groupedPatternsCount
      },
      fullStructure
    });
  } catch (err) {
    return res.status(500).json({
      error: "domain scan failed",
      details: String(err?.message || err)
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API running on", port));
