import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Animal Chess",
  description: "Nostalgic Animal Chess web game"
};

// Prefix the CSS backdrop with basePath so it resolves under the GitHub Pages
// subpath (e.g. /animal-chess/assets/...). Empty for the normal build.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body style={{ "--bg-image": `url(${basePath}/assets/jungle-backdrop.png)` } as React.CSSProperties}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
