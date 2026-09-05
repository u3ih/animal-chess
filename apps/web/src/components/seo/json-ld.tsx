import { buildJsonLd } from "@/lib/seo";

/**
 * Server component: emits the schema.org graph as a single `application/ld+json` block.
 * Rendered from the root layout so it survives the static export (the game page itself is
 * a client component and would otherwise ship no machine-readable description at all).
 */
export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inlined verbatim; content is build-time constant
      dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd()).replace(/</g, "\\u003c") }}
    />
  );
}
