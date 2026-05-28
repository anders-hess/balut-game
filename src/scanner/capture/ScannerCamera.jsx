import { useRef, useState, useEffect, useCallback } from 'react';
import { CATEGORIES, CATEGORY_SHORT, NUM_COLUMNS } from '../../logic/gameConstants.js';
import './ScannerCamera.css';

const NUM_ROWS    = CATEGORIES.length; // 7
const CELL_ASPECT = 2.0;               // physical cell width:height ratio
const HEADER_H    = 22;               // px above overlay for column/category headers
const LABEL_W     = 32;              // px left of overlay for row labels
const MIN_W       = 80;
const MIN_H       = 80;

const NEXT_ORIENTATION = {
  'landscape':  'portrait-r',
  'portrait-r': 'portrait-l',
  'portrait-l': 'landscape',
};
const ROTATE_LABEL = {
  'landscape':  '⟳ Portrait →',
  'portrait-r': '⟳ Portrait ←',
  'portrait-l': '⟳ Landscape',
};

function gridDims(orientation) {
  const isLand = orientation === 'landscape';
  return {
    rows:   isLand ? NUM_ROWS    : NUM_COLUMNS,
    cols:   isLand ? NUM_COLUMNS : NUM_ROWS,
    aspect: isLand
      ? (NUM_COLUMNS * CELL_ASPECT) / NUM_ROWS           // ≈ 1.14
      : NUM_ROWS / (NUM_COLUMNS * CELL_ASPECT),          // ≈ 0.875
  };
}

function getColHeaders(orientation) {
  return orientation === 'landscape'
    ? Array.from({ length: NUM_COLUMNS }, (_, i) => `#${i + 1}`)
    : CATEGORIES.map(cat => CATEGORY_SHORT[cat]);
}
function getRowLabels(orientation) {
  return orientation === 'landscape'
    ? CATEGORIES.map(cat => CATEGORY_SHORT[cat])
    : Array.from({ length: NUM_COLUMNS }, (_, i) => `#${i + 1}`);
}

