// /src/components/VimeoModal.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import ReactModal from 'react-modal';
import ReactPlayer from 'react-player';
import Player from '@vimeo/player';

interface VimeoModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  vimeoUrl: string;
}

const VimeoModal: React.FC<VimeoModalProps> = ({ isOpen, onRequestClose, vimeoUrl }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);

  // This callback will be called once the ReactPlayer is ready.
  const handlePlayerReady = useCallback(() => {
    if (playerRef.current) {
      // Get the internal player element (the underlying iframe)
      const internalPlayer = playerRef.current.getInternalPlayer();
      // Create a Vimeo Player instance from the iframe.
      vimeoPlayerRef.current = new Player(internalPlayer);

      // Listen for fullscreen changes.
      // On mobile, when the native fullscreen player is dismissed,
      // the 'fullscreenchange' event fires.
      vimeoPlayerRef.current.on('fullscreenchange', (data: { fullscreen: boolean }) => {
        // If the video is no longer fullscreen, close the modal.
        if (!data.fullscreen) {
          onRequestClose();
        }
      });
    }
  }, [onRequestClose]);

  // Cleanup when the modal unmounts or when isOpen changes.
  useEffect(() => {
    return () => {
      if (vimeoPlayerRef.current) {
        vimeoPlayerRef.current.off('fullscreenchange');
        vimeoPlayerRef.current.destroy();
        vimeoPlayerRef.current = null;
      }
    };
  }, []);

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      // Ensure overlay click and ESC key close the modal on desktop.
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className="modal"
      overlayClassName="overlay"
      appElement={typeof window !== 'undefined' ? document.body : undefined}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <ReactPlayer
          ref={playerRef}
          url={vimeoUrl}
          width="100%"
          height="100%"
          controls={true}
          playing={true}
          onReady={handlePlayerReady}
          config={{
            vimeo: {
              playerOptions: {
                responsive: true,
                autoplay: true,
                controls: true,
                background: false,
              },
            },
          }}
        />
      </div>
    </ReactModal>
  );
};

export default VimeoModal;
