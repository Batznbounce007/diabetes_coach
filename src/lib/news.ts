import { prisma } from "@/lib/prisma";
import { trustedSources } from "@/lib/newsSources";

export type NewsItem = {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  topic: string;
  imageUrl?: string;
};

type NewsFeedConfig = {
  topic: string;
  source: string;
  url: string;
};

const feeds: NewsFeedConfig[] = [
  {
    topic: "Diabetes Forschung",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=diabetes+research+trial&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Neue CGMs",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=continuous+glucose+monitor+CGM+new&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Insulinpumpen",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=insulin+pump+diabetes+new&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Closed Loop",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=closed+loop+diabetes+system&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "AID / APS Systeme",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=automated+insulin+delivery+system+diabetes&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Dexcom Updates",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=dexcom+g7+diabetes+news&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Libre Updates",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=freestyle+libre+3+diabetes+news&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Pumpen Innovation",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=insulin+pump+innovation+diabetes&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "FDA Diabetes Tech",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=FDA+diabetes+device+approval+CGM+pump&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "EMA / EU Device News",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=EMA+medical+device+diabetes+CGM+pump&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Type 1 Technologie",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=type+1+diabetes+technology+CGM+closed+loop&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Clinical Trials",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=diabetes+CGM+pump+clinical+trial+results&hl=en-US&gl=US&ceid=US:en"
  },
  {
    topic: "Digital Health Diabetes",
    source: "Google News",
    url: "https://news.google.com/rss/search?q=digital+health+diabetes+monitoring+AI&hl=en-US&gl=US&ceid=US:en"
  }
];

export { trustedSources };

function textBetween(input: string, startTag: string, endTag: string): string {
  const start = input.indexOf(startTag);
  if (start === -1) return "";
  const from = start + startTag.length;
  const end = input.indexOf(endTag, from);
  if (end === -1) return "";
  return input.slice(from, end).trim();
}

