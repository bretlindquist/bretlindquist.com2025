"use client";

import React from 'react';
import ReactModal from 'react-modal';
import ReactPlayer from 'react-player';

ReactModal.setAppElement("#__next");

interface VimeoModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  vimeoUrl: string;
}

const VimeoModal: React.FC<VimeoModalProps> = ({ isOpen, onRequestClose, vimeoUrl }) => {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      className="modal"
      overlayClassName="overlay"
    >
      <ReactPlayer 
        url={vimeoUrl} 
        width="100%" 
        height="100%" 
        controls
        playing={true}
        config={{
          vimeo: {
            playerOptions: {
              autoplay: true,
              fullscreen: true,
              responsive: true
            }
          }
        }}
      />
    </ReactModal>
  );
};

export default VimeoModal;
