import type { Metadata } from "next";
import "../src/index.css";
import AppProviders from "@/components/app-providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://bretlindquist.com"),
  title: {
    default: "Bret Lindquist (홍보) | Actor, Voice Actor, and Stunt Performer in Korea",
    template: "%s | Bret Lindquist",
  },
  description:
    "Professional actor and voice actor based in South Korea, with credits across Korean TV dramas, films, and commercials.",
  keywords: [
    "Bret Lindquist",
    "홍보",
    "actor Korea",
    "voice actor Korea",
    "배우",
    "성우",
    "Korean drama",
    "Korean film",
    "commercial actor",
    "stunt performer",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bret Lindquist (홍보) | Actor · Voice Actor | TV, Film & Commercials",
    description:
      "Professional actor and voice actor based in South Korea. Credits across major Korean TV series, films, and commercials.",
    url: "https://bretlindquist.com",
    siteName: "Bret Lindquist",
    locale: "en_US",
    alternateLocale: "ko_KR",
    type: "website",
    images: [
      {
        url: "/images/hero-headshot.webp",
        width: 1200,
        height: 1600,
        alt: "Bret Lindquist headshot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bret Lindquist (홍보) | Actor · Voice Actor",
    description: "Professional actor and voice actor in South Korea. TV dramas, film, commercials.",
    images: ["/images/hero-headshot.webp"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
