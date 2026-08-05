import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Analytics | Eduxellence Solutions",
  description: "Data-driven insights and analytics services from Eduxellence Solutions.",
  icons: {
    icon: "/Eduxellence.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}