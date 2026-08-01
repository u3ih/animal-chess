import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./tailwind.css";
import "./globals.scss";
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
  title: "Animal Chess",
  description: "Nostalgic Animal Chess web game"
};

// Prefix the CSS backdrop with basePath so it resolves under the GitHub Pages
// subpath (e.g. /animal-chess/assets/...). Empty for the normal build.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={roboto.variable}>
      <body style={{ "--bg-image": `url(${basePath}/assets/jungle-backdrop.png)` } as React.CSSProperties}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