function stripCdata(value: string): string {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function cleanFeedText(value: string): string {
  return decodeHtmlEntities(stripHtmlTags(stripCdata(value))).replace(/\s+/g, " ").trim();
}

function parseAttribute(tag: string, attr: string): string {
  const regex = new RegExp(`${attr}=["']([^"']+)["']`, "i");
  const match = tag.match(regex);
  return match?.[1]?.trim() ?? "";
}

function parseImageFromDescription(itemXml: string): string {
  const description = textBetween(itemXml, "<description>", "</description>");
  if (!description) return "";
  const decoded = stripCdata(description);
  const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch?.[1]?.trim() ?? "";
}

function parseImageUrl(itemXml: string): string {
  const mediaContentMatch = itemXml.match(/<media:content\b[^>]*>/i);
  if (mediaContentMatch) {
    const url = parseAttribute(mediaContentMatch[0], "url");
    if (url) return url;
  }

  const mediaThumbMatch = itemXml.match(/<media:thumbnail\b[^>]*>/i);
  if (mediaThumbMatch) {
    const url = parseAttribute(mediaThumbMatch[0], "url");
    if (url) return url;
  }

  const enclosureMatch = itemXml.match(/<enclosure\b[^>]*>/i);
  if (enclosureMatch) {
    const type = parseAttribute(enclosureMatch[0], "type").toLowerCase();
    const url = parseAttribute(enclosureMatch[0], "url");
    if (url && type.startsWith("image/")) return url;
  }

  return parseImageFromDescription(itemXml);
}

function pickTopicAccent(topic: string): { bg: string; fg: string; icon: string } {
  const key = topic.toLowerCase();
  if (key.includes("forschung") || key.includes("research")) {
    return { bg: "#E8F6EE", fg: "#0F5132", icon: "🧪" };
  }
  if (key.includes("cgm") || key.includes("sensor")) {
    return { bg: "#E8F1FF", fg: "#1E3A8A", icon: "📈" };
  }
  if (key.includes("pumpe") || key.includes("pump")) {
    return { bg: "#FFF3E8", fg: "#9A3412", icon: "💉" };
  }
  if (key.includes("loop") || key.includes("aid") || key.includes("aps")) {
    return { bg: "#F3E8FF", fg: "#6B21A8", icon: "🔁" };
  }
  return { bg: "#ECFDF5", fg: "#065F46", icon: "🩺" };
}

function buildFallbackThumbnail(topic: string): string {
  const accent = pickTopicAccent(topic);
  const label = topic.slice(0, 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
  <rect width="112" height="112" rx="14" fill="${accent.bg}" />
  <text x="56" y="44" text-anchor="middle" font-size="22">${accent.icon}</text>
  <text x="56" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${accent.fg}">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function parseMetaImage(html: string): string {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

async function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichItem(item: NewsItem): Promise<NewsItem> {
  const fallbackThumbnail = buildFallbackThumbnail(item.topic);
  if (item.imageUrl) {
    return { ...item, imageUrl: item.imageUrl || fallbackThumbnail };
  }

  try {
    const resolved = await withTimeout(
      (signal: AbortSignal) =>
        fetch(item.link, {
          redirect: "follow",
          signal,
          headers: {
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36"
          }
        }),
      7000
    );

    if (!resolved.ok) {
      return { ...item, imageUrl: fallbackThumbnail };
    }

    const finalUrl = resolved.url || item.link;
    const html = await resolved.text();
    const metaImage = parseMetaImage(html);

    return {
      ...item,
      link: finalUrl,
      imageUrl: metaImage || fallbackThumbnail
    };
  } catch {
    return { ...item, imageUrl: fallbackThumbnail };
  }
}

function parseSourceLabel(itemXml: string, fallback: string): string {
  const sourceBlock = textBetween(itemXml, "<source", "</source>");
  if (!sourceBlock) return fallback;

  // Google News often sends: url="...">Publisher Name
  const afterAngle = sourceBlock.includes(">") ? sourceBlock.split(">").slice(1).join(">") : sourceBlock;
  const cleaned = cleanFeedText(afterAngle);
  return cleaned || fallback;
}

function toIsoDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function parseRssItems(xml: string, topic: string, source: string): NewsItem[] {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  const parsed: Array<NewsItem | null> = itemMatches.map((itemXml) => {
    const title = cleanFeedText(textBetween(itemXml, "<title>", "</title>"));
    const link = stripCdata(textBetween(itemXml, "<link>", "</link>"));
    const pubDate = stripCdata(textBetween(itemXml, "<pubDate>", "</pubDate>"));
    const publisher = parseSourceLabel(itemXml, source);

    if (!title || !link) return null;

    return {
      title,
      link,
      publishedAt: toIsoDate(pubDate),
      source: publisher || source,
      topic,
      imageUrl: parseImageUrl(itemXml)
    };
  });

  return parsed.filter((item): item is NewsItem => item !== null);
}

function uniqueByLink(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

export async function getNewsDigest(limit = 30): Promise<NewsItem[]> {
  const results = await Promise.all(
    feeds.map(async (feed) => {
      try {
        const response = await fetch(feed.url, {
          next: { revalidate: 1800 }
        });
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRssItems(xml, feed.topic, feed.source).slice(0, 10);
      } catch {
        return [];
      }
    })
  );

  const baseItems = uniqueByLink(results.flat())
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);

  const enriched = await Promise.all(baseItems.map((item) => enrichItem(item)));
  return enriched;
}

export async function refreshNewsCache(limit = 30): Promise<NewsItem[]> {
  const items = await getNewsDigest(limit);
  const now = new Date();
  const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 90);

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.newsItem.upsert({
        where: { link: item.link },
        create: {
          title: item.title,
          link: item.link,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          source: item.source,
          topic: item.topic,
          imageUrl: item.imageUrl ?? null
        },
        update: {
          title: item.title,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          source: item.source,
          topic: item.topic,
          imageUrl: item.imageUrl ?? null
        }
      });
    }

    await tx.newsItem.deleteMany({
      where: {
        publishedAt: {
          lt: cutoff
        }
      }
    });
  });

  return items;
}

export async function getCachedNewsDigest(limit = 30): Promise<NewsItem[]> {
  try {
    const items = await prisma.newsItem.findMany({
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit
    });

    if (items.length === 0) {
      return await getNewsDigest(limit);
    }

    return items.map((item) => ({
      title: item.title,
      link: item.link,
      publishedAt: item.publishedAt ? item.publishedAt.toISOString() : "",
      source: item.source,
      topic: item.topic,
      imageUrl: item.imageUrl ?? undefined
    }));
  } catch {
    return getNewsDigest(limit);
  }
}
