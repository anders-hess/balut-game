import { useRef, useState, useEffect } from 'react';

export function useCamera() {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser.');
      return;
    }

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
      },
    })
    .then(stream => {
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    })
    .catch(err => {
      if (active) setError(err.message || 'Camera access denied.');
    });

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  function capture(overlayRect, containerRect) {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const dispW  = containerRect.width;
    const dispH  = containerRect.height;

    const videoAspect = videoW / videoH;
    const dispAspect  = dispW  / dispH;

    let srcX, srcY, srcW, srcH;
    if (videoAspect > dispAspect) {
      srcH = videoH; srcW = videoH * dispAspect;
      srcX = (videoW - srcW) / 2; srcY = 0;
    } else {
      srcW = videoW; srcH = videoW / dispAspect;
      srcX = 0; srcY = (videoH - srcH) / 2;
    }

    const relX = overlayRect.left - containerRect.left;
    const relY = overlayRect.top  - containerRect.top;
    const scaleX = srcW / dispW;
    const scaleY = srcH / dispH;

    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(overlayRect.width  * scaleX);
    canvas.height = Math.round(overlayRect.height * scaleY);

    canvas.getContext('2d').drawImage(
      video,
      srcX + relX * scaleX, srcY + relY * scaleY,
      overlayRect.width * scaleX, overlayRect.height * scaleY,
      0, 0, canvas.width, canvas.height,
    );

    return canvas;
  }

  return { videoRef, ready, setReady, error, capture };
}
