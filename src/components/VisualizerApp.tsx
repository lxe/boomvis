import React, { useState, useCallback, useEffect } from 'react';
import { useBeatDetection } from '../hooks/useBeatDetection';
import { useAudioParameters } from '../hooks/useAudioParameters';
import { Sidebar } from './Sidebar';
import { SidebarToggle } from './SidebarToggle';
import Visualizer from './Visualizer';

export const VisualizerApp: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
  }, []);

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden">
      {/* Main Visualizer Area */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ease-in-out ${
          !isFullscreen && isSidebarOpen ? 'mr-80' : ''
        }`}
      >
        <Visualizer 
          beatIntensity={isBeat ? 1 : 0} 
          fftData={fftData}
          isListening={isListening}
        />

        {/* Sidebar Toggle and Fullscreen Buttons */}
        {!isFullscreen && (
          <div className="absolute right-0 top-0 h-full">
            <SidebarToggle
              isOpen={isSidebarOpen}
              isFullscreen={isFullscreen}
              onToggleSidebar={toggleSidebar}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        )}
      </div>

      {/* Sidebar */}
      {!isFullscreen && (
        <div 
          className={`fixed top-0 right-0 h-screen w-80 bg-slate-800 transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <Sidebar 
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
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 bg-red-500/90 text-white px-4 py-2 rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default VisualizerApp;