import type { Metadata } from "next";
import Voice3DClientPage from "./voice-3d-client-page";

export const metadata: Metadata = {
  title: "Voice 3D Experience",
  description: "Interactive 3D voice reel experience for Bret Lindquist.",
  alternates: {
    canonical: "/voice-3d",
  },
};

export default function Page() {
  return <Voice3DClientPage />;
}
