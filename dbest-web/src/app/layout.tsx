import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DBest — Database Engine for Seamless Transformations",
  description: "Visual query builder and database engine IDE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} style={{ height: "100%" }}>
      <body style={{ height: "100%", overflow: "hidden" }}>{children}</body>
    </html>
  );
}

