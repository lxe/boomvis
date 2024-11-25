import { useState, useRef } from 'react';

const useAudioProcessing = () => {
  const [isListening, setIsListening] = useState(false);
  const [bpm, setBpm] = useState(0);
  const [volume, setVolume] = useState(0);
  const [isClipping, setIsClipping] = useState(false);
  const [fftData, setFftData] = useState(new Float32Array());
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const BUFFER_SIZE = 2048;

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      gainNodeRef.current = audioContextRef.current.createGain();

      analyserRef.current.fftSize = BUFFER_SIZE;
      sourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(analyserRef.current);

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
    setIsClipping(false);
  };

  const animate = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    setFftData(new Float32Array(dataArray));

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const rawVolume = average / 256;
    setVolume(rawVolume);

    const isCurrentlyClipping = rawVolume > 1;
    setIsClipping(isCurrentlyClipping);

    animationRef.current = requestAnimationFrame(animate);
  };

  return {
    isListening,
    bpm,
    volume,
    isClipping,
    fftData,
    error,
    startListening,
    stopListening,
  };
};

export default useAudioProcessing; 