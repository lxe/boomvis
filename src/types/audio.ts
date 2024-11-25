export interface AudioParameters {
  minPeakDistance: number;
  peakThreshold: number;
  smoothingConstant: number;
  filterFrequency: number;
  filterQ: number;
  gainValue: number;
}

export interface DebugData {
  currentPeaks: number[];
  intervalMs: number;
  rawBpm: number;
  rawVolume: number;
}

export interface BPMAnalysisResult {
  bpm: number;
  intervalMs: number;
  rawBpm: number;
}
