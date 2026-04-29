import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Dokumente unterschreiben",
  description: "Fügen Sie Ihre Unterschrift einfach zu PDF-Dateien und Bildern hinzu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      dir="ltr"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="h-full font-[family-name:var(--font-inter)] bg-slate-950">
        {children}
      </body>
    </html>
  );
}
