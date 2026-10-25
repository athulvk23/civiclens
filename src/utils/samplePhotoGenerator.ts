/**
 * Generates a realistic raster PNG data URL (data:image/png;base64,...) using HTML5 Canvas
 * so that both human judges and vision APIs (Gemini 3.8 Flash) receive a valid raster image
 * when testing the 1-click hackathon demo presets.
 */
export function generateSamplePotholePngDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Asphalt road surface background
  const grad = ctx.createLinearGradient(0, 0, 0, 420);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.3, '#334155');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 640, 420);

  // Asphalt grain texture
  ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
  for (let i = 0; i < 450; i++) {
    const x = (i * 97) % 640;
    const y = (i * 53) % 420;
    ctx.fillRect(x, y, 3, 2);
  }

  // Yellow transit lane line on left
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(95, 20);
  ctx.lineTo(45, 400);
  ctx.stroke();

  // White dashed bike lane line on right
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 6;
  ctx.setLineDash([28, 20]);
  ctx.beginPath();
  ctx.moveTo(525, 20);
  ctx.lineTo(580, 400);
  ctx.stroke();
  ctx.setLineDash([]);

  // Outer cracked asphalt rim of pothole
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(320, 235, 138, 76, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // Inner deep cavity with standing water / sub-base gravel
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(322, 240, 112, 58, -0.08, 0, Math.PI * 2);
  ctx.fill();

  // Jagged cracks radiating from cavity
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 3;
  const cracks = [
    [182, 235, 130, 210],
    [455, 230, 510, 255],
    [310, 160, 290, 115],
    [340, 310, 375, 365],
  ];
  for (const [x1, y1, x2, y2] of cracks) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo((x1 + x2) / 2 + 8, (y1 + y2) / 2 - 6);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Loose asphalt chunks around pothole
  ctx.fillStyle = '#475569';
  const chunks = [
    [195, 290, 14, 10],
    [430, 285, 18, 12],
    [255, 320, 12, 9],
    [395, 170, 15, 11],
  ];
  for (const [cx, cy, w, h] of chunks) {
    ctx.fillRect(cx, cy, w, h);
  }

  // Caption banner at top
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(16, 16, 608, 52);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 16, 608, 52);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('FIELD PHOTO: Deep Road Pothole & Crumbled Bitumen Edge', 32, 39);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('Location: Anna Salai & Teynampet Signal (MTC Bus Lane), Chennai • PNG', 32, 58);

  return canvas.toDataURL('image/png');
}
