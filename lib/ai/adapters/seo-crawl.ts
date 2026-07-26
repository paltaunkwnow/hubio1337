// xd
/** Shared SEO crawl metrics — real HTML parsing only, no invented metrics. */

export function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function crawlSeoPage(url: string) {
  const normalized = normalizeUrl(url);
  const response = await fetch(normalized, {
    headers: { "User-Agent": "Mozilla/5.0 Hubio SEO Analyzer" },
  });
  const html = await response.text();
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || "";
  const metaDescription =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]?.trim() ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)?.[1]?.trim() ||
    "";

  const h1 = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)).map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim()
  );
  const h2 = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim()
  );

  // Jerarquía completa de encabezados H1-H6
  const headingCounts: Record<string, number> = {};
  for (let level = 1; level <= 6; level++) {
    headingCounts[`h${level}`] = (html.match(new RegExp(`<h${level}[\\s>]`, "gi")) || []).length;
  }

  const ogTags: Record<string, string> = {};
  Array.from(html.matchAll(/<meta[^>]+property=["'](og:[^"']+)["'][^>]+content=["']([^"']*)["']/gi)).forEach((m) => {
    ogTags[m[1]] = m[2];
  });

  // Twitter cards
  const twitterTags: Record<string, string> = {};
  Array.from(
    html.matchAll(/<meta[^>]+name=["'](twitter:[^"']+)["'][^>]+content=["']([^"']*)["']/gi)
  ).forEach((m) => {
    twitterTags[m[1]] = m[2];
  });
  Array.from(
    html.matchAll(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["'](twitter:[^"']+)["']/gi)
  ).forEach((m) => {
    if (!twitterTags[m[2]]) twitterTags[m[2]] = m[1];
  });

  const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);

  // Tipos schema.org declarados en bloques JSON-LD
  const jsonLdTypes: string[] = [];
  Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  ).forEach((m) => {
    try {
      const parsed = JSON.parse(m[1].trim());
      const collect = (node: unknown) => {
        if (!node) return;
        if (Array.isArray(node)) return node.forEach(collect);
        if (typeof node === "object") {
          const t = (node as { "@type"?: unknown })["@type"];
          if (typeof t === "string") jsonLdTypes.push(t);
          if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && jsonLdTypes.push(x));
          const graph = (node as { "@graph"?: unknown })["@graph"];
          if (graph) collect(graph);
        }
      };
      collect(parsed);
    } catch {
      /* JSON-LD inválido */
    }
  });
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)?.[1] ||
    html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i)?.[1] ||
    null;

  const words = countWords(textOnly);
  const images = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0]);
  const altCount = images.filter((tag) => /alt=["'][^"']+["']/i.test(tag)).length;
  const internalLinks = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)).filter(
    (m) => !/^https?:\/\//i.test(m[1])
  ).length;
  const externalLinks = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)).filter(
    (m) => /^https?:\/\//i.test(m[1])
  ).length;

  let hasSitemap = false;
  let hasRobots = false;
  try {
    hasSitemap = (await fetch(new URL("/sitemap.xml", normalized).toString())).ok;
  } catch {}
  try {
    hasRobots = (await fetch(new URL("/robots.txt", normalized).toString())).ok;
  } catch {}

  const frequency: Record<string, number> = {};
  textOnly
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3)
    .forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
  const topWords = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      // Densidad real: apariciones / total de palabras del cuerpo
      density: words > 0 ? Math.round((count / words) * 1000) / 10 : 0,
    }));

  let pageSpeedScore: number | null = null;
  if (process.env.GOOGLE_PAGESPEED_API_KEY) {
    try {
      const ps = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalized)}&key=${process.env.GOOGLE_PAGESPEED_API_KEY}`
      );
      const psData = await ps.json();
      pageSpeedScore = Math.round((psData?.lighthouseResult?.categories?.performance?.score || 0) * 100);
    } catch {
      pageSpeedScore = null;
    }
  }

  const missing: string[] = [];
  if (!title) missing.push("title");
  if (!metaDescription) missing.push("meta description");
  if (!h1.length) missing.push("h1");
  if (pageSpeedScore === null) missing.push("PageSpeed (GOOGLE_PAGESPEED_API_KEY no configurada o error)");

  return {
    url: normalized,
    title,
    metaDescription,
    headings: { h1, h2: h2.slice(0, 15), counts: headingCounts },
    openGraph: ogTags,
    twitterCards: twitterTags,
    schema: { hasJsonLd, jsonLdTypes: Array.from(new Set(jsonLdTypes)).slice(0, 10) },
    canonical,
    words,
    keywords: topWords,
    images: { total: images.length, withAlt: altCount, withoutAlt: images.length - altCount },
    links: { internal: internalLinks, external: externalLinks },
    technical: { hasSitemap, hasRobots, httpStatus: response.status },
    loadTimeScore: pageSpeedScore,
    missingData: missing,
    scores: {
      speed: pageSpeedScore ?? null,
      content: Math.min(100, Math.max(30, Math.round((words / 1000) * 100))),
      links: Math.min(100, Math.max(20, Math.round(((internalLinks + externalLinks) / 20) * 100))),
      technical: (hasSitemap ? 25 : 0) + (hasRobots ? 25 : 0) + (altCount === images.length ? 25 : 10) + 25,
    },
  };
}

export type SeoCrawlResult = Awaited<ReturnType<typeof crawlSeoPage>>;

/** Crawlea hasta 2 competidores en paralelo; los fallos individuales no rompen el análisis. */
export async function crawlCompetitors(urls: string[]): Promise<Array<SeoCrawlResult | { url: string; error: string }>> {
  const targets = urls.filter(Boolean).slice(0, 2);
  return Promise.all(
    targets.map(async (u) => {
      try {
        return await crawlSeoPage(u);
      } catch (e) {
        return { url: normalizeUrl(u), error: e instanceof Error ? e.message : "No se pudo analizar" };
      }
    })
  );
}
