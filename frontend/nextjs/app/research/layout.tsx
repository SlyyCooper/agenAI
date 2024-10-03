import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import PlausibleProvider from "next-plausible";
import "../globals.css";
import React from "react";

const inter = Lexend({ subsets: ["latin"] });

let title = "TANgent";
let description =
  "TANgent is pioneering the next generation of collaborative AI systems through cutting-edge multi-agent research.";
let url = "https://Tanalyze.com";
let ogimage = "/favicon.ico";
let sitename = "TANgent";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    images: [ogimage],
    title,
    description,
    url: url,
    siteName: sitename,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [ogimage],
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <PlausibleProvider domain="localhost:3000" />
      </head>
      <body className={`${inter.className} h-full flex flex-col bg-white text-gray-900`}>
        {children}
      </body>
    </html>
  );
}

