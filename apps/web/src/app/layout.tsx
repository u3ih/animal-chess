import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./tailwind.css";
import "./globals.scss";
import { JsonLd } from "@/components/seo/json-ld";
import {
  OG_IMAGE,
  PUBLISHER,
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_EN,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL
} from "@/lib/seo";
import { Providers } from "./providers";

// Self-hosted at build time (works for the GitHub Pages static export too).
// Vietnamese subset included since `vi` is the default UI language.
const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Animal Chess — Cờ Thú 3D online, chơi miễn phí",
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "games",
  authors: [{ name: PUBLISHER.name, url: PUBLISHER.url }],
  creator: PUBLISHER.name,
  publisher: PUBLISHER.name,
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: "Animal Chess — Cờ Thú 3D online, chơi miễn phí",
    description: SITE_DESCRIPTION,
    // The UI ships both languages behind a client-side switch on the same URL, so this is
    // one localized document, not two — hence alternateLocale rather than hreflang alternates.
    locale: "vi_VN",
    alternateLocale: ["en_US"],
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        type: OG_IMAGE.type,
        alt: `${SITE_NAME} — Cờ Thú 3D`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Animal Chess — Cờ Thú 3D online",
    description: SITE_DESCRIPTION_EN,
    images: [OG_IMAGE.url]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }
  },
  formatDetection: { telephone: false, email: false, address: false }
};

export const viewport: Viewport = {
  themeColor: "#0b1a12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

// Prefix the CSS backdrop with basePath so it resolves under the GitHub Pages
// subpath (e.g. /animal-chess/assets/...). Empty for the normal build.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={roboto.variable}>
      <body style={{ "--bg-image": `url(${basePath}/assets/jungle-backdrop.png)` } as React.CSSProperties}>
        <JsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
