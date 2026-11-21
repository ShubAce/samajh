import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Anek_Latin, Kalam } from "next/font/google";
import "./globals.css";

const anek = Anek_Latin({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-anek",
  display: "swap",
});

const anekDeva = Anek_Devanagari({
  subsets: ["devanagari"],
  axes: ["wdth"],
  variable: "--font-anek-deva",
  display: "swap",
});

const kalam = Kalam({
  subsets: ["latin", "devanagari"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Samajh: the tutor that finds why you got it wrong",
  description:
    "An adaptive Class 10 Physics tutor with a learner model. It maps what you actually understand, reads your reasoning (typed, spoken or handwritten) to catch misconceptions, and schedules reviews before you forget.",
};

export const viewport: Viewport = {
  themeColor: "#fdfdfb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anek.variable} ${anekDeva.variable} ${kalam.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
