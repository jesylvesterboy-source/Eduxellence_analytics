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
  metadataBase: new URL("https://analytics.eduxellence.org"),
  title: {
    default: "Eduxellence Analytics | Data-Driven Insights & Educational Analytics",
    template: "%s | Eduxellence Analytics",
  },
  description: "Advanced educational data analytics, performance metrics, predictive insights, and institutional reporting tools powered by Eduxellence Solutions.",
  keywords: [
    "education analytics",
    "school data analytics",
    "academic performance tracking",
    "institutional reporting",
    "predictive student analytics",
    "eduxellence analytics",
    "data-driven insights"
  ],
  authors: [{ name: "Eduxellence Solutions", url: "https://analytics.eduxellence.org" }],
  creator: "Eduxellence Solutions",
  publisher: "Eduxellence Solutions",
  alternates: {
    canonical: "https://analytics.eduxellence.org",
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
    url: "https://analytics.eduxellence.org",
    title: "Eduxellence Analytics | Data-Driven Educational Insights",
    description: "Advanced institutional performance metrics, student progress analytics, and custom data visualization dashboards.",
    siteName: "Eduxellence Analytics",
    images: [
      {
        url: "/Eduxellence.ico",
        width: 512,
        height: 512,
        alt: "Eduxellence Analytics Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Eduxellence Analytics | Data-Driven Insights",
    description: "Transform raw educational data into actionable insights for institutional growth.",
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