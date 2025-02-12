import React from 'react';
import ReactModal from 'react-modal';
import ReactPlayer from 'react-player';

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
        config={{
          vimeo: {
            playerOptions: {
              responsive: true,
              autoplay: true,
              controls: false,
              background: true
            }
          }
        }}
      />
    </ReactModal>
  );
};

export default VimeoModal;
