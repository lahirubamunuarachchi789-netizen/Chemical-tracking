import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Concord ChemTrack",
    template: "%s | Concord ChemTrack",
  },
  description:
    "Chemical usage tracking for Concord Footwear (Pvt) Ltd - record, monitor and report chemical consumption.",
  applicationName: "Concord ChemTrack",
  keywords: [
    "Concord Footwear",
    "ChemTrack",
    "chemical tracking",
    "chemical usage",
  ],
  authors: [{ name: "Concord Footwear (Pvt) Ltd" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b3263",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
