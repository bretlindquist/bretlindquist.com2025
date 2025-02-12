import Header from "../components/Header";
import AudioPlayer from '../components/AudioPlayer';
import Image from "next/image";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-[60px]">
        <HeroSection />
        <ActingSection />
        <VoiceActingSection />
        <AboutMeSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}

const HeroSection = () => {
  return (
    <section id="hero" className="w-full h-screen">
      <Image
        src="https://ucarecdn.com/82d8fda7-534c-4576-805c-c048b96aaecd/BretLindquistActorHeadshot.webp"
        alt="Hero"
        layout="fill"
        objectFit="cover"
      />
    </section>
  );
};

const ActingSection = () => {
  const posters = [
    "https://ucarecdn.com/cdf9bad4-9b3d-475f-b5ed-fdeb700b356c/21TheFieryPriestSeason2Episode1JeremyBrownBretLindquistActoratDinnerwithLeeHoney.webp",
    "https://ucarecdn.com/6de059a5-3700-4672-8232-d36e6dcab544/BretLindquistDynamiteManChiefDetective1958Season1Episode219582.webp",
    "https://ucarecdn.com/b62d831a-49d8-41b8-89c9-524eb4e759f4/BretLindquistJangsariActor.webp",
    "https://ucarecdn.com/d47a3788-44ef-4f19-aeb5-740d14559939/BretLindquistActorReelsScreenshots.webp",
  ];

  return (
    <section id="acting" className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posters.map((poster, index) => (
          <Image
            key={index}
            src={poster}
            alt={`Poster ${index + 1}`}
            width={500}
            height={750}
            layout="responsive"
          />
        ))}
      </div>
    </section>
  );
};

const VoiceActingSection = () => {
  const audioFiles = [
    "/audio/1.mp3",
    "/audio/2.mp3",
    "/audio/3.mp3",
    "/audio/4.mp3",
    "/audio/5.mp3",
    "/audio/6.mp3",
    "/audio/7.mp3",
  ];

  return (
    <section id="voice" className="p-8">
      {audioFiles.map((file, index) => (
        <div key={index} className="mb-4">
          <AudioPlayer src={file} />
          <p>Audio {index + 1}</p>
        </div>
      ))}
    </section>
  );
};

const AboutMeSection = () => {
  return (
    <section id="about" className="p-8 flex flex-col md:flex-row items-center gap-8">
      <Image
        src="/path-to-your-photo.jpg"
        alt="About Me"
        width={300}
        height={300}
        className="rounded-lg"
      />
      <p className="text-lg leading-relaxed">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vehicula, nisi ut aliquet scelerisque, sapien arcu tristique lectus, nec tincidunt velit nisl vel metus.
      </p>
    </section>
  );
};

const ContactSection = () => {
  return (
    <section id="contact" className="p-8">
      <form action="#" method="POST" className="flex flex-col gap-4 max-w-md mx-auto">
        <input type="text" name="name" placeholder="Your Name" className="p-2 rounded-md" />
        <input type="email" name="email" placeholder="Your Email" className="p-2 rounded-md" />
        <textarea name="message" placeholder="Your Message" rows={5} className="p-2 rounded-md"></textarea>
        <button type="submit" className="bg-white text-black px-4 py-2 rounded-md">Send</button>
      </form>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-black text-white p-4 text-center">
      &copy; {new Date().getFullYear()} Bret Lindquist. All rights reserved.
    </footer>
  );
};
