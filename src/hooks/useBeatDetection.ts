import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioService } from '../services/AudioService';
import { findFrequencyPeaks, calculateBPM, softClip } from '../utils/audioAnalysis';
import type { AudioParameters, DebugData } from '../types/audio';

const BUFFER_SIZE = 2048;
const BPM_HISTORY_SIZE = 20;

export const useBeatDetection = () => {
  const [isBeat, setIsBeat] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [bpm, setBpm] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [fftData, setFftData] = useState<Float32Array>(new Float32Array());
  const [debugData, setDebugData] = useState<DebugData>({
    currentPeaks: [],
    intervalMs: 0,
    rawBpm: 0,
    rawVolume: 0
  });

  const audioService = useRef<AudioService>(new AudioService());
  const animationRef = useRef<number | null>(null);
  const peakTimesRef = useRef<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beatIndicatorRef = useRef<HTMLDivElement | null>(null);

  const showBeatIndicator = useCallback(() => {
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
  }, []);

  const animate = useCallback((params: AudioParameters) => {
    const { byteData, floatData } = audioService.current.getFrequencyData();
    setFftData(floatData);
    
    const average = byteData.reduce((a, b) => a + b, 0) / byteData.length;
    const rawVolume = average / 256;
    const normalizedVolume = softClip(rawVolume * params.gainValue);
    
    const isCurrentlyClipping = rawVolume * params.gainValue > 1;
    setIsClipping(isCurrentlyClipping);
    setVolume(normalizedVolume);
    
    const sampleRate = 44100; // Default sample rate
    const minBin = Math.floor((60 * BUFFER_SIZE) / sampleRate);
    const maxBin = Math.floor((2000 * BUFFER_SIZE) / sampleRate);
    
    const relevantData = byteData.slice(minBin, maxBin);
    const peaks = findFrequencyPeaks(
      relevantData,
      Math.floor(params.minPeakDistance / 1000 * sampleRate),
      params.peakThreshold * 256
    );
    
    if (peaks.length > 0) {
      const currentTime = Date.now();
      const lastPeak = peakTimesRef.current[peakTimesRef.current.length - 1] || 0;
      
      if (currentTime - lastPeak > params.minPeakDistance) {
        peakTimesRef.current.push(currentTime);
        showBeatIndicator();
        
        if (peakTimesRef.current.length > BPM_HISTORY_SIZE) {
          peakTimesRef.current.shift();
        }
        
        const bpmResult = calculateBPM(peakTimesRef.current);
        if (bpmResult.bpm > 0) {
          setBpm(bpmResult.bpm);
          setDebugData({
            currentPeaks: [...peakTimesRef.current],
            intervalMs: bpmResult.intervalMs,
            rawBpm: bpmResult.rawBpm,
            rawVolume
          });
        }
      }
    }
    
    drawVisualization(byteData);
    animationRef.current = requestAnimationFrame(() => animate(params));
  }, []);

  const drawVisualization = useCallback((dataArray: Uint8Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.fillRect(0, 0, width, height);
    
    const usableLength = 256;
    const barWidth = width / usableLength;
    
    for (let i = 0; i < usableLength; i++) {
      const rawValue = (dataArray[i] / 256);
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
  }, []);

  const startListening = async (params: AudioParameters) => {
    try {
      await audioService.current.initialize();
      audioService.current.updateParameters(params);
      setIsListening(true);
      animate(params);
    } catch (err) {
      setError('Microphone access denied');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopListening = useCallback(() => {
    audioService.current.cleanup();
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
  }, []);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
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
    beatIndicatorRef
  };
};