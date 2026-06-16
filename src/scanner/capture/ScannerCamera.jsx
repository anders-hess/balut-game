import { useRef, useState } from 'react';
import { useCamera } from './useCamera.js';
import './ScannerCamera.css';

// The Gemini reader works on the whole card at any orientation, so capture no
// longer needs a precise 7×4 grid overlay or rotation — we just send the full
// image (downscaled so the payload stays reasonable while digits stay legible).
const MAX_DIM = 2000;

function drawScaled(source, w, h) {
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width  = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ── Live in-app camera ───────────────────────────────────────────────────────
function LiveCamera({ onCapture, onBack }) {
  const { videoRef, ready, setReady, error } = useCamera();

  function handleShutter() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    onCapture(drawScaled(video, video.videoWidth, video.videoHeight));
  }

  if (error) {
    return (
      <div className="scanner-error">
        <button className="scanner-back" onClick={onBack}>← Back</button>
        <p className="scanner-error__msg">{error}</p>
        <p className="scanner-error__msg">Use “Upload photo” instead.</p>
      </div>
    );
  }

  return (
    <div className="scanner-camera">
      <div className="scanner-viewfinder">
        <video
          ref={videoRef}
          className="scanner-video"
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setReady(true)}
        />

        <button className="scanner-back-overlay" onClick={onBack}>← Back</button>

        {/* Loose framing guide — advisory only; the full frame is captured. */}
        <div className="scanner-guide" aria-hidden="true" />

        {!ready && <div className="scanner-loading">Starting camera…</div>}
      </div>

      <p className="scanner-hint">
        Fit the whole scorecard inside the frame — including the Øjne (totals) column — and get close so the numbers are sharp.
      </p>

      <div className="scanner-actions">
        <button
          className="scanner-shutter"
          onClick={handleShutter}
          disabled={!ready}
          aria-label="Capture photo"
        >
          <span className="scanner-shutter__ring" />
        </button>
      </div>
    </div>
  );
}

// ── Static-photo preview (no crop / no rotation — sends the whole image) ──────
function PhotoPreview({ photo, onCapture, onChangePhoto, onClose }) {
  function handleScan() {
    const img = new Image();
    img.onload = () => onCapture(drawScaled(img, img.naturalWidth, img.naturalHeight));
    img.src = photo.src;
  }

  return (
    <div className="scanner-camera">
      <div className="scanner-viewfinder">
        <img className="scanner-upload-img" src={photo.src} alt="Uploaded scorecard" />
        {onClose && <button className="scanner-back-overlay" onClick={onClose}>← Back</button>}
      </div>

      <p className="scanner-hint">
        Make sure the whole card is visible and the numbers are readable, then tap Scan.
      </p>

      <div className="scanner-actions">
        <button className="scanner-btn scanner-btn--primary" onClick={handleScan}>
          Scan
        </button>
        <span className="scanner-divider">·</span>
        <button className="scanner-btn" onClick={onChangePhoto}>
          Change photo
        </button>
      </div>
    </div>
  );
}

// ── Top-level: entry screen routes to live camera or photo preview ───────────
export default function ScannerCamera({ onCapture, onClose }) {
  const fileRef = useRef(null);
  const [mode,  setMode]  = useState('entry'); // 'entry' | 'live' | 'photo'
  const [photo, setPhoto] = useState(null);    // { src }

  const canUseCamera =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.matchMedia?.('(pointer: coarse)')?.matches;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting the same file
    setPhoto({ src: URL.createObjectURL(file) });
    setMode('photo');
  }

  function handleChangePhoto() {
    setPhoto(null);
    setMode('entry');
  }

  if (mode === 'live') {
    return <LiveCamera onCapture={onCapture} onBack={() => setMode('entry')} />;
  }

  if (mode === 'photo' && photo) {
    return (
      <PhotoPreview
        photo={photo}
        onCapture={onCapture}
        onChangePhoto={handleChangePhoto}
        onClose={onClose}
      />
    );
  }

  // Entry screen
  return (
    <div className="scanner-upload-prompt">
      {onClose && <button className="scanner-back-overlay" onClick={onClose}>← Back</button>}

      <div className="scanner-upload-prompt__card">
        <p className="scanner-upload-prompt__title">Scan scorecard</p>

        {canUseCamera && (
          <button
            className="scanner-btn scanner-btn--primary scanner-upload-prompt__cta"
            onClick={() => setMode('live')}
          >
            Take photo
          </button>
        )}

        <button
          className={`scanner-btn scanner-upload-prompt__cta${canUseCamera ? '' : ' scanner-btn--primary'}`}
          onClick={() => fileRef.current?.click()}
        >
          Upload photo
        </button>

        <p className="scanner-upload-prompt__hint">
          {canUseCamera
            ? 'Photograph the whole scorecard, or upload one from your library'
            : 'Upload a photo of the whole scorecard from your device'}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}
