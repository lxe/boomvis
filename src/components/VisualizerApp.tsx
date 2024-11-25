import React, { useState, useCallback } from 'react';
import { useBeatDetection } from '../hooks/useBeatDetection';
import { useAudioParameters } from '../hooks/useAudioParameters';
import { Sidebar } from './Sidebar';
import { SidebarToggle } from './SidebarToggle';
import Visualizer from './Visualizer';

const SIDEBAR_WIDTH = 320;

export const VisualizerApp: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { params, updateParameter } = useAudioParameters();
  const {
    isBeat,
    isListening,
    bpm,
    error,
    volume,
    isClipping,
    fftData,
    debugData,
    startListening,
    stopListening,
    canvasRef,
    beatIndicatorRef,
  } = useBeatDetection();

  const handleStartStop = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening(params);
    }
  }, [isListening, stopListening, startListening, params]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <div className="flex h-screen w-screen bg-slate-900">
      {/* Main Visualizer Area */}
      <div 
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? `mr-${SIDEBAR_WIDTH}` : ''
        }`}
      >
        <div className="h-full flex flex-col">
          <Visualizer 
            beatIntensity={isBeat ? 1 : 0} 
            fftData={fftData}
            isListening={isListening}
          />
        </div>
      </div>

      <SidebarToggle 
        isOpen={isSidebarOpen}
        isFullscreen={isFullscreen}
        onToggleSidebar={toggleSidebar}
        onToggleFullscreen={toggleFullscreen}
        sidebarWidth={SIDEBAR_WIDTH}
      />

      <Sidebar 
        isOpen={isSidebarOpen}
        isListening={isListening}
        bpm={bpm}
        volume={volume}
        isClipping={isClipping}
        debugData={debugData}
        params={params}
        onParamChange={updateParameter}
        onStartStop={handleStartStop}
        canvasRef={canvasRef}
        beatIndicatorRef={beatIndicatorRef}
      />

      {error && (
        <div className="absolute top-4 left-4 bg-red-500/90 text-white px-4 py-2 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default VisualizerApp;