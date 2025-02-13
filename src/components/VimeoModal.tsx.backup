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
      appElement={typeof window !== 'undefined' ? document.body : undefined}
    >
      <ReactPlayer
        url={vimeoUrl}
        width="100%"
        height="100%"
        controls={true}
        playing={true}
        config={{
          vimeo: {
            playerOptions: {
              responsive: true,
              autoplay: true,
              controls: true,
              background: false
            }
          }
        }}
      />
    </ReactModal>
  );
};

export default VimeoModal;
