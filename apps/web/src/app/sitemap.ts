import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Emitted as a static /sitemap.xml (works under `output: "export"`).
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Single-route SPA: the game, the lobby and the rules all live at "/".
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    }
  ];
}
