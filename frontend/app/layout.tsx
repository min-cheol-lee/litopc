import "./globals.css";
import React from "react";
import { Inter, Jost } from "next/font/google";
import Script from "next/script";
import { AppProviders } from "../components/AppProviders";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
  weight: ["900"],
  style: ["italic"],
});

export const metadata = {
  title: "litopc",
  description: "Educational optical proximity correction sandbox",
  other: {
    "google-adsense-account": "ca-pub-3497543025675458",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ZZLNK73VZQ"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ZZLNK73VZQ');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${jost.variable}`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