function rotateCW(src) {
  const dst = document.createElement('canvas');
  dst.width = src.height; dst.height = src.width;
  const ctx = dst.getContext('2d');
  ctx.translate(dst.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return dst;
}
function rotateCCW(src) {
  const dst = document.createElement('canvas');
  dst.width = src.height; dst.height = src.width;
  const ctx = dst.getContext('2d');
  ctx.translate(0, dst.height);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return dst;
}

export default function ScannerCamera({ onCapture, onClose }) {
  const containerRef = useRef(null);
  const overlayRef   = useRef(null);
  const fileRef      = useRef(null);

  const [photo,       setPhoto]       = useState(null);        // { src, naturalW, naturalH }
  const [overlay,     setOverlay]     = useState(null);        // { x, y, w, h }
  const [orientation, setOrientation] = useState('landscape'); // 'landscape'|'portrait-r'|'portrait-l'

  // ── Overlay initialisation ─────────────────────────────────────────────────
  const initOverlay = useCallback(() => {
    if (!containerRef.current || !photo) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    if (width === 0) return;

    const { rows, cols, aspect } = gridDims(orientation);
    const maxW = width  - LABEL_W - 12;
    const maxH = height - HEADER_H - 80;

    let w = Math.round(maxW * 0.82);
    let h = Math.round(w / aspect);
    if (h > maxH) { h = maxH; w = Math.round(h * aspect); }

    const x = Math.round(LABEL_W + (maxW - w) / 2);
    const y = Math.round(HEADER_H + Math.max(4, (maxH - h) / 2));
    setOverlay({ x, y, w, h });
  }, [photo, orientation]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (overlay) return;
    initOverlay();
  }, [overlay, initOverlay]);

  // Re-init on container resize (e.g. phone rotation)
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => setOverlay(null));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Drag to move overlay ───────────────────────────────────────────────────
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

  // ── Resize handle ──────────────────────────────────────────────────────────
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

  // ── Rotate cycles: landscape → portrait-r → portrait-l → landscape ────────
  function handleRotate() {
    setOrientation(prev => NEXT_ORIENTATION[prev]);
    setOverlay(null);
  }

  // ── File selection ─────────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow re-selecting same file
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const isPortrait = img.naturalHeight > img.naturalWidth;
      setOrientation(isPortrait ? 'portrait-r' : 'landscape');
      setPhoto({ src: url, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
      setOverlay(null);
    };
    img.src = url;
  }

  function handleChangePhoto() {
    setPhoto(null);
    setOverlay(null);
    setOrientation('landscape');
  }

  // ── Scan: crop overlay region, rotate canvas if portrait mode ──────────────
  function handleScan() {
    if (!overlayRef.current || !containerRef.current || !photo) return;
    const cr = containerRef.current.getBoundingClientRect();
    const or = overlayRef.current.getBoundingClientRect();
    const cAspect = cr.width / cr.height;
    const iAspect = photo.naturalW / photo.naturalH;

    let dispW, dispH, offsetX, offsetY;
    if (iAspect > cAspect) {
      dispW = cr.width; dispH = cr.width / iAspect;
      offsetX = 0; offsetY = (cr.height - dispH) / 2;
    } else {
      dispH = cr.height; dispW = cr.height * iAspect;
      offsetX = (cr.width - dispW) / 2; offsetY = 0;
    }

    const scaleX = photo.naturalW / dispW;
    const scaleY = photo.naturalH / dispH;
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
      // Portrait modes: rotate back to landscape so standard OCR mapping works
      const final = orientation === 'portrait-r' ? rotateCCW(canvas) :
                    orientation === 'portrait-l' ? rotateCW(canvas)  : canvas;
      onCapture(final);
    };
    img.src = photo.src;
  }

  // ── Phase 1: no photo selected yet ────────────────────────────────────────
  if (!photo) {
    return (
      <div className="scanner-upload-prompt">
        {onClose && (
          <button className="scanner-back-overlay" onClick={onClose}>← Back</button>
        )}
        <div className="scanner-upload-prompt__card">
          <p className="scanner-upload-prompt__title">Scan scorecard</p>
          <button
            className="scanner-btn scanner-btn--primary scanner-upload-prompt__cta"
            onClick={() => fileRef.current?.click()}
          >
            Select scorecard photo
          </button>
          <p className="scanner-upload-prompt__hint">
            Take a photo or choose from your library
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

  // ── Phase 2: photo loaded — show image with draggable overlay ─────────────
  const { rows: gridRows, cols: gridCols } = gridDims(orientation);
  const headers = getColHeaders(orientation);
  const labels  = getRowLabels(orientation);

  return (
    <div className="scanner-camera">
      <div className="scanner-viewfinder" ref={containerRef}>

        <img className="scanner-upload-img" src={photo.src} alt="Uploaded scorecard" />

        {onClose && (
          <button className="scanner-back-overlay" onClick={onClose}>← Back</button>
        )}

        {overlay && (
          <>
            {/* Row labels — LEFT of overlay, outside crop */}
            <div
              className="overlay-row-labels"
              style={{ left: overlay.x - LABEL_W, top: overlay.y, height: overlay.h }}
            >
              {labels.map((label, i) => (
                <div key={i} className="overlay-row-label" style={{ height: `${100 / gridRows}%` }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Column headers — ABOVE overlay, outside crop */}
            <div
              className="overlay-col-headers-ext"
              style={{
                left: overlay.x,
                top: overlay.y - HEADER_H,
                width: overlay.w,
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              }}
            >
              {headers.map((h, i) => (
                <div key={i} className="overlay-col-header-ext">{h}</div>
              ))}
            </div>

            {/* The overlay grid — ONLY THIS REGION IS CROPPED AND SENT TO OCR */}
            <div
              ref={overlayRef}
              className="overlay-grid"
              style={{ left: overlay.x, top: overlay.y, width: overlay.w, height: overlay.h }}
              onPointerDown={onOverlayPointerDown}
            >
              <div className="overlay-cells">
                {Array.from({ length: gridRows }, (_, r) => (
                  <div
                    key={r}
                    className="overlay-row"
                    style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                  >
                    {Array.from({ length: gridCols }, (_, c) => (
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
      </div>

      <p className="scanner-hint">
        Drag the grid over the score columns, then tap Scan.
      </p>

      <div className="scanner-actions">
        <button
          className="scanner-btn scanner-btn--primary"
          onClick={handleScan}
          disabled={!overlay}
        >
          Scan
        </button>

        <button className="scanner-btn scanner-btn--rotate" onClick={handleRotate} title="Change orientation">
          {ROTATE_LABEL[orientation]}
        </button>

        <span className="scanner-divider">·</span>

        <button className="scanner-btn" onClick={handleChangePhoto}>
          Change photo
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
