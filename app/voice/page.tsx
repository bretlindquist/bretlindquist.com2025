import type { Metadata } from "next";
import VoiceCinematicPage from "@/views/VoiceCinematicPage";

export const metadata: Metadata = {
  title: "Voice Studio",
  description: "Cinematic voice reel experience for Bret Lindquist.",
  alternates: {
    canonical: "/voice",
  },
};

export default function Page() {
  return <VoiceCinematicPage />;
}
