import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

export const trustedSources = [
  { label: "JDRF", url: "https://www.jdrf.org/research/" },
  { label: "ADA - Diabetes Care", url: "https://diabetesjournals.org/care" },
  { label: "NIDDK (NIH)", url: "https://www.niddk.nih.gov/health-information/diabetes" },
  { label: "EASD", url: "https://www.easd.org/" },
  { label: "Diabetes UK Research", url: "https://www.diabetes.org.uk/research" },
  { label: "ATTD Conference", url: "https://attd.kenes.com/" },
  { label: "Diabetologia Journal", url: "https://link.springer.com/journal/125" },
  { label: "The Lancet Diabetes & Endocrinology", url: "https://www.thelancet.com/journals/landia/home" },
  { label: "FDA Medical Devices", url: "https://www.fda.gov/medical-devices" },
  { label: "European Medicines Agency", url: "https://www.ema.europa.eu/" },
  { label: "Diabetes Technology Society", url: "https://www.diabetestechnology.org/" },
  { label: "PubMed (Diabetes Technology)", url: "https://pubmed.ncbi.nlm.nih.gov/?term=diabetes+technology+cgm+pump" }
];

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

  return uniqueByLink(results.flat())
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);
}

type NewsCachePayload = {
  updatedAt: string;
  items: NewsItem[];
};

const newsCachePath = path.join(process.cwd(), "data", "news-cache.json");

export async function refreshNewsCache(limit = 30): Promise<NewsItem[]> {
  const items = await getNewsDigest(limit);
  await mkdir(path.dirname(newsCachePath), { recursive: true });
  const payload: NewsCachePayload = {
    updatedAt: new Date().toISOString(),
    items
  };
  await writeFile(newsCachePath, JSON.stringify(payload, null, 2), "utf8");
  return items;
}

export async function getCachedNewsDigest(limit = 30): Promise<NewsItem[]> {
  try {
    const raw = await readFile(newsCachePath, "utf8");
    const parsed = JSON.parse(raw) as NewsCachePayload;
    if (!Array.isArray(parsed.items)) throw new Error("Invalid cache payload");
    return parsed.items.slice(0, limit);
  } catch {
    return getNewsDigest(limit);
  }
}
