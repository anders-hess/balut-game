import { useEffect, useRef, useState } from 'react';
import './BalutToast.css';

export default function BalutToast({ trigger }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;
    clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(timerRef.current);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div className="balut-toast" role="status" aria-live="polite">
      <span className="balut-toast__dice">🎲</span>
      <span className="balut-toast__text">BALUT!</span>
      <span className="balut-toast__dice">🎲</span>
    </div>
  );
}
