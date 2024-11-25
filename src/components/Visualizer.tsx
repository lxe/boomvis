import { useEffect, useRef, useState, useCallback } from 'react';

import { vertexShaderSource } from '../lib/shaders';
// import { fragmentShaderSource } from '../lib/shaders/ffttest';
import { fragmentShaderSource } from '../lib/shaders/bubbles';

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${error}`);
  }

  return shader;
};

const createProgram = (gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) => {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${error}`);
  }

  return program;
};

interface Props {
  beatIntensity?: number;
  fftData?: Float32Array;
  isListening?: boolean;
}

interface UniformLocations {
  position: number;
  time: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  beatCount: WebGLUniformLocation | null;
  lastBeatTime: WebGLUniformLocation | null;
  beatDuration: WebGLUniformLocation | null;
  fftTexture: WebGLUniformLocation | null;
}

// Improved FFT data processing utilities
const processFFTData = (fftData: Float32Array, frequencyBands: number): Float32Array => {
  const sampleRate = 44100;
  const binCount = fftData.length;
  const maxFreq = 20000;
  const minFreq = 20;
  
  const normalizedData = new Float32Array(frequencyBands);
  const smoothingFactor = 0.7; // Adjust this to control smoothing amount
  
  for (let i = 0; i < frequencyBands; i++) {
    // Use logarithmic frequency mapping
    const freq = minFreq * Math.exp(Math.log(maxFreq / minFreq) * (i / frequencyBands));
    const bin = Math.floor((freq * binCount) / sampleRate);
    
    if (bin < binCount) {
      // Get the dB value and normalize it with improved range
      const db = fftData[bin];
      // Adjust these ranges based on your audio input characteristics
      const minDb = -90;
      const maxDb = -30;
      
      // Improved normalization with compression
      let normalizedValue = (Math.max(minDb, Math.min(maxDb, db)) - minDb) / (maxDb - minDb);
      
      // Apply non-linear compression to reduce extreme values
      normalizedValue = Math.pow(normalizedValue, 1.5);
      
      // Smooth the transitions
      if (i > 0) {
        normalizedValue = smoothingFactor * normalizedData[i - 1] + (1 - smoothingFactor) * normalizedValue;
      }
      
      // Additional clamping to ensure we stay within 0-1 range
      normalizedData[i] = Math.max(0, Math.min(1, normalizedValue));
    }
  }
  
  return normalizedData;
};

export default function Visualizer({ beatIntensity = 0, fftData, isListening = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const uniformLocationsRef = useRef<UniformLocations | null>(null);
  const prevBeatIntensityRef = useRef<number>(beatIntensity);
  const fftTextureRef = useRef<WebGLTexture | null>(null);
  const previousFFTDataRef = useRef<Float32Array | null>(null);

  const [beatCount, setBeatCount] = useState<number>(0);
  const [lastBeatTime, setLastBeatTime] = useState<number>(0);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const gl = glRef.current;
    
    if (!canvas || !container || !gl) return;

    // Get the display pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Get the CSS size from the container
    const displayWidth = container.clientWidth;
    const displayHeight = container.clientHeight;
    
    // Set the canvas size in CSS pixels
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Set the canvas buffer size scaled for the pixel ratio
    canvas.width = Math.floor(displayWidth * pixelRatio);
    canvas.height = Math.floor(displayHeight * pixelRatio);
    
    // Update the viewport to match
    gl.viewport(0, 0, canvas.width, canvas.height);
  }, []);

  // Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    glRef.current = gl;

    try {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      const program = createProgram(gl, vertexShader, fragmentShader);
      programRef.current = program;

      uniformLocationsRef.current = {
        position: gl.getAttribLocation(program, 'aPosition'),
        time: gl.getUniformLocation(program, 'uTime'),
        resolution: gl.getUniformLocation(program, 'uResolution'),
        beatCount: gl.getUniformLocation(program, 'uBeatCount'),
        lastBeatTime: gl.getUniformLocation(program, 'uLastBeatTime'),
        beatDuration: gl.getUniformLocation(program, 'uBeatDuration'),
        fftTexture: gl.getUniformLocation(program, 'uFFTTexture')
      };

      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);

      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const fftTexture = gl.createTexture();
      fftTextureRef.current = fftTexture;
      gl.bindTexture(gl.TEXTURE_2D, fftTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      handleResize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(frameRef.current);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(positionBuffer);
        gl.deleteTexture(fftTexture);
      };
    } catch (error) {
      console.error('WebGL initialization failed:', error);
    }
  }, [handleResize]);

  // Beat tracking
  useEffect(() => {
    if (beatIntensity === 1 && prevBeatIntensityRef.current === 0) {
      setBeatCount(prev => prev + 1);
      setLastBeatTime((Date.now() - startTimeRef.current) * 0.001);
    }
    prevBeatIntensityRef.current = beatIntensity;
  }, [beatIntensity]);

  // FFT processing
  useEffect(() => {
    const gl = glRef.current;
    const fftTexture = fftTextureRef.current;
    
    if (!gl || !fftTexture || !fftData) return;
  
    const frequencyBands = 1024;
    const normalizedData = processFFTData(fftData, frequencyBands);
    
    gl.bindTexture(gl.TEXTURE_2D, fftTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      normalizedData.length,
      1,
      0,
      gl.RED,
      gl.FLOAT,
      normalizedData
    );
    
    previousFFTDataRef.current = normalizedData;
    
    // Debug output for first few bands
    if (isListening) {
      // console.log('FFT bands [0-4]:', 
      //   Array.from(normalizedData.slice(0, 5))
      //     .map(v => v.toFixed(3))
      //     .join(', ')
      // );
    }
  }, [fftData, isListening]);

  // Render loop
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const uniforms = uniformLocationsRef.current;
    const fftTexture = fftTextureRef.current;

    if (!gl || !program || !uniforms || !fftTexture) return;

    const render = () => {
      const time = (Date.now() - startTimeRef.current) * 0.001;
      
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fftTexture);
      gl.uniform1i(uniforms.fftTexture, 0);
      
      gl.uniform1f(uniforms.time, time);
      gl.uniform2f(uniforms.resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(uniforms.beatCount, beatCount);
      gl.uniform1f(uniforms.lastBeatTime, lastBeatTime);
      gl.uniform1f(uniforms.beatDuration, 0.1);

      gl.enableVertexAttribArray(uniforms.position);
      gl.vertexAttribPointer(uniforms.position, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameRef.current);
  }, [beatCount, lastBeatTime]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          // imageRendering: 'pixelated' // Optional: adds crisp scaling for pixel art
        }}
      />
    </div>
  );
}