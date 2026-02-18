function buildCapturedPagesFromFullStructure(fullStructure, options = {}) {
  const maxBuckets = options.maxBuckets ?? 4;
  const maxPatternsPerBucket = options.maxPatternsPerBucket ?? 5;

  const capturedPages = [];
  const buckets = (fullStructure?.children || []).slice(0, maxBuckets);

  for (const bucket of buckets) {
    const patterns = (bucket.children || []).slice(0, maxPatternsPerBucket);

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
