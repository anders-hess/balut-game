import { useRef, useState, useEffect, useCallback } from 'react';
import { useCamera } from './useCamera.js';
import { CATEGORIES, CATEGORY_SHORT, NUM_COLUMNS } from '../../logic/gameConstants.js';
import './ScannerCamera.css';

const NUM_ROWS = CATEGORIES.length; // 7

// Based on the physical scorecard: cells are ~2:1 wide:tall
// Grid aspect = (4 cols × 2) / (7 rows × 1) ≈ 1.14 — slightly landscape
const CELL_ASPECT  = 2.0;
const GRID_ASPECT  = (NUM_COLUMNS * CELL_ASPECT) / NUM_ROWS; // ≈ 1.14

const HEADER_H     = 22; // px reserved above overlay for column labels
const LABEL_W      = 32; // px reserved left of overlay for category labels
const MIN_W        = 140;
const MIN_H        = 80;

export default function ScannerCamera({ onCapture, onClose }) {
  const containerRef = useRef(null);
  const overlayRef   = useRef(null);
  const fileRef      = useRef(null);

  const { videoRef, ready, setReady, error, capture } = useCamera();

  const [overlay,   setOverlay]   = useState(null);
  const [mode,      setMode]      = useState('camera');
  const [uploadImg, setUploadImg] = useState(null);

  // ── Initialise overlay (landscape default, proportional to scorecard) ──
  useEffect(() => {
    if (overlay || !containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0) return;

    // Fit grid into available space, respecting the reserved header/label margins
    const maxW = width  - LABEL_W - 12;
    const maxH = height - HEADER_H - 80; // 80px for bottom panel

    // Try filling by width first (landscape bias)
    let w = Math.round(maxW * 0.82);
    let h = Math.round(w / GRID_ASPECT);

    // If that overflows height, shrink by height instead
    if (h > maxH) { h = maxH; w = Math.round(h * GRID_ASPECT); }

    const x = Math.round(LABEL_W + (maxW - w) / 2);
    const y = Math.round(HEADER_H + Math.max(4, (maxH - h) / 2));
    setOverlay({ x, y, w, h });
  }, [ready, uploadImg]);

  // Re-init on container resize (e.g. orientation change)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => setOverlay(null));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Drag to move overlay ──
  const onOverlayPointerDown = useCallback((e) => {
    if (e.target.closest('.overlay-handle')) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const ox = overlay.x,  oy = overlay.y;
    function onMove(ev) {
      setOverlay(prev => ({ ...prev, x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy) }));
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup',   onUp);
  }, [overlay]);

  // ── Drag bottom-right handle to resize ──
  const onHandlePointerDown = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const sw = overlay.w, sh = overlay.h;
    function onMove(ev) {
      setOverlay(prev => ({
        ...prev,
        w: Math.max(MIN_W, sw + (ev.clientX - sx)),
        h: Math.max(MIN_H, sh + (ev.clientY - sy)),
      }));
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onUp);
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup',   onUp);
  }, [overlay]);

  // ── Rotate: swap width ↔ height ──
  function handleRotate() {
    setOverlay(prev => ({ ...prev, w: prev.h, h: prev.w }));
  }

  // ── Capture from live camera ──
  function handleScan() {
    if (!overlayRef.current || !containerRef.current) return;
    const canvas = capture(
      overlayRef.current.getBoundingClientRect(),
      containerRef.current.getBoundingClientRect(),
    );
    if (canvas) onCapture(canvas);
  }

  // ── File upload path ──
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

  // ── Capture from uploaded static image ──
  function handleUploadScan() {
    if (!overlayRef.current || !containerRef.current || !uploadImg) return;
    const cr = containerRef.current.getBoundingClientRect();
    const or = overlayRef.current.getBoundingClientRect();
    const cAspect = cr.width / cr.height;
    const iAspect = uploadImg.naturalW / uploadImg.naturalH;
    let dispW, dispH, offsetX, offsetY;
    if (iAspect > cAspect) {
      dispW = cr.width; dispH = cr.width / iAspect;
      offsetX = 0; offsetY = (cr.height - dispH) / 2;
    } else {
      dispH = cr.height; dispW = cr.height * iAspect;
      offsetX = (cr.width - dispW) / 2; offsetY = 0;
    }
    const scaleX = uploadImg.naturalW / dispW;
    const scaleY = uploadImg.naturalH / dispH;
    const relX = or.left - cr.left - offsetX;
    const relY = or.top  - cr.top  - offsetY;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(or.width  * scaleX);
      canvas.height = Math.round(or.height * scaleY);
      canvas.getContext('2d').drawImage(
        img,
        relX * scaleX, relY * scaleY,
        or.width * scaleX, or.height * scaleY,
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

        {/* Live feed or uploaded image */}
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

        {/* Back button overlay */}
        {onClose && (
          <button className="scanner-back-overlay" onClick={onClose}>← Back</button>
        )}

        {overlay && (
          <>
            {/* Category labels — LEFT of overlay, outside crop */}
            <div
              className="overlay-row-labels"
              style={{ left: overlay.x - LABEL_W, top: overlay.y, height: overlay.h }}
            >
              {CATEGORIES.map(cat => (
                <div key={cat} className="overlay-row-label" style={{ height: `${100 / NUM_ROWS}%` }}>
                  {CATEGORY_SHORT[cat]}
                </div>
              ))}
            </div>

            {/* Column headers — ABOVE overlay, outside crop */}
            <div
              className="overlay-col-headers-ext"
              style={{ left: overlay.x, top: overlay.y - HEADER_H, width: overlay.w }}
            >
              {Array.from({ length: NUM_COLUMNS }, (_, i) => (
                <div key={i} className="overlay-col-header-ext">#{i + 1}</div>
              ))}
            </div>

            {/* The overlay itself — ONLY THIS REGION IS CROPPED AND SENT TO OCR */}
            <div
              ref={overlayRef}
              className="overlay-grid"
              style={{ left: overlay.x, top: overlay.y, width: overlay.w, height: overlay.h }}
              onPointerDown={onOverlayPointerDown}
            >
              <div className="overlay-cells">
                {Array.from({ length: NUM_ROWS }, (_, r) => (
                  <div key={r} className="overlay-row">
                    {Array.from({ length: NUM_COLUMNS }, (_, c) => (
                      <div key={c} className="overlay-cell" />
                    ))}
                  </div>
                ))}
              </div>

              {/* Resize handle — bottom-right */}
              <div className="overlay-handle" onPointerDown={onHandlePointerDown} title="Drag to resize">◢</div>
            </div>
          </>
        )}

        {!ready && !isUpload && <div className="scanner-loading">Starting camera…</div>}
      </div>

      <p className="scanner-hint">
        {isUpload
          ? 'Drag the grid over the 4 score columns, then tap Scan.'
          : 'Hold phone in landscape — align the grid over the 4 score columns, then tap Scan.'}
      </p>

      <div className="scanner-actions">
        <button
          className="scanner-btn scanner-btn--primary"
          onClick={isUpload ? handleUploadScan : handleScan}
          disabled={!overlay || (!ready && !isUpload)}
        >
          Scan
        </button>

        {/* Rotate overlay button */}
        {overlay && (
          <button className="scanner-btn scanner-btn--icon" onClick={handleRotate} title="Rotate overlay">
            ⟳
          </button>
        )}

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
