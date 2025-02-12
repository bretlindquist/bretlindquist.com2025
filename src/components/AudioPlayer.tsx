"use client";

import React from 'react';
import ReactHowler from 'react-howler';

const AudioPlayer = ({ src }) => {
  return <ReactHowler src={src} playing={false} />;
};

export default AudioPlayer;
