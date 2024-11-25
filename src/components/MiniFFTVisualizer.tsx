import React from 'react';

interface MiniFFTVisualizerProps {
  fftData: Float32Array;
  volume: number;
  isClipping: boolean;
}

const MiniFFTVisualizer: React.FC<MiniFFTVisualizerProps> = ({ fftData, volume, isClipping }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / fftData.length;
    for (let i = 0; i < fftData.length; i++) {
      const barHeight = fftData[i] * height;
      ctx.fillStyle = isClipping ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)';
      ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
    }
  }, [fftData, isClipping]);

  return (
    <div className="relative w-full h-24 bg-slate-800 rounded-lg overflow-hidden mt-4">
      <canvas ref={canvasRef} width={600} height={200} className="w-full h-full" />
      <div
        className={`absolute bottom-0 left-0 h-1 transition-all duration-100 ${isClipping ? 'bg-red-500' : 'bg-blue-500'}`}
        style={{ width: `${Math.min(volume * 100, 100)}%` }}
      />
    </div>
  );
};

export default MiniFFTVisualizer; 