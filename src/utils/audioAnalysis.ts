import type { BPMAnalysisResult } from "@/types/audio";

export const frequencyToBin = (frequency: number, sampleRate: number, fftSize: number): number => {
  return Math.floor((frequency * fftSize) / sampleRate);
};

export const softClip = (value: number, amount = 0.9): number => {
  return Math.tanh(value * amount);
};

export const findFrequencyPeaks = (
  dataArray: Uint8Array,
  minPeakDistance: number,
  threshold: number
): number[] => {
  const peaks = [];
  for (let i = 1; i < dataArray.length - 1; i++) {
    if (
      dataArray[i] > dataArray[i - 1] &&
      dataArray[i] > dataArray[i + 1] &&
      dataArray[i] > threshold
    ) {
      if (peaks.length === 0 || (i - peaks[peaks.length - 1]) >= minPeakDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
};

export const calculateBPM = (peakTimes: number[]): BPMAnalysisResult => {
  if (peakTimes.length < 2) {
    return { bpm: 0, intervalMs: 0, rawBpm: 0 };
  }
  
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