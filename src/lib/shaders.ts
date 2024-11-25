import { glsl } from "@/utils/glsl";

export const __fragmentShaderSource = glsl`#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uBeatCount;
uniform float uLastBeatTime;
uniform float uBeatDuration;
uniform sampler2D uFFTTexture;
in vec2 vUv;

out vec4 fragColor;

float getFFTValue(float x) {
    // x is already in exponential scale from our CPU-side processing
    float raw = texture(uFFTTexture, vec2(x, 0.0)).r;
    // Enhance visibility of smaller values
    return pow(raw, 0.3) * 3.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    
    vec3 color = vec3(0.0);
    
    // FFT spectrum analyzer
    if (vUv.y < 0.3) {
        float fftValue = getFFTValue(vUv.x);
        
        float barHeight = 0.3;
        float normalizedHeight = vUv.y / barHeight;
        
        if (normalizedHeight < fftValue) {
            // Color based on frequency range
            vec3 lowColor = vec3(1.0, 0.2, 0.2);   // Red for bass (0-200Hz)
            vec3 lowMidColor = vec3(1.0, 0.7, 0.2); // Orange for low-mids (200-800Hz)
            vec3 midColor = vec3(0.2, 1.0, 0.2);    // Green for mids (800-2.5kHz)
            vec3 highColor = vec3(0.2, 0.2, 1.0);   // Blue for highs (2.5kHz+)
            
            float freq = vUv.x;
            if (freq < 0.25) {
                color = mix(lowColor, lowMidColor, freq * 4.0);
            } else if (freq < 0.5) {
                color = mix(lowMidColor, midColor, (freq - 0.25) * 4.0);
            } else if (freq < 0.75) {
                color = mix(midColor, highColor, (freq - 0.5) * 4.0);
            } else {
                color = highColor;
            }
            
            // Add brightness based on intensity
            color *= fftValue * (1.0 + 0.5 * sin(uTime * 4.0));
        }
        
        // Frequency range markers
        float markerLine = step(0.98, fract(vUv.x * 8.0));
        color = mix(color, vec3(0.3), markerLine);
    }
    
    // Frequency band monitors
    else {
        // Sample at meaningful frequency points
        float bassFFT = getFFTValue(0.1);     // ~50Hz
        float lowMidFFT = getFFTValue(0.3);   // ~200Hz
        float midFFT = getFFTValue(0.5);      // ~800Hz
        float highFFT = getFFTValue(0.7);     // ~2.5kHz
        
        vec2 gridPos = floor((vUv - vec2(0.0, 0.3)) * vec2(2.0, 2.0));
        
        if (gridPos.x < 1.0 && gridPos.y < 1.0) {
            color = vec3(bassFFT, 0.0, 0.0);
        } else if (gridPos.x >= 1.0 && gridPos.y < 1.0) {
            color = vec3(0.0, lowMidFFT, 0.0);
        } else if (gridPos.x < 1.0 && gridPos.y >= 1.0) {
            color = vec3(0.0, 0.0, midFFT);
        } else {
            color = vec3(highFFT, highFFT, 0.0);
        }
        
        // Grid lines
        vec2 gridUv = fract((vUv - vec2(0.0, 0.3)) * vec2(2.0, 2.0));
        vec2 gridLines = step(0.95, gridUv) + step(0.95, 1.0 - gridUv);
        float isGridLine = min(1.0, gridLines.x + gridLines.y);
        color = mix(color, vec3(1.0), isGridLine * 0.2);
    }
    
    // Add ambient light
    color += vec3(0.02);
    
    fragColor = vec4(color, 1.0);
}`

// Updated vertex shader to pass UV coordinates
export const vertexShaderSource = glsl`#version 300 es
in vec4 aPosition;
out vec2 vUv;

void main() {
    vUv = aPosition.xy * 0.5 + 0.5;
    gl_Position = aPosition;
}`;
