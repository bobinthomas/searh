import type { Metadata } from "next";
import { Manrope, Archivo_Black } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-display",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-heavy",
});

export const metadata: Metadata = {
  title: "serahbobin — drawing portfolio",
  description:
    "Sketchbook pages, still life, colour studies and illustration by serahbobin.",
  authors: [{ name: "serahbobin" }],
  openGraph: {
    type: "website",
    title: "serahbobin — drawing portfolio",
    description:
      "Sketchbook pages, still life, colour studies and illustration by serahbobin.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${archivoBlack.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </head>
      <body>{children}</body>
    </html>
  );
}
