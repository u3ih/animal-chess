/**
 * Single source of truth for SEO/GEO metadata: canonical URLs, marketing copy and the
 * JSON-LD graph. Kept out of `layout.tsx` so `robots.ts`, `sitemap.ts` and the OG image
 * route all describe the same site.
 *
 * GEO (Generative Engine Optimization) note: answer engines lean on structured data and
 * plain-language Q&A far more than on keyword density, so the FAQ entities below mirror
 * the in-app rules modal copy 1:1 — see `public/llms.txt` for the crawler-facing summary.
 */

/** Production origin (GitHub Pages custom domain). Overridable for previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://chess.u3ih.io.vn").replace(/\/+$/, "");

export const SITE_NAME = "Animal Chess";
export const SITE_ALTERNATE_NAMES = ["Cờ Thú", "Dou Shou Qi", "Jungle Chess", "斗兽棋"];

/** Vietnamese is the default UI language, so `vi` copy is the one that ships in <head>. */
export const SITE_DESCRIPTION =
  "Chơi Cờ Thú (Dou Shou Qi) 3D miễn phí trên trình duyệt: đấu AI 3 mức độ hoặc chơi online với bạn bè. " +
  "Luật chuột bắt voi, sông, bẫy và hang được mô phỏng đầy đủ. Không cần cài đặt.";

export const SITE_DESCRIPTION_EN =
  "Play free 3D Animal Chess (Dou Shou Qi / Jungle Chess) in your browser: three AI difficulties or online " +
  "matches against friends. Full rules — rat beats elephant, river, traps and dens. No install required.";

export const SITE_KEYWORDS = [
  "cờ thú",
  "co thu online",
  "cờ thú 3D",
  "animal chess",
  "dou shou qi",
  "jungle chess",
  "斗兽棋",
  "game cờ thú miễn phí",
  "chơi cờ thú với máy",
  "board game online"
];

export const OG_IMAGE = { url: `${SITE_URL}/opengraph-image.png`, width: 1200, height: 630, type: "image/png" };

/** Publisher identity — reused as `author` + `publisher` in the JSON-LD graph. */
export const PUBLISHER = { name: "u3ih", url: "https://u3ih.io.vn" };

/**
 * Rules Q&A, phrased the way a person asks an answer engine. Mirrors `rules.*` in
 * `@animal-chess/i18n` — update both when the rules copy changes.
 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "Cờ Thú (Dou Shou Qi) chơi như thế nào?",
    a: "Bàn cờ 9 hàng × 7 cột. Mỗi quân đi 1 ô ngang hoặc dọc. Quân mạnh hơn hoặc bằng cấp bậc thì ăn được quân địch. Thắng khi đưa một quân vào hang đối phương hoặc ăn hết quân địch."
  },
  {
    q: "Thứ tự mạnh yếu của các quân cờ thú là gì?",
    a: "Từ mạnh đến yếu: Voi (8), Sư tử (7), Hổ (6), Báo (5), Chó sói (4), Chó (3), Mèo (2), Chuột (1)."
  },
  {
    q: "Vì sao chuột ăn được voi trong cờ thú?",
    a: "Đây là ngoại lệ cấp bậc của luật Dou Shou Qi: Chuột (1) ăn được Voi (8), nhưng Voi không ăn được Chuột."
  },
  {
    q: "Quân nào xuống nước và nhảy qua sông được?",
    a: "Chỉ Chuột được vào ô nước. Sư tử và Hổ nhảy qua sông theo hàng hoặc cột, trừ khi có một con Chuột đứng chắn trên đường nhảy. Không được ăn quân khi vượt qua sông."
  },
  {
    q: "Bẫy và hang trong cờ thú có tác dụng gì?",
    a: "Quân địch đứng trên bẫy của bạn mất hết sức mạnh — bất kỳ quân nào của bạn cũng ăn được nó. Không quân nào được vào hang của chính mình; đưa quân vào hang đối phương là thắng ngay."
  },
  {
    q: "Chơi cờ thú online miễn phí ở đâu?",
    a: `${SITE_NAME} tại ${SITE_URL} chơi miễn phí ngay trên trình duyệt, không cần tải app: đấu AI ba mức độ Dễ/Vừa/Khó hoặc đấu online với người chơi khác.`
  }
];

/**
 * Full JSON-LD `@graph`. One graph (rather than several <script> tags) lets the entities
 * cross-reference by `@id`, which is what crawlers use to tie the game to its publisher.
 */
export function buildJsonLd() {
  const siteId = `${SITE_URL}/#website`;
  const gameId = `${SITE_URL}/#game`;
  const publisherId = `${SITE_URL}/#publisher`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": publisherId,
        name: PUBLISHER.name,
        url: PUBLISHER.url
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        description: SITE_DESCRIPTION,
        inLanguage: ["vi-VN", "en-US"],
        publisher: { "@id": publisherId }
      },
      {
        // VideoGame is a SoftwareApplication subtype; adding WebApplication makes the
        // "free browser game" reading explicit for engines that only understand the latter.
        "@type": ["VideoGame", "WebApplication"],
        "@id": gameId,
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        image: OG_IMAGE.url,
        applicationCategory: "GameApplication",
        genre: ["Board game", "Strategy", "Abstract strategy"],
        gamePlatform: ["Web browser", "PC", "Mobile"],
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript and WebGL",
        playMode: ["SinglePlayer", "MultiPlayer"],
        numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
        inLanguage: ["vi-VN", "en-US"],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "VND", availability: "https://schema.org/InStock" },
        author: { "@id": publisherId },
        publisher: { "@id": publisherId },
        isPartOf: { "@id": siteId }
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        isPartOf: { "@id": siteId },
        about: { "@id": gameId },
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a }
        }))
      }
    ]
  };
}
