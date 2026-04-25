import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deaf Territory",
  description: "Search Iloilo barangays, view administrative boundaries, and inspect PSGC-linked details.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={bodyFont.variable}>{children}</body>
    </html>
  );
}
