export const generateTextTexture = (text: string, font: string, color: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = 512;
  canvas.height = 512;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Font settings
  ctx.font = `bold 100px "${font}"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  
  // Draw text
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas.toDataURL('image/png');
};

export const generateShapeTexture = (shape: string, color: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = 512;
  canvas.height = 512;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const size = 200;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = color;

  ctx.beginPath();
  
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(cx - size, cy - size, size * 2, size * 2);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy + size);
      ctx.lineTo(cx - size, cy + size);
      break;
    case 'star':
      // Simple 5-point star
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * size + cx, 
                   -Math.sin((18 + i * 72) * Math.PI / 180) * size + cy);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (size / 2) + cx, 
                   -Math.sin((54 + i * 72) * Math.PI / 180) * (size / 2) + cy);
      }
      break;
    case 'heart':
      // Heart shape
      ctx.moveTo(cx, cy - size / 2);
      ctx.bezierCurveTo(cx + size / 2, cy - size, cx + size, cy, cx, cy + size);
      ctx.bezierCurveTo(cx - size, cy, cx - size / 2, cy - size, cx, cy - size / 2);
      break;
  }
  
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL('image/png');
};
