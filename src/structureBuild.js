function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = "";
    url.search = ""; // MVP: remove query params
    // remove trailing slash except root
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

function isProbablyNonHtml(pathname) {
  return /\.(jpg|jpeg|png|gif|webp|svg|pdf|xml|zip|rar|mp4|mp3|webm)$/i.test(pathname);
}

function looksLikeUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function looksLikeId(s) {
  return /^[0-9]{2,}$/.test(s);
}

function looksLikeSlug(s) {
  // long-ish segment with hyphens usually indicates a post/product slug
  return s.length >= 10 && s.includes("-");
}

function patternizePath(pathname) {
  // handle /page/2
  const pageMatch = pathname.match(/\/page\/(\d+)$/i);
  if (pageMatch) return pathname.replace(/\/page\/\d+$/i, "/page/{n}");

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";

  const last = parts[parts.length - 1];

  if (looksLikeUuid(last) || looksLikeId(last) || looksLikeSlug(last)) {
    parts[parts.length - 1] = "{slug}";
    return "/" + parts.join("/");
  }

  return "/" + parts.join("/");
}

function bucketLabelFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "Root";
  const first = parts[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function makeNode(label) {
  return { label, children: [], count: 0, exampleUrl: null, pattern: null };
}

function buildFullStructure(urls) {
  const root = { label: "Site", children: [] };

  // Map: bucket -> pattern -> node
  const bucketMap = new Map();

  for (const raw of urls) {
    const norm = normalizeUrl(raw);
    if (!norm) continue;

    const u = new URL(norm);

    if (isProbablyNonHtml(u.pathname)) continue;

    const bucket = bucketLabelFromPath(u.pathname);
    const pattern = patternizePath(u.pathname);

    if (!bucketMap.has(bucket)) bucketMap.set(bucket, new Map());
    const patternMap = bucketMap.get(bucket);

    if (!patternMap.has(pattern)) {
      const node = makeNode(pattern);
      node.pattern = pattern;
      patternMap.set(pattern, node);
    }

    const node = patternMap.get(pattern);
    node.count += 1;
    if (!node.exampleUrl) node.exampleUrl = norm;
  }

  // convert maps to tree
  for (const [bucket, patterns] of bucketMap.entries()) {
    const bucketNode = makeNode(bucket);

    const children = Array.from(patterns.values()).sort((a, b) => b.count - a.count);
    bucketNode.children = children;
    bucketNode.count = children.reduce((sum, c) => sum + c.count, 0);

    root.children.push(bucketNode);
  }

  // sort buckets by count
  root.children.sort((a, b) => b.count - a.count);

  return root;
}

module.exports = { buildFullStructure };
