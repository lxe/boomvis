import { useState } from 'react';
import type { AudioParameters } from '../types/audio';

export const useAudioParameters = () => {
  const [params, setParams] = useState<AudioParameters>({
    minPeakDistance: 350,
    peakThreshold: 0.5,
    smoothingConstant: 0.85,
    filterFrequency: 500,
    filterQ: 1.5,
    gainValue: 1.0
  });

  const updateParameter = <K extends keyof AudioParameters>(
    key: K,
    value: AudioParameters[K]
  ) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return {
    params,
    updateParameter
  };
};
