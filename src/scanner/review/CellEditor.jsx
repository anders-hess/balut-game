import { useRef, useEffect, useState } from 'react';
import './CellEditor.css';

export default function CellEditor({ initialValue, onSave, onCancel }) {
  const [text, setText] = useState(initialValue != null ? String(initialValue) : '');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  function commit() {
    const trimmed = text.trim();
    if (trimmed === '') { onSave(null); return; }
    const n = parseInt(trimmed, 10);
    onSave(isNaN(n) ? null : n);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }

  return (
    <div className="cell-editor" onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        className="cell-editor__input"
        type="number"
        min="0"
        max="99"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
      />
    </div>
  );
}
