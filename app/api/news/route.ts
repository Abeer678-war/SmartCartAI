// Headlines from Google News RSS (no API key needed). Note: Google News RSS is not an official, supported API.
const GL = (process.env.SERPER_GL || "in").toUpperCase(); // same country as your search results

const TOPICS: Record<string, string> = {
  sales: "online shopping sale OR deals OR discount when:7d",
  ecommerce: "e-commerce OR ecommerce OR Amazon OR Flipkart when:7d",
};

const tag = (s: string, t: string) => s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? "";

function clean(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
      const k = e.toLowerCase();
      if (k === "amp") return "&"; if (k === "lt") return "<"; if (k === "gt") return ">";
      if (k === "quot") return '"'; if (k === "apos") return "'";
      try { return String.fromCodePoint(k[1] === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)); } catch { return ""; }
    })
    .trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic") || "sales";
  let q = TOPICS[topic];
  if (topic === "product") {
    const name = (url.searchParams.get("q") || "").replace(/[^\p{L}\p{N} .,&+-]/gu, "").trim().slice(0, 80);
    if (!name) return Response.json({ error: "Missing product." }, { status: 400 });
    q = `${name} when:30d`;
  }
  if (!q) return Response.json({ error: "Unknown topic." }, { status: 400 });

  try {
    const r = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-${GL}&gl=${GL}&ceid=${GL}:en`,
      { headers: { "User-Agent": "Mozilla/5.0 (my-smart-cart)" }, next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) throw new Error("Google News " + r.status);
    const xml = await r.text();

    const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 8).map((it) => {
      const source = clean(tag(it, "source"));
      let title = clean(tag(it, "title"));
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)); // Google adds " - Source"
      let date = "";
      try { date = new Date(clean(tag(it, "pubDate"))).toISOString(); } catch {}
      return { title, link: clean(tag(it, "link")), source, date };
    }).filter((n) => n.title && n.link.startsWith("https://"));

    return Response.json({ items });
  } catch (e) {
    console.error("news failed", e);
    return Response.json({ error: "Could not load news." }, { status: 502 });
  }
}