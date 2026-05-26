import { useState } from 'react';
import ScannerCamera    from './capture/ScannerCamera.jsx';
import ScannerReview   from './review/ScannerReview.jsx';
import ScorecardDisplay from './review/ScorecardDisplay.jsx';
import ErrorLogPanel   from './errors/ErrorLogPanel.jsx';
import { recognizeGrid }   from './ocr/ocrSpace.js';
import { mapOcrToGrid, cellsToScorecard, buildFlaggedCells } from './ocr/cellMapper.js';
import { isInvalid }       from './validators.js';
import { buildLogEntry, appendLog } from './errors/errorLog.js';
import './ScannerScreen.css';

export default function ScannerScreen({ onClose }) {
  const [step,       setStep]       = useState('capture');
  const [canvas,     setCanvas]     = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [finalCard,  setFinalCard]  = useState(null);
  const [errorMsg,   setErrorMsg]   = useState(null);

  async function handleCapture(capturedCanvas) {
    setCanvas(capturedCanvas);
    setStep('processing');

    let ocrResponse = null;
    let cells = null;

    try {
      ocrResponse = await recognizeGrid(capturedCanvas);
      cells = mapOcrToGrid(ocrResponse, capturedCanvas.width, capturedCanvas.height);
      const scorecard    = cellsToScorecard(cells);
      const flaggedCells = buildFlaggedCells(cells, isInvalid);
      appendLog(buildLogEntry({ canvas: capturedCanvas, ocrResponse, cells, error: null }));
      setReviewData({ scorecard, flaggedCells });
      setStep('review');
    } catch (err) {
      appendLog(buildLogEntry({ canvas: capturedCanvas, ocrResponse, cells, error: err }));
      setErrorMsg(err.message ?? 'Unknown error during OCR.');
      setStep('error');
    }
  }

  function handleConfirm(scorecard) {
    setFinalCard(scorecard);
    setStep('done');
  }

  function handleRescan() {
    setCanvas(null);
    setReviewData(null);
    setFinalCard(null);
    setErrorMsg(null);
    setStep('capture');
  }

  return (
    <>
      {step === 'capture' && (
        <ScannerCamera onCapture={handleCapture} onClose={onClose} />
      )}

      {step === 'processing' && (
        <ProcessingScreen canvas={canvas} />
      )}

      {step === 'review' && reviewData && (
        <ScannerReview
          scorecard={reviewData.scorecard}
          flaggedCells={reviewData.flaggedCells}
          onConfirm={handleConfirm}
          onRescan={handleRescan}
        />
      )}

      {step === 'done' && finalCard && (
        <ScorecardDisplay
          scorecard={finalCard}
          onDone={handleRescan}
          onClose={onClose}
        />
      )}

      {step === 'error' && (
        <ErrorScreen message={errorMsg} onRetry={handleRescan} onClose={onClose} />
      )}

      <ErrorLogPanel />
    </>
  );
}

function ProcessingScreen({ canvas }) {
  return (
    <div className="scanner-processing">
      <div className="scanner-processing__card">
        {canvas && (
          <img
            className="scanner-processing__preview"
            src={canvas.toDataURL('image/jpeg', 0.6)}
            alt="Captured scorecard"
          />
        )}
        <div className="scanner-processing__spinner" aria-hidden="true" />
        <p className="scanner-processing__label">Analysing handwriting…</p>
        <p className="scanner-processing__hint">Sending to OCR engine — takes a few seconds.</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry, onClose }) {
  return (
    <div className="scanner-error-screen">
      <div className="scanner-error-screen__card">
        <h2 className="scanner-error-screen__title">Scan failed</h2>
        <p className="scanner-error-screen__msg">{message}</p>
        <p className="scanner-error-screen__hint">Check the debug log (bottom-left) for details.</p>
        <div className="scanner-error-screen__btns">
          <button className="scanner-error-screen__btn" onClick={onRetry}>Try again</button>
          {onClose && (
            <button className="scanner-error-screen__btn scanner-error-screen__btn--secondary" onClick={onClose}>
              Back to app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
