import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://osfit.akramcodez.tech"),
  title: {
    default: "OSFIT - Open Source File Intelligence Tool",
    template: "%s | OSFIT",
  },
  description:
    "AI-powered GitHub code analyzer. Explain files, generate flowcharts, and solve issues in 20+ languages.",
  keywords: [
    "github",
    "code analysis",
    "ai",
    "file explainer",
    "flowchart",
    "issue solver",
    "multilingual",
    "open source",
    "developer tools",
    "code documentation",
  ],
  authors: [{ name: "SK Akram", url: "https://github.com/akramcodez" }],
  creator: "SK Akram",
  publisher: "OSFIT",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://osfit.akramcodez.tech",
    title: "OSFIT - Open Source File Intelligence Tool",
    description:
      "AI-powered GitHub code analyzer. Explain files, generate flowcharts, and solve issues in 20+ languages.",
    siteName: "OSFIT",
    images: [
      {
        url: "/osfit-og.png",
        width: 1200,
        height: 630,
        alt: "OSFIT - Open Source File Intelligence Tool",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSFIT - Open Source File Intelligence Tool",
    description:
      "AI-powered GitHub code analyzer. Explain files, generate flowcharts, and solve issues in 20+ languages.",
    creator: "@AkramCodez",
    images: [
      {
        url: "/osfit-og.png",
        alt: "OSFIT - Open Source File Intelligence Tool",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
