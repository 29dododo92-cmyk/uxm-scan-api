function includesAny(str, arr) {
  const s = String(str || "").toLowerCase();
  return arr.some((x) => s.includes(x));
}

function startsWithAny(str, arr) {
  const s = String(str || "").toLowerCase();
  return arr.some((x) => s.startsWith(x));
}

function scoreBucket(bucket) {
  const label = String(bucket.label || "").toLowerCase();
  const patterns = bucket.children || [];

  const blockedBucketHints = [
    "legal", "privacy", "terms", "cookies",
    "search", "sitemap", "robots",
    "auth", "login", "signin", "account"
  ];

  // hard negative
  if (startsWithAny(label, blockedBucketHints)) return -1000;

  // positive hints (universal)
  const goodHints = [
    "product", "products", "pricing", "plans",
    "features", "solutions",
    "docs", "documentation", "developers", "api",
    "support", "help",
    "blog", "news", "articles",
    "about", "company",
    "contact", "careers"
  ];

  let score = 0;

  // Base: how many patterns
  score += Math.min(patterns.length, 50); // cap

  // Add some weight for total count, but cap to avoid huge noisy buckets dominating
  score += Math.min(bucket.count || 0, 500) / 10;

  // Boost if label matches good hints
  if (includesAny(label, goodHints)) score += 50;

  // Boost if patterns include good hints
  const topPatternsText = patterns
    .slice(0, 20)
    .map((p) => p.pattern || p.label || "")
    .join(" ")
    .toLowerCase();

  if (includesAny(topPatternsText, goodHints)) score += 30;

  return score;
}

function buildCapturedPagesFromFullStructure(fullStructure, options = {}) {
  const maxBuckets = options.maxBuckets ?? 4;
  const maxPatternsPerBucket = options.maxPatternsPerBucket ?? 5;

  const blockedPatternIncludes = [
    "/search", "/legal", "/privacy", "/terms", "/cookies",
    "/sitemap", "/robots",
    "/signin", "/login", "/auth",
    "utm_", "gclid", "fbclid"
  ];

  const bucketsAll = fullStructure?.children || [];

  // 1) score buckets and pick best
  const buckets = bucketsAll
    .map((b) => ({ bucket: b, score: scoreBucket(b) }))
    .filter((x) => x.score > -500)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBuckets)
    .map((x) => x.bucket);

  // 2) pick top patterns per bucket (filtered)
  const capturedPages = [];

  for (const bucket of buckets) {
    const patternsAll = bucket.children || [];

    let patterns = patternsAll.filter((p) => {
      const pat = String(p.pattern || p.label || "").toLowerCase();
      return !blockedPatternIncludes.some((x) => pat.includes(x));
    });

    patterns.sort((a, b) => (b.count || 0) - (a.count || 0));
    patterns = patterns.slice(0, maxPatternsPerBucket);

    for (const p of patterns) {
      if (!p.exampleUrl) continue;

      capturedPages.push({
        url: p.exampleUrl,
        bucket: bucket.label,
        pattern: p.pattern || p.label,
        count: p.count || 1
      });
    }
  }

  return capturedPages;
}

module.exports = { buildCapturedPagesFromFullStructure };
