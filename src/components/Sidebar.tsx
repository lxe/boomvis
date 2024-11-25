import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import type { AudioParameters, DebugData } from '../types/audio';
import { ParameterControl } from './ParameterControl';
import { DebugPanel } from './DebugPanel';

interface SidebarProps {
  isOpen: boolean;
  isListening: boolean;
  bpm: number;
  volume: number;
  isClipping: boolean;
  debugData: DebugData;
  params: AudioParameters;
  onParamChange: (key: keyof AudioParameters, value: number) => void;
  onStartStop: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  beatIndicatorRef: React.RefObject<HTMLDivElement>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isListening,
  bpm,
  volume,
  isClipping,
  debugData,
  params,
  onParamChange,
  onStartStop,
  canvasRef,
  beatIndicatorRef,
}) => {
  return (
    <div 
      className={`w-80 bg-slate-800/80 p-4 overflow-y-auto flex flex-col transition-all duration-300 ease-in-out fixed right-0 top-0 bottom-0 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* BPM and Controls */}
      <div className="mb-4">
        <div className="space-y-2">
          <Button
            onClick={onStartStop}
            className={`w-full py-2 text-sm ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {isListening ? (
              <><MicOff className="mr-1" /> Stop</>
            ) : (
              <><Mic className="mr-1" /> Start</>
            )}
          </Button>

          <div className="text-2xl font-bold text-center">
            {bpm > 0 ? `${bpm} BPM` : '--'}
          </div>
          <div className="text-xs text-gray-400 text-center">
            {isListening ? 'Listening...' : 'Press Start to begin'}
          </div>
        </div>

        {/* Mini FFT Visualizer */}
        <div className="relative w-full h-20 bg-slate-800 rounded-lg overflow-hidden mt-2">
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full h-full"
          />
          <div 
            className={`absolute bottom-0 left-0 h-1 transition-all duration-100 ${isClipping ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(volume * 100, 100)}%` }}
          />
          <div
            ref={beatIndicatorRef}
            className="absolute inset-0 bg-red-500/20 transition-opacity duration-100 opacity-0"
          />
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <ParameterControl
            label="Gain"
            value={params.gainValue}
            min={0.1}
            max={5.0}
            step={0.1}
            onChange={(value) => onParamChange('gainValue', value)}
            warning={isClipping ? 'CLIPPING!' : undefined}
          />

          <ParameterControl
            label="Min Peak Distance"
            value={params.minPeakDistance}
            min={100}
            max={1000}
            step={10}
            onChange={(value) => onParamChange('minPeakDistance', value)}
            suffix="ms"
          />

          <ParameterControl
            label="Peak Threshold"
            value={params.peakThreshold}
            min={0.1}
            max={0.9}
            step={0.05}
            onChange={(value) => onParamChange('peakThreshold', value)}
          />

          <ParameterControl
            label="Smoothing"
            value={params.smoothingConstant}
            min={0.1}
            max={0.99}
            step={0.01}
            onChange={(value) => onParamChange('smoothingConstant', value)}
          />

          <ParameterControl
            label="Filter Freq"
            value={params.filterFrequency}
            min={60}
            max={2000}
            step={10}
            onChange={(value) => onParamChange('filterFrequency', value)}
            suffix="Hz"
          />

          <ParameterControl
            label="Filter Q"
            value={params.filterQ}
            min={0.1}
            max={5.0}
            step={0.1}
            onChange={(value) => onParamChange('filterQ', value)}
          />
        </div>

        <DebugPanel debugData={debugData} volume={volume} />

        <div className="text-xs text-gray-400 mt-2">
          Visualization inspired by {' '}
          <a 
            href="https://www.shadertoy.com/view/lcjGWV" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            this Shadertoy
          </a>
          {' '}by totetmatt.
        </div>
      </div>
    </div>
  );
};