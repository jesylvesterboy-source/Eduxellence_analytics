import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";

// ✅ Load Google Fonts via Next.js Font Optimization for better performance & zero layout shift
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// ✅ Comprehensive SEO & Social Sharing Metadata
export const metadata: Metadata = {
  metadataBase: new URL("https://experts.eduxellence.org"),
  title: {
    default: "Eduxellence Experts | Freelance Data Analysts & Software Experts",
    template: "%s | Eduxellence Experts",
  },
  description: "Connect with verified data analysts, agronomists, and software development experts on the Eduxellence platform.",
  authors: [{ name: "Eduxellence Solutions", url: "https://experts.eduxellence.org" }],
  creator: "Eduxellence Solutions",
  publisher: "Eduxellence Solutions",
  alternates: {
    canonical: "https://experts.eduxellence.org",
  },
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
    url: "https://experts.eduxellence.org",
    title: "Eduxellence Experts",
    description: "Connect with verified data analysts and software development experts.",
    siteName: "Eduxellence Experts",
    images: [
      {
        url: "/Eduxellence.ico",
        width: 512,
        height: 512,
        alt: "Eduxellence Experts Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eduxellence Experts",
    description: "Connect with verified data analysts and software development experts.",
    images: ["/Eduxellence.ico"],
  },
  icons: {
    icon: "/Eduxellence.ico",
    apple: "/Eduxellence.ico",
    shortcut: "/Eduxellence.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#1C6EF2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}