import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, ChevronRight, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import Visualizer from './Visualizer';

// Utility function to convert frequency to bin index
const frequencyToBin = (frequency, sampleRate, fftSize) => {
  return Math.floor((frequency * fftSize) / sampleRate);
};

// Soft clipper function that can be toggled
const softClip = (value, amount = 0.9) => {
  return Math.tanh(value * amount);
};

// Utility function to get the frequency peaks
const findFrequencyPeaks = (dataArray, minPeakDistance, threshold) => {
  const peaks = [];
  for (let i = 1; i < dataArray.length - 1; i++) {
    if (dataArray[i] > dataArray[i - 1] && 
        dataArray[i] > dataArray[i + 1] && 
        dataArray[i] > threshold) {
      if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minPeakDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
};

const BPMDetector = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBeat, setIsBeat] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [bpm, setBpm] = useState(0);
  const [error, setError] = useState(null);
  const [volume, setVolume] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [fftData, setFftData] = useState(new Float32Array());
  const [debugData, setDebugData] = useState({
    currentPeaks: [],
    intervalMs: 0,
    rawBpm: 0,
    rawVolume: 0
  });
  
  const [params, setParams] = useState({
    minPeakDistance: 350,
    peakThreshold: 0.5,
    smoothingConstant: 0.85,
    filterFrequency: 500,
    filterQ: 1.5,
    gainValue: 1.0
  });
  
  const [peaks, setPeaks] = useState([]);
  
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const filterRef = useRef(null);
  const gainNodeRef = useRef(null);
  const animationRef = useRef(null);
  const peakTimesRef = useRef([]);
  const canvasRef = useRef(null);
  const beatIndicatorRef = useRef(null);
  
  const BUFFER_SIZE = 2048;
  const BPM_HISTORY_SIZE = 10;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (filterRef.current) {
      filterRef.current.frequency.value = params.filterFrequency;
      filterRef.current.Q.value = params.filterQ;
    }
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = params.smoothingConstant;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = params.gainValue;
    }
  }, [params]);

  useEffect(() => {
    if (peaks.length > 0) {
      setBeatIntensity(1);
      setTimeout(() => setBeatIntensity(0), 100);
    }
  }, [peaks]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      analyserRef.current.fftSize = BUFFER_SIZE;
      analyserRef.current.smoothingTimeConstant = params.smoothingConstant;
      
      filterRef.current = audioContextRef.current.createBiquadFilter();
      filterRef.current.type = 'bandpass';
      filterRef.current.frequency.value = params.filterFrequency;
      filterRef.current.Q.value = params.filterQ;

      gainNodeRef.current.gain.value = params.gainValue;
      
      sourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(filterRef.current);
      filterRef.current.connect(analyserRef.current);
      
      setIsListening(true);
      animate();
    } catch (err) {
      setError('Microphone access denied');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopListening = () => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsListening(false);
    setBpm(0);
    peakTimesRef.current = [];
    setDebugData({
      currentPeaks: [],
      intervalMs: 0,
      rawBpm: 0,
      rawVolume: 0
    });
    setIsClipping(false);
  };

  const calculateBPM = (peakTimes) => {
    if (peakTimes.length < 2) return { bpm: 0, intervalMs: 0, rawBpm: 0 };
    
    const intervals = [];
    for (let i = 1; i < peakTimes.length; i++) {
      intervals.push(peakTimes[i] - peakTimes[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let rawBpm = Math.round(60000 / avgInterval);
    let estimatedBpm = rawBpm;
    
    while (estimatedBpm > 180) estimatedBpm /= 2;
    while (estimatedBpm < 60) estimatedBpm *= 2;
    
    return { bpm: estimatedBpm, intervalMs: avgInterval, rawBpm };
  };

  const showBeatIndicator = () => {
    if (beatIndicatorRef.current) {
      beatIndicatorRef.current.style.opacity = '1';
      setIsBeat(true);
      setTimeout(() => {
        if (beatIndicatorRef.current) {
          beatIndicatorRef.current.style.opacity = '0';
        }
        setIsBeat(false);
      }, 100);
    }
  };

  const animate = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const floatDataArray = new Float32Array(analyserRef.current.frequencyBinCount);
    
    analyserRef.current.getByteFrequencyData(dataArray);
    analyserRef.current.getFloatFrequencyData(floatDataArray);
    
    setFftData(floatDataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const rawVolume = average / 256;
    const normalizedVolume = softClip(rawVolume * params.gainValue);
    
    const isCurrentlyClipping = rawVolume * params.gainValue > 1;
    setIsClipping(isCurrentlyClipping);
    
    setVolume(normalizedVolume);
    
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const minBin = frequencyToBin(60, sampleRate, BUFFER_SIZE);
    const maxBin = frequencyToBin(2000, sampleRate, BUFFER_SIZE);
    
    const relevantData = Array.from(dataArray.slice(minBin, maxBin));
    const peaks = findFrequencyPeaks(
      relevantData,
      Math.floor(params.minPeakDistance / 1000 * sampleRate),
      params.peakThreshold * 256
    );
    
    setPeaks(peaks);
    
    if (peaks.length > 0) {
      const currentTime = Date.now();
      const lastPeak = peakTimesRef.current[peakTimesRef.current.length - 1] || 0;
      
      if (currentTime - lastPeak > params.minPeakDistance) {
        peakTimesRef.current.push(currentTime);
        showBeatIndicator();
        
        if (peakTimesRef.current.length > BPM_HISTORY_SIZE) {
          peakTimesRef.current.shift();
        }
        
        const { bpm: calculatedBpm, intervalMs, rawBpm } = calculateBPM(peakTimesRef.current);
        if (calculatedBpm > 0) {
          setBpm(calculatedBpm);
          setDebugData({
            currentPeaks: [...peakTimesRef.current],
            intervalMs,
            rawBpm,
            rawVolume
          });
        }
      }
    }
    
    drawVisualization(dataArray);
    animationRef.current = requestAnimationFrame(animate);
  };

  const drawVisualization = (dataArray) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, height - (params.peakThreshold * height));
    ctx.lineTo(width, height - (params.peakThreshold * height));
    ctx.stroke();
    
    const barWidth = width / dataArray.length;
    
    for (let i = 0; i < dataArray.length; i++) {
      const rawValue = (dataArray[i] / 256) * params.gainValue;
      const clippedValue = softClip(rawValue);
      const barHeight = clippedValue * height;
      
      ctx.fillStyle = rawValue > 1 
        ? `rgb(239, ${Math.max(0, 68 - (rawValue - 1) * 50)}, ${Math.max(0, 68 - (rawValue - 1) * 50)})` 
        : 'rgb(59, 130, 246)';
      
      ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight
      );
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900">
      {/* Main Visualizer Area */}
      <div className="flex-1 p-0">
        <div className="h-full flex flex-col">
          <Visualizer 
            beatIntensity={isBeat ? 1 : 0} 
            className="flex-1" 
            colorPrimary={[0.25, 0.25, 1.0]} 
            colorSecondary={[1.0, 0.25, 0.25]} 
            fftData={fftData}
            isListening={isListening}
            onError={(error) => console.error('Visualizer error:', error)} 
          />
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <div className="absolute right-0 top-4 flex gap-2 z-10" style={{
        right: isSidebarOpen ? '320px' : '0',
      }}>
        <button
          onClick={toggleFullscreen}
          className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 p-1.5 rounded-l-sm transition-all duration-200"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          onClick={toggleSidebar}
          className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 p-1.5 rounded-l-sm transition-all duration-200"
        >
          {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Sidebar */}
      <div 
        className="w-80 bg-slate-800 p-6 overflow-y-auto flex flex-col transition-all duration-300 ease-in-out fixed right-0 top-0 bottom-0"
        style={{
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* BPM and Controls */}
        <div className="mb-8">
          <div className="space-y-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              className={`w-full py-3 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {isListening ? (
                <><MicOff className="mr-2" /> Stop</>
              ) : (
                <><Mic className="mr-2" /> Start</>
              )}
            </Button>

            <div className="text-4xl font-bold text-center">
              {bpm > 0 ? `${bpm} BPM` : '--'}
            </div>
            <div className="text-sm text-gray-400 text-center">
              {isListening ? 'Listening...' : 'Press Start to begin'}
            </div>
          </div>

          <div className="relative w-full h-24 bg-slate-800 rounded-lg overflow-hidden mt-4">
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
        {/* Parameters continued */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm">Gain: {params.gainValue.toFixed(1)}x {isClipping && <span className="text-red-500 ml-2">CLIPPING!</span>}</label>
              <Slider
                value={[params.gainValue]}
                min={0.1}
                max={5.0}
                step={0.1}
                onValueChange={([value]) => setParams(p => ({ ...p, gainValue: value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Min Peak Distance: {params.minPeakDistance}ms</label>
              <Slider
                value={[params.minPeakDistance]}
                min={100}
                max={1000}
                step={10}
                onValueChange={([value]) => setParams(p => ({ ...p, minPeakDistance: value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Peak Threshold: {params.peakThreshold.toFixed(2)}</label>
              <Slider
                value={[params.peakThreshold]}
                min={0.1}
                max={0.9}
                step={0.05}
                onValueChange={([value]) => setParams(p => ({ ...p, peakThreshold: value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Smoothing: {params.smoothingConstant.toFixed(2)}</label>
              <Slider
                value={[params.smoothingConstant]}
                min={0.1}
                max={0.99}
                step={0.01}
                onValueChange={([value]) => setParams(p => ({ ...p, smoothingConstant: value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Filter Freq: {params.filterFrequency}Hz</label>
              <Slider
                value={[params.filterFrequency]}
                min={60}
                max={2000}
                step={10}
                onValueChange={([value]) => setParams(p => ({ ...p, filterFrequency: value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm">Filter Q: {params.filterQ.toFixed(2)}</label>
              <Slider
                value={[params.filterQ]}
                min={0.1}
                max={5.0}
                step={0.1}
                onValueChange={([value]) => setParams(p => ({ ...p, filterQ: value }))}
              />
            </div>
          </div>

          {/* Debug Info */}
          <div className="space-y-2 text-sm text-gray-400">
            <h3 className="font-semibold text-gray-200">Debug Info</h3>
            <div>Raw Volume: {(debugData.rawVolume * 100).toFixed(1)}%</div>
            <div>Amplified: {(volume * 100).toFixed(1)}%</div>
            <div>Raw BPM: {debugData.rawBpm}</div>
            <div>Avg Interval: {debugData.intervalMs.toFixed(1)}ms</div>
            <div>Peak Count: {debugData.currentPeaks.length}</div>
            <div className="text-xs">
              Recent peaks: {debugData.currentPeaks.slice(-5).map(t => t % 10000).join(', ')}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BPMDetector;