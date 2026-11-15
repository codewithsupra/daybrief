import type { AttentionCategory } from "@/db/schema";

export const CATEGORY_LABELS: Record<AttentionCategory, string> = {
  work_learning: "Work & learning",
  creator: "Creating",
  entertainment: "Entertainment",
  social: "Social",
  news: "News",
  shopping: "Shopping",
  other: "Other",
};

/** Categories that count as time spent on the user's goals. */
export const ALIGNED: AttentionCategory[] = ["work_learning", "creator"];

const DOMAIN_RULES: Record<string, AttentionCategory> = {
  "github.com": "work_learning",
  "gitlab.com": "work_learning",
  "stackoverflow.com": "work_learning",
  "developer.mozilla.org": "work_learning",
  "docs.google.com": "work_learning",
  "drive.google.com": "work_learning",
  "calendar.google.com": "work_learning",
  "notion.so": "work_learning",
  "linear.app": "work_learning",
  "atlassian.net": "work_learning",
  "slack.com": "work_learning",
  "figma.com": "work_learning",
  "claude.ai": "work_learning",
  "chatgpt.com": "work_learning",
  "coursera.org": "work_learning",
  "udemy.com": "work_learning",
  "khanacademy.org": "work_learning",
  "wikipedia.org": "work_learning",
  "vercel.com": "work_learning",
  "linkedin.com": "work_learning",
  "studio.youtube.com": "creator",
  "canva.com": "creator",
  "substack.com": "creator",
  "medium.com": "creator",
  "wordpress.com": "creator",
  "netflix.com": "entertainment",
  "primevideo.com": "entertainment",
  "hotstar.com": "entertainment",
  "disneyplus.com": "entertainment",
  "twitch.tv": "entertainment",
  "spotify.com": "entertainment",
  "youtube.com": "entertainment",
  "x.com": "social",
  "twitter.com": "social",
  "instagram.com": "social",
  "facebook.com": "social",
  "reddit.com": "social",
  "tiktok.com": "social",
  "threads.net": "social",
  "web.whatsapp.com": "social",
  "discord.com": "social",
  "news.ycombinator.com": "news",
  "nytimes.com": "news",
  "bbc.com": "news",
  "bbc.co.uk": "news",
  "theguardian.com": "news",
  "cnn.com": "news",
  "reuters.com": "news",
  "timesofindia.indiatimes.com": "news",
  "amazon.com": "shopping",
  "amazon.in": "shopping",
  "amazon.ae": "shopping",
  "flipkart.com": "shopping",
  "ebay.com": "shopping",
  "noon.com": "shopping",
};

const LEARNING_TITLE =
  /\b(tutorial|course|lecture|lesson|explained|explainer|how to|how do|guide|walkthrough|crash course|documentation|docs|deep dive|masterclass|interview prep|system design|for beginners|conference|keynote|talk)\b/i;

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** The domain and each parent, most specific first: a.b.com → [a.b.com, b.com]. */
export function domainChain(domain: string): string[] {
  const parts = domain.split(".");
  const out: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) out.push(parts.slice(i).join("."));
  return out;
}

export function isBlocked(domain: string, blocklist: string[]): boolean {
  const set = new Set(blocklist.map((d) => d.trim().toLowerCase().replace(/^www\./, "")));
  return domainChain(domain).some((d) => set.has(d));
}

/**
 * Rule-based category, or null when the rules don't know the domain.
 * YouTube is entertainment unless the title reads like something being learned.
 */
export function ruleCategory(domain: string, title: string): AttentionCategory | null {
  for (const d of domainChain(domain)) {
    const hit = DOMAIN_RULES[d];
    if (!hit) continue;
    if (d === "youtube.com" && LEARNING_TITLE.test(title)) return "work_learning";
    return hit;
  }
  return null;
}

/**
 * Strip everything that could carry private data from a URL before it is stored:
 * query string and fragment go, except the video id on YouTube watch pages.
 */
export function sanitizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const video = u.hostname.endsWith("youtube.com") && u.pathname === "/watch" ? u.searchParams.get("v") : null;
  return `${u.origin}${u.pathname}${video ? `?v=${encodeURIComponent(video)}` : ""}`;
}
