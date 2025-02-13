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
interface HasAddEventListener {
    addEventListener(
      event: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
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
    overflow: 'hidden', // Prevents background scrolling.
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

  // Detect if the device is mobile.
  const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(window.navigator.userAgent);

  // Disable background scrolling when modal is open.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('video-open'); // Add class to disable header.
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('video-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('video-open');
    };
  }, [isOpen]);

  // Global ESC key listener attached to the document.
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
      document.addEventListener('keydown', handleKeyDown, true); // use capture phase.
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, handleKeyDown]);

  // Initialize Vimeo Player and attach event listeners.
  const handlePlayerReady = useCallback(() => {
    if (playerRef.current) {
        const internalPlayer = playerRef.current.getInternalPlayer();
        vimeoPlayerRef.current = new Player(internalPlayer as HTMLIFrameElement);
        

      // Listen for fullscreen changes via the Vimeo API.
      vimeoPlayerRef.current.on('fullscreenchange', (data: { fullscreen: boolean }) => {
        if (!data.fullscreen) {
          onRequestClose();
        }
      });

      // Also listen for iOS native fullscreen exit.
      const playerElement = internalPlayer as HasAddEventListener | null;
      if (playerElement && typeof playerElement.addEventListener === 'function') {
        playerElement.addEventListener('webkitendfullscreen', () => {
          onRequestClose();
        });
      }
      
    }
  }, [onRequestClose]);

  // Cleanup Vimeo Player on unmount.
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
      {/* Outer container listens for overlay clicks/taps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onRequestClose();
          }
        }}
      >
        {/* Constrain video to a max width so controls remain visible */}
        <div
          style={{
            width: '100%',
            maxWidth: `calc(100vh * (16 / 9))`,
            aspectRatio: '16/9',
            background: 'black',
            position: 'relative',
          }}
        >
          <ReactPlayer
            ref={playerRef}
            url={vimeoUrl}
            width="100%"
            height="100%"
            controls={true}
            playing={true}
            muted={isMobile} // On mobile, mute to allow autoplay.
            onReady={handlePlayerReady}
            config={{
              vimeo: {
                playerOptions: {
                  responsive: true,
                  autoplay: true,
                  controls: true,
                  background: false,
                  playsinline: false, // Force native fullscreen on mobile.
                },
              },
            }}
          />
        </div>
      </div>
    </ReactModal>
  );
};

export default VimeoModal;
