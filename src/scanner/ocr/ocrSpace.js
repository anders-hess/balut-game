const API_URL = 'https://api.ocr.space/parse/image';
const API_KEY = import.meta.env.VITE_OCR_SPACE_KEY;

export async function recognizeGrid(canvas) {
  const base64 = canvas.toDataURL('image/jpeg', 0.88);

  const body = new FormData();
  body.append('base64Image',       base64);
  body.append('language',          'eng');
  body.append('OCREngine',         '2');
  body.append('isOverlayRequired', 'true');
  body.append('isTable',           'true');
  body.append('scale',             'true');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { apikey: API_KEY },
    body,
  });

  if (!res.ok) throw new Error(`OCR.space HTTP ${res.status}: ${res.statusText}`);

  const data = await res.json();

  if (data.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.join('; ')
      : (data.ErrorMessage ?? 'OCR processing failed');
    throw new Error(msg);
  }

  return data;
}
