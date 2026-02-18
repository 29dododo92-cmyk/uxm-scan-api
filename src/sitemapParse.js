const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

function asArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function parseSitemapXml(xmlText) {
  const data = parser.parse(xmlText);

  // sitemapindex → contains <sitemap><loc>
  if (data && data.sitemapindex) {
    const sitemaps = asArray(data.sitemapindex.sitemap)
      .map((s) => s.loc)
      .filter(Boolean);

    return { type: "index", sitemaps };
  }

  // urlset → contains <url><loc>
  if (data && data.urlset) {
    const urls = asArray(data.urlset.url)
      .map((u) => u.loc)
      .filter(Boolean);

    return { type: "urlset", urls };
  }

  throw new Error("Unknown sitemap XML format");
}

module.exports = { parseSitemapXml };
