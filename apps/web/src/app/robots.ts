import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Emitted as a static /robots.txt (works under `output: "export"`).
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      // GEO: answer engines are opt-in for many sites. This game wants to be cited, so
      // the crawlers behind ChatGPT / Claude / Perplexity / Google AI are allowed explicitly.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-User",
          "Claude-SearchBot",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot-Extended",
          "meta-externalagent",
          "Bingbot",
          "DuckAssistBot",
          "cohere-ai"
        ],
        allow: "/"
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
