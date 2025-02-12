"use client";

import React from 'react';
import ReactModal from 'react-modal';
import ReactPlayer from 'react-player';

ReactModal.setAppElement("#__next"); // Attach modal to #__next

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
      <button onClick={onRequestClose} className="close-button">
        Close
      </button>
      <ReactPlayer url={vimeoUrl} width="100%" height="100%" controls />
    </ReactModal>
  );
};

export default VimeoModal;
