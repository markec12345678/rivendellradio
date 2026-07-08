import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rivendell+RDX — Spojena radijska avtomatizacija",
  description: "Spojitev Rivendell v4.4.1 (jedro) in RDX 4.0.1 (razširitve): AES67, AAC+ streaming, pametni JACK routing, GUI broadcast control center.",
  keywords: ["Rivendell", "RDX", "radio automation", "broadcast", "AES67", "AAC+", "open-source", "Qt5"],
  authors: [{ name: "Analiza: markec fork" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
