import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Bricolage_Grotesque, Figtree, Kalam } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-bricolage",
  display: "swap",
});

const anekDeva = Anek_Devanagari({
  subsets: ["devanagari"],
  weight: ["600", "700"],
  variable: "--font-anek-deva",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

const description =
  "An adaptive Class 10 Physics tutor with a learner model. It maps what you actually understand, reads your reasoning (typed, spoken or handwritten) to catch misconceptions, and schedules reviews before you forget.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Samajh: the tutor that finds why you got it wrong",
  description,
  openGraph: {
    title: "Samajh: the tutor that finds out why you got it wrong",
    description,
    siteName: "Samajh",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f3f4f7",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable} ${anekDeva.variable} ${kalam.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
