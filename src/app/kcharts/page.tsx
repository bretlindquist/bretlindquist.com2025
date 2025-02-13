'use client'; // Marks all code inside as client-side

import React, { useState } from 'react';
import ReactPlayer from 'react-player';

const ProjectDetailPage = () => {
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const handlePlayVideo = () => {
        setIsVideoPlaying(true);
    };

    const handleCloseVideo = () => {
        setIsVideoPlaying(false);
    };

    return (
        <div className="project-container opacity-0 animate-fade-in"> {/* Added fade-in animation class */}
            {/* Video Header */}
            <div className="v-head relative flex items-center justify-center h-screen">
                {/* Thumbnail (Placeholder) */}
                <div
                    className="thumb-video absolute top-0 h-[92.375vh] w-full bg-cover bg-center z-10 cursor-pointer"
                    style={{ backgroundImage: `url('/img/ayia-easy-thumbnail.jpg')` }} // Replace with actual thumbnail URL
                    onClick={handlePlayVideo}
                ></div>

                {/* ReactPlayer Component */}
                {isVideoPlaying && (
                    <div className="fixed top-0 left-0 w-screen h-screen z-50 bg-black flex items-center justify-center" onClick={handleCloseVideo}>
                        <ReactPlayer
                            url="https://vimeo.com/393488792" // Replace with your Vimeo or video URL
                            playing={true}
                            controls={true}
                            width="100%"
                            height="100%"
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                )}
                {!isVideoPlaying && (
                    <div className="play absolute uppercase w-full h-[92.375vh] right-[-24px] z-99 pointer-events-none flex items-center justify-center">
                        <span>PLAY</span>
                    </div>)}
            </div>

            {/* Project Information */}
            <div className="v-infos relative flex items-center justify-between w-full">
                <div className='flex flex-col items-center justify-center'>
                    <h1 className="text-white text-4xl text-center">Ayia 'Easy'</h1>
                    <p className="text-white text-center">A film by Salomon Ligthelm</p>
                </div>
            </div>
            {/* Text Content */}
            <div className="text-white text-center p-4">
                <p>
                    This is a sample description of the Ayia 'Easy' project. Replace this with the actual project description.
                </p>
            </div>

            {/* Image Gallery */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                <img src="/img/ayia-easy-1.jpg" alt="Image 1" className="w-full" /> {/* Replace with actual image URLs */}
                <img src="/img/ayia-easy-2.jpg" alt="Image 2" className="w-full" />
                <img src="/img/ayia-easy-3.jpg" alt="Image 3" className="w-full" />
                <img src="/img/ayia-easy-4.jpg" alt="Image 4" className="w-full" />
                <img src="/img/ayia-easy-5.jpg" alt="Image 5" className="w-full" />
                <img src="/img/ayia-easy-6.jpg" alt="Image 6" className="w-full" />
            </div>
        </div>
    );
};

export default ProjectDetailPage;
