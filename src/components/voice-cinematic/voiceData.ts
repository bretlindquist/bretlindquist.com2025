export interface MoodTheme {
  gradient: string;
  glow: string;
  accent: string;
  label: string;
}

export interface Track {
  title: string;
  src: string;
  description: string;
  category: string;
  mood: MoodTheme;
}

export const tracks: Track[] = [
  {
    title: "Bret's Reel",
    src: "https://ucarecdn.com/46c9f4ee-f6f9-467a-a2f3-71d5f4503376/BretLindquist2025Samples.mp3",
    description: "A curated showcase of range, emotion, and versatility.",
    category: "Demo Reel",
    mood: {
      gradient: "linear-gradient(135deg, hsl(210, 80%, 15%), hsl(250, 60%, 10%))",
      glow: "hsla(210, 100%, 56%, 0.25)",
      accent: "hsl(210, 100%, 56%)",
      label: "Cinematic",
    },
  },
  {
    title: "Characters",
    src: "https://ucarecdn.com/93e6ae68-18a5-4253-8e5d-6174f4c608f9/2025BretCharDemo.mp3",
    description: "From villains to heroes — a world of distinct voices.",
    category: "Character Work",
    mood: {
      gradient: "linear-gradient(135deg, hsl(280, 60%, 12%), hsl(320, 50%, 10%))",
      glow: "hsla(280, 80%, 50%, 0.25)",
      accent: "hsl(280, 80%, 60%)",
      label: "Dynamic",
    },
  },
  {
    title: "Characters More",
    src: "https://ucarecdn.com/237b8f2e-4b83-457f-8740-0e85f069a004/VariousCharacters.mp3",
    description: "Extended character range — wild, weird, wonderful.",
    category: "Character Work",
    mood: {
      gradient: "linear-gradient(135deg, hsl(340, 60%, 12%), hsl(20, 50%, 10%))",
      glow: "hsla(340, 80%, 50%, 0.25)",
      accent: "hsl(340, 80%, 55%)",
      label: "Expressive",
    },
  },
  {
    title: "Video Game",
    src: "https://ucarecdn.com/1e10d202-e465-4f1a-9477-8630078312ef/calltoduty4.mp3",
    description: "Battle-ready intensity for interactive worlds.",
    category: "Gaming",
    mood: {
      gradient: "linear-gradient(135deg, hsl(120, 50%, 8%), hsl(160, 40%, 6%))",
      glow: "hsla(120, 80%, 45%, 0.25)",
      accent: "hsl(120, 80%, 50%)",
      label: "Intense",
    },
  },
  {
    title: "TV Prime Time",
    src: "https://ucarecdn.com/a5879b78-89a7-483d-b668-aa1c423fa1a8/firecountry.mp3",
    description: "The voice behind prestige television drama.",
    category: "Television",
    mood: {
      gradient: "linear-gradient(135deg, hsl(35, 70%, 12%), hsl(15, 60%, 8%))",
      glow: "hsla(35, 100%, 55%, 0.25)",
      accent: "hsl(35, 100%, 55%)",
      label: "Warm",
    },
  },
  {
    title: "TV Ad",
    src: "https://ucarecdn.com/c5ad268d-24f5-47f6-a52c-5f2bd4f9d9b7/Project1.mp3",
    description: "Conversational and compelling. Sells without selling.",
    category: "Commercial",
    mood: {
      gradient: "linear-gradient(135deg, hsl(45, 60%, 12%), hsl(30, 50%, 8%))",
      glow: "hsla(45, 90%, 55%, 0.25)",
      accent: "hsl(45, 90%, 55%)",
      label: "Smooth",
    },
  },
  {
    title: "Narration",
    src: "https://ucarecdn.com/5adfdf11-a726-4abb-820d-3969b4b3d07b/rainforests_of_borneo5.mp3",
    description: "Deep, immersive storytelling that pulls you in.",
    category: "Documentary",
    mood: {
      gradient: "linear-gradient(135deg, hsl(180, 40%, 8%), hsl(200, 50%, 6%))",
      glow: "hsla(180, 70%, 45%, 0.25)",
      accent: "hsl(180, 70%, 50%)",
      label: "Ethereal",
    },
  },
];

export const categories = [
  {
    name: "Characters",
    description: "From heroes to villains, creatures to comedians",
    trackIndex: 1,
    icon: "🎭",
  },
  {
    name: "Gaming",
    description: "Battle cries, commanders, and interactive worlds",
    trackIndex: 3,
    icon: "🎮",
  },
  {
    name: "Commercial",
    description: "TV spots, radio ads, and brand voices",
    trackIndex: 5,
    icon: "📺",
  },
  {
    name: "Narration",
    description: "Documentaries, audiobooks, and storytelling",
    trackIndex: 6,
    icon: "🎙️",
  },
];
