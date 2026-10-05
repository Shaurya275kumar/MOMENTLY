import { useEffect, useRef } from 'react';

type Props = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  bars?: number;
  color?: string;
  className?: string;
};

export default function AudioVisualizer({
  analyser,
  isPlaying,
  bars = 48,
  color = '#0095f6',
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<Float32Array>(new Float32Array(bars));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const smoothed = smoothedRef.current;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (!analyser || !freqData || !isPlaying) {
        // Idle: flat baseline with subtle fade
        for (let i = 0; i < bars; i++) {
          smoothed[i] = smoothed[i] * 0.9;
        }
        drawBars(ctx, w, h, bars, smoothed, color, 0.06);
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      analyser.getByteFrequencyData(freqData);

      // Map frequency bins to visualizer bars with logarithmic-ish spacing
      const binCount = freqData.length;
      for (let i = 0; i < bars; i++) {
        const start = Math.floor(Math.pow(i / bars, 1.4) * binCount);
        const end = Math.floor(Math.pow((i + 1) / bars, 1.4) * binCount);
        let max = 0;
        for (let j = start; j <= end && j < binCount; j++) {
          if (freqData[j] > max) max = freqData[j];
        }
        const target = max / 255;
        // Smooth: fast rise, slow fall
        const prev = smoothed[i];
        smoothed[i] = target > prev ? target : prev * 0.88 + target * 0.12;
      }

      drawBars(ctx, w, h, bars, smoothed, color, 1);
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying, bars, color]);

  return <canvas ref={canvasRef} className={className} />;
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bars: number,
  values: Float32Array,
  color: string,
  maxOpacity: number,
) {
  const gap = 2;
  const barWidth = (w - gap * (bars - 1)) / bars;
  const centerY = h / 2;

  for (let i = 0; i < bars; i++) {
    const amp = Math.max(0.02, Math.min(1, values[i]));
    const barHeight = amp * h * 0.9;
    const x = i * (barWidth + gap);
    const y = centerY - barHeight / 2;

    const opacity = maxOpacity < 1 ? maxOpacity : 0.35 + amp * 0.65;
    ctx.fillStyle = hexWithAlpha(color, opacity);
    roundedRect(ctx, x, y, barWidth, barHeight, Math.min(barWidth / 2, 2));
    ctx.fill();
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
