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

const customStyles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
    overflow: 'hidden', // prevents scrolling
  },
  content: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: 'none',
    background: 'transparent',
    padding: 0,
    overflow: 'hidden',
  },
};

const VimeoModal: React.FC<VimeoModalProps> = ({ isOpen, onRequestClose, vimeoUrl }) => {
  const playerRef = useRef<ReactPlayer>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);

  // Disable background scrolling when modal is open.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fallback keyboard handler for ESC key.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onRequestClose();
      }
    },
    [onRequestClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Initialize Vimeo Player and listen for fullscreen changes.
  const handlePlayerReady = useCallback(() => {
    if (playerRef.current) {
      const internalPlayer = playerRef.current.getInternalPlayer();
      vimeoPlayerRef.current = new Player(internalPlayer);
      vimeoPlayerRef.current.on('fullscreenchange', (data: { fullscreen: boolean }) => {
        // On mobile, when fullscreen is dismissed, close the modal.
        if (!data.fullscreen) {
          onRequestClose();
        }
      });
    }
  }, [onRequestClose]);

  // Clean up Vimeo Player when unmounting.
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
      style={customStyles}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      appElement={typeof window !== 'undefined' ? document.body : undefined}
    >
      <div style={{ width: '100%', height: '100%' }}>
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
