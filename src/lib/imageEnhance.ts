export type EnhanceMode = 'enhance' | 'deblur' | 'upscale';

export type EnhanceResult = {
  blob: Blob;
  url: string;
  width: number;
  height: number;
};

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function canvasToResult(canvas: HTMLCanvasElement, quality = 0.92): Promise<EnhanceResult> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('Canvas conversion failed')); return; }
      resolve({
        blob,
        url: URL.createObjectURL(blob),
        width: canvas.width,
        height: canvas.height,
      });
    }, 'image/jpeg', quality);
  });
}

export async function enhanceImage(src: string): Promise<EnhanceResult> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.filter = 'contrast(1.18) saturate(1.35) brightness(1.06)';
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta > 10) {
      const shift = delta * 0.06;
      data[i] = Math.min(255, r + (r === max ? shift : -shift * 0.3));
      data[i + 1] = Math.min(255, g + (g === max ? shift : -shift * 0.3));
      data[i + 2] = Math.min(255, b + (b === max ? shift : -shift * 0.3));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvasToResult(canvas);
}

export async function deblurImage(src: string): Promise<EnhanceResult> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = ctx.createImageData(canvas.width, canvas.height);
  const s = srcData.data;
  const o = out.data;
  const w = canvas.width;
  const h = canvas.height;

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const kw = 3, kh = 3, half = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = 0; ky < kh; ky++) {
          for (let kx = 0; kx < kw; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx - half));
            const py = Math.min(h - 1, Math.max(0, y + ky - half));
            sum += s[(py * w + px) * 4 + c] * kernel[ky * kw + kx];
          }
        }
        const idx = (y * w + x) * 4 + c;
        o[idx] = Math.min(255, Math.max(0, sum));
      }
      o[(y * w + x) * 4 + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvasToResult(canvas);
}

export async function upscaleImage(src: string, factor = 2): Promise<EnhanceResult> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth * factor;
  canvas.height = img.naturalHeight * factor;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToResult(canvas, 0.95);
}
