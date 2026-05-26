import { useRef, useState, useEffect, useCallback } from 'react';
import { useCamera } from './useCamera.js';
import { CATEGORIES, CATEGORY_SHORT, NUM_COLUMNS } from '../../logic/gameConstants.js';
import './ScannerCamera.css';

const NUM_ROWS = CATEGORIES.length;
const MIN_W = 120;
const MIN_H = 160;

export default function ScannerCamera({ onCapture, onClose }) {
  const containerRef = useRef(null);
  const overlayRef   = useRef(null);
  const fileRef      = useRef(null);

  const { videoRef, ready, setReady, error, capture } = useCamera();

  const [overlay,   setOverlay]   = useState(null);
  const [mode,      setMode]      = useState('camera');
  const [uploadImg, setUploadImg] = useState(null);

  useEffect(() => {
    if (overlay || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0) return;
    const w = Math.round(width * 0.72);
    const h = Math.round(w * (NUM_ROWS / NUM_COLUMNS));
    const x = Math.round((width  - w) / 2);
    const y = Math.round((height - h) / 2);
    setOverlay({ x, y, w: Math.min(w, width - 16), h: Math.min(h, height - 60) });
  }, [ready, uploadImg]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => setOverlay(null));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const onOverlayPointerDown = useCallback((e) => {
    if (e.target.closest('.overlay-handle')) return;
    e.preventDefault();
    const startClientX = e.clientX, startClientY = e.clientY;
    const startX = overlay.x, startY = overlay.y;
    function onMove(ev) {
      setOverlay(prev => ({ ...prev, x: startX + (ev.clientX - startClientX), y: startY + (ev.clientY - startClientY) }));
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup',   onUp);
  }, [overlay]);

  const onHandlePointerDown = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const startClientX = e.clientX, startClientY = e.clientY;
    const startW = overlay.w, startH = overlay.h;
    function onMove(ev) {
      setOverlay(prev => ({
        ...prev,
        w: Math.max(MIN_W, startW + (ev.clientX - startClientX)),
        h: Math.max(MIN_H, startH + (ev.clientY - startClientY)),
      }));
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup',   onUp);
  }, [overlay]);

  function handleScan() {
    if (!overlayRef.current || !containerRef.current) return;
    const canvas = capture(
      overlayRef.current.getBoundingClientRect(),
      containerRef.current.getBoundingClientRect(),
    );
    if (canvas) onCapture(canvas);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setUploadImg({ src: url, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
      setMode('upload');
      setOverlay(null);
    };
    img.src = url;
  }

  function handleUploadScan() {
    if (!overlayRef.current || !containerRef.current || !uploadImg) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const overlayRect   = overlayRef.current.getBoundingClientRect();
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect     = uploadImg.naturalW / uploadImg.naturalH;
    let dispW, dispH, offsetX, offsetY;
    if (imageAspect > containerAspect) {
      dispW = containerRect.width; dispH = containerRect.width / imageAspect;
      offsetX = 0; offsetY = (containerRect.height - dispH) / 2;
    } else {
      dispH = containerRect.height; dispW = containerRect.height * imageAspect;
      offsetX = (containerRect.width - dispW) / 2; offsetY = 0;
    }
    const relX = overlayRect.left - containerRect.left - offsetX;
    const relY = overlayRect.top  - containerRect.top  - offsetY;
    const scaleX = uploadImg.naturalW / dispW;
    const scaleY = uploadImg.naturalH / dispH;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(overlayRect.width  * scaleX);
      canvas.height = Math.round(overlayRect.height * scaleY);
      canvas.getContext('2d').drawImage(
        img,
        relX * scaleX, relY * scaleY,
        overlayRect.width * scaleX, overlayRect.height * scaleY,
        0, 0, canvas.width, canvas.height,
      );
      onCapture(canvas);
    };
    img.src = uploadImg.src;
  }

  if (error && mode === 'camera') {
    return (
      <div className="scanner-error">
        {onClose && <button className="scanner-back" onClick={onClose}>← Back</button>}
        <p className="scanner-error__msg">{error}</p>
        <button className="scanner-btn" onClick={() => fileRef.current?.click()}>
          Upload a photo instead
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    );
  }

  const isUpload = mode === 'upload' && uploadImg;

  return (
    <div className="scanner-camera">
      <div className="scanner-viewfinder" ref={containerRef}>
        {!isUpload && (
          <video
            ref={videoRef}
            className="scanner-video"
            autoPlay playsInline muted
            onLoadedMetadata={() => setReady(true)}
          />
        )}
        {isUpload && (
          <img className="scanner-upload-img" src={uploadImg.src} alt="Uploaded scorecard" />
        )}

        {/* Back button */}
        {onClose && (
          <button className="scanner-back-overlay" onClick={onClose}>← Back</button>
        )}

        {overlay && (
          <>
            <div
              className="overlay-row-labels"
              style={{ left: overlay.x - 28, top: overlay.y, height: overlay.h }}
            >
              {CATEGORIES.map(cat => (
                <div key={cat} className="overlay-row-label" style={{ height: `${100 / NUM_ROWS}%` }}>
                  {CATEGORY_SHORT[cat]}
                </div>
              ))}
            </div>

            <div
              ref={overlayRef}
              className="overlay-grid"
              style={{ left: overlay.x, top: overlay.y, width: overlay.w, height: overlay.h }}
              onPointerDown={onOverlayPointerDown}
            >
              <div className="overlay-col-headers">
                {Array.from({ length: NUM_COLUMNS }, (_, i) => (
                  <div key={i} className="overlay-col-header">#{i + 1}</div>
                ))}
              </div>
              <div className="overlay-cells">
                {Array.from({ length: NUM_ROWS }, (_, r) => (
                  <div key={r} className="overlay-row">
                    {Array.from({ length: NUM_COLUMNS }, (_, c) => (
                      <div key={c} className="overlay-cell" />
                    ))}
                  </div>
                ))}
              </div>
              <div className="overlay-handle" onPointerDown={onHandlePointerDown} title="Drag to resize">◢</div>
            </div>
          </>
        )}

        {!ready && !isUpload && <div className="scanner-loading">Starting camera…</div>}
      </div>

      <p className="scanner-hint">
        {isUpload
          ? 'Drag the grid over the 4 score columns, then tap Scan.'
          : 'Align the grid over the 4 score columns, then tap Scan.'}
      </p>

      <div className="scanner-actions">
        <button
          className="scanner-btn scanner-btn--primary"
          onClick={isUpload ? handleUploadScan : handleScan}
          disabled={!overlay || (!ready && !isUpload)}
        >
          Scan
        </button>
        {mode === 'camera' && (
          <>
            <span className="scanner-divider">or</span>
            <button className="scanner-btn" onClick={() => fileRef.current?.click()}>Upload photo</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          </>
        )}
        {isUpload && (
          <>
            <span className="scanner-divider">or</span>
            <button className="scanner-btn" onClick={() => { setMode('camera'); setUploadImg(null); setOverlay(null); }}>
              Use camera
            </button>
          </>
        )}
      </div>
    </div>
  );
}
