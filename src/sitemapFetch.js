async function fetchTextWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ux-minder-bot/0.1" }
    });

    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function buildSitemapCandidates(domain) {
  const clean = String(domain)
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");

  return [
    `https://${clean}/sitemap.xml`,
    `http://${clean}/sitemap.xml`
  ];
}

module.exports = {
  fetchTextWithTimeout,
  buildSitemapCandidates
};
