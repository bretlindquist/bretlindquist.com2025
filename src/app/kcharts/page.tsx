'use client'; // Marks all code inside as client-side

import React, { useState } from 'react';
import Image from "next/image";
import VimeoModal from '../../components/VimeoModal';

const ProjectDetailPage = () => {
  const [modalIsOpen1, setModalIsOpen1] = useState(false);
  return (
    <section id="FieryPriest-detail" className="project-container opacity-0 animate-fade-in">
      <div>{/* Added fade-in animation class */}
        {/* Video Header */}
        <div className="v-head relative flex items-center justify-center h-screen">
          {/* Thumbnail (Placeholder) */}
          <div
            className="thumb-video absolute top-0 h-[92.375vh] w-full bg-cover bg-center z-10"
            style={{ 
              backgroundImage: `url('https://ucarecdn.com/.../BretLindquistActorHeadshot.webp')`,
              cursor: 'pointer'
            }}
            onClick={() => setModalIsOpen1(true)}
          ></div>
        </div>

        {/* Project Information */}
        <div className="v-infos relative flex items-center justify-between w-full">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-white text-4xl text-center">
              열혈사제2 1회 - The Fiery Priest 2 - Episode 1
            </h1>
            <p className="text-white text-center">
              Role: Jeremy Brown - Drug Dealer - 마약상
            </p>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-white text-center p-4">
          <p>
            I play a drug dealer named Jeremy Brown. With the amazing Lee Honey.
          </p>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
          <Image 
            src="https://ucarecdn.com/cdf9bad4-9b3d-475f-b5ed-fdeb700b356c/21TheFieryPriestSeason2Episode1JeremyBrownBretLindquistActoratDinnerwithLeeHoney.webp" 
            alt="Image 1" 
            width={500} 
            height={300} 
            className="w-full"
          />
          <Image 
            src="https://ucarecdn.com/6de059a5-3700-4672-8232-d36e6dcab544/BretLindquistDynamiteManChiefDetective1958Season1Episode219582.webpg" 
            alt="Image 2" 
            width={500} 
            height={300} 
            className="w-full"
          />
          <Image 
            src="https://ucarecdn.com/b62d831a-49d8-41b8-89c9-524eb4e759f4/BretLindquistJangsariActor.webp" 
            alt="Image 3" 
            width={500} 
            height={300} 
            className="w-full"
          />
          <Image 
            src="https://ucarecdn.com/d47a3788-44ef-4f19-aeb5-740d14559939/BretLindquistActorReelsScreenshots.webp" 
            alt="Image 4" 
            width={500} 
            height={300} 
            className="w-full"
          />
          <Image 
            src="https://ucarecdn.com/d47a3788-44ef-4f19-aeb5-740d14559939/BretLindquistActorReelsScreenshots.webp" 
            alt="Image 5" 
            width={500} 
            height={300} 
            className="w-full"
          />
          <Image 
            src="https://ucarecdn.com/d47a3788-44ef-4f19-aeb5-740d14559939/BretLindquistActorReelsScreenshots.webp" 
            alt="Image 6" 
            width={500} 
            height={300} 
            className="w-full"
          />
        </div>
      </div>
      <VimeoModal
        isOpen={modalIsOpen1}
        onRequestClose={() => setModalIsOpen1(false)}
        vimeoUrl="https://vimeo.com/1046306068"
      />
    </section>
  );
};

export default ProjectDetailPage;
