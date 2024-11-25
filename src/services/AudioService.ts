import { AudioParameters } from "@/types/audio";

export class AudioService {
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;

  async initialize(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.gainNode = this.audioContext.createGain();
      this.filter = this.audioContext.createBiquadFilter();
      
      this.setupAudioNodes();
    } catch (error) {
      throw new Error('Failed to initialize audio service');
    }
  }

  private setupAudioNodes(): void {
    if (!this.source || !this.gainNode || !this.filter || !this.analyser) return;

    this.source.connect(this.gainNode);
    this.gainNode.connect(this.filter);
    this.filter.connect(this.analyser);
  }

  updateParameters(params: AudioParameters): void {
    if (!this.audioContext) return;

    if (this.filter) {
      this.filter.frequency.setValueAtTime(params.filterFrequency, this.audioContext.currentTime);
      this.filter.Q.setValueAtTime(params.filterQ, this.audioContext.currentTime);
      this.filter.type = 'bandpass';
    }

    if (this.analyser) {
      this.analyser.smoothingTimeConstant = params.smoothingConstant;
    }

    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(params.gainValue, this.audioContext.currentTime);
    }
  }

  getFrequencyData(): { byteData: Uint8Array; floatData: Float32Array } {
    if (!this.analyser) {
      return {
        byteData: new Uint8Array(),
        floatData: new Float32Array()
      };
    }

    const byteData = new Uint8Array(this.analyser.frequencyBinCount);
    const floatData = new Float32Array(this.analyser.frequencyBinCount);
    
    this.analyser.getByteFrequencyData(byteData);
    this.analyser.getFloatFrequencyData(floatData);
    
    return { byteData, floatData };
  }

  cleanup(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}