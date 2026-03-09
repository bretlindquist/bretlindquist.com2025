import type { Metadata } from "next";
import HomePage from "@/views/HomePage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Bret Lindquist",
  alternateName: ["홍보", "Bret Lindquist 홍보"],
  jobTitle: ["Actor", "Voice Actor", "Stunt Performer", "배우", "성우"],
  url: "https://bretlindquist.com",
  image: "https://bretlindquist.com/images/hero-headshot.webp",
  description:
    "Professional actor, voice actor, and stunt performer based in South Korea, with credits in Korean TV dramas, films, and commercials.",
  knowsLanguage: ["en", "ko"],
  nationality: {
    "@type": "Country",
    name: "United States",
  },
  workLocation: {
    "@type": "Place",
    name: "South Korea",
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
    },
  },
  hasOccupation: [
    {
      "@type": "Occupation",
      name: "Actor",
      occupationalCategory: "27-2011.00",
      description: "Film and television actor specializing in Korean productions",
    },
    {
      "@type": "Occupation",
      name: "Voice Actor",
      occupationalCategory: "27-2012.04",
      description: "Voice over artist for commercials, narration, video games, and TV",
    },
  ],
  performerIn: [
    { "@type": "TVSeries", name: "The Fiery Priest 2" },
    { "@type": "Movie", name: "Battle of Jangsari" },
    { "@type": "TVSeries", name: "Reels" },
  ],
  sameAs: [],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <HomePage />
    </>
  );
}
