import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ORG_NAME } from "@/lib/brand";

// Read from env so the document title follows NEXT_PUBLIC_ORG_NAME like the rest
// of the chrome does (static `metadata` can't read it ergonomically).
export function generateMetadata(): Metadata {
  return {
    title: `${ORG_NAME} — Admin`,
    description: "National Winter Sports Federation — admin panel",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
