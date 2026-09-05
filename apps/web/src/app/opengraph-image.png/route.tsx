import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/seo";

/**
 * Social preview card. A route handler (not the `opengraph-image` metadata convention) so the
 * emitted file keeps its `.png` extension — static hosts serve by extension, and an
 * extensionless file would reach scrapers as octet-stream and be dropped.
 */
export const dynamic = "force-static";

const SIZE = { width: 1200, height: 630 };
const PIECES = ["🐘", "🦁", "🐅", "🐆", "🐺", "🐕", "🐈", "🐁"];

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 28,
        padding: 72,
        background: "linear-gradient(135deg, #0b1a12 0%, #123324 55%, #1d5137 100%)",
        color: "#f2f7f2",
        fontFamily: "sans-serif"
      }}
    >
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#8fd6a8" }}>DOU SHOU QI · CỜ THÚ</div>
      <div style={{ display: "flex", fontSize: 104, fontWeight: 900, lineHeight: 1 }}>Animal Chess</div>
      <div style={{ display: "flex", fontSize: 38, color: "#cfe6d6" }}>
        Bàn cờ 3D — đấu AI hoặc chơi online, miễn phí trên trình duyệt.
      </div>
      <div style={{ display: "flex", gap: 18, fontSize: 62 }}>
        {PIECES.map((piece) => (
          <span key={piece}>{piece}</span>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: "#8fd6a8" }}>{SITE_URL.replace(/^https?:\/\//, "")}</div>
    </div>,
    SIZE
  );
}
