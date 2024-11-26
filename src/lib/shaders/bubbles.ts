import { glsl } from "@/utils/glsl";

// Credit: https://www.shadertoy.com/view/lcjGWV
// https://www.shadertoy.com/user/totetmatt

export const fragmentShaderSource = glsl`#version 300 es
precision highp float;

// Configuration flags and parameters
const bool ENABLE_UNDERWATER_EFFECT = false; // Toggle underwater effect
const float WAVE_STRENGTH = 0.02; // Strength of wave distortion
const float ROTATION_SPEED = 0.1; // Speed of continuous rotation
const float BEAT_ROTATION_BOOST = 0.2; // Additional rotation speed on beat
const float COLOR_INTENSITY = 0.2; // Intensity of color modulation
const float MIN_ZOOM = -0.6; // Minimum zoom level
const float MAX_ZOOM = 5.0; // Maximum zoom level
const float ZOOM_CYCLE_SPEED = 0.4; // Speed of zoom cycling
const float DWELL_FACTOR = 0.8; // Factor for dwelling at zoom levels
const float BASS_FFT_ROTATION_MULTIPLIER = 2.0; // Bass FFT multiplier for rotation calculation
const float MID_FFT_ROTATION_MULTIPLIER = 0.5; // Mid FFT multiplier for rotation calculation

// Uniforms
uniform float uTime; // Current time
uniform vec2 uResolution; // Resolution of the viewport
uniform float uBeatCount; // Number of beats
uniform float uLastBeatTime; // Time of the last beat
uniform float uBeatDuration; // Duration of a beat
uniform sampler2D uFFTTexture; // FFT texture for audio visualization
in vec2 vUv; // Varying UV coordinates

out vec4 fragColor; // Output color

// Grid structure for 3D grid calculations
struct Grid {
    vec3 id; // Grid cell identifier
    float d; // Distance to the next grid cell
} gr;

// Hash functions for pseudo-random number generation
#define FBI(p) floatBitsToInt(p)
#define FFBI(a) FBI(cos(a))^FBI(a)

float hash(vec3 uv) {
    int x = FFBI(uv.x);
    int y = FFBI(uv.y);
    int z = FFBI(uv.z);
    return float((x * x + y) * (y * y - x) * (z * z + x)) / 2.14e9;
}

float hashfloat(float p) {
    uvec2 n = floatBitsToUint(vec2(p, p + 0.1));
    uint s = n.x ^ n.y;
    s = s * (s + 0x7ED55D16u) + (s * (s ^ s >> 12));
    return float(s) * (1.0 / float(0xffffffffu));
}

// Retrieve FFT value from texture
float getFFTValue(float x) {
    float raw = texture(uFFTTexture, vec2(x, 0.0)).r;
    return pow(raw, 0.85) * 0.4;
}

// Easing function for smooth transitions
float easeOutQuad(float x) {
    return 1.0 - (1.0 - x) * (1.0 - x);
}

// Calculate progress of the current beat
float getBeatProgress() {
    float timeSinceLastBeat = uTime - uLastBeatTime;
    return clamp(timeSinceLastBeat / uBeatDuration, 0.0, 1.0);
}

// Rotate a point around an axis with modulation
vec3 erot(vec3 p, vec3 ax, float baseSpeed) {
    float continuousRotation = uTime * ROTATION_SPEED;
    float beatProgress = getBeatProgress();
    float easedProgress = easeOutQuad(beatProgress);

    // Increase rotation speed briefly on beat
    float beatRotationBoost = smoothstep(0.0, 1.0, beatProgress) * 
        BEAT_ROTATION_BOOST * 
        (getFFTValue(0.1) * BASS_FFT_ROTATION_MULTIPLIER) + 
        (getFFTValue(0.5) * MID_FFT_ROTATION_MULTIPLIER);

    // Total rotation includes continuous rotation and beat-induced boost
    float totalRotation = continuousRotation + beatRotationBoost;
    
    return mix(dot(ax, p) * ax, p, cos(totalRotation)) + cross(ax, p) * sin(totalRotation);
}

// Calculate grid intersection
void dogrid(vec3 ro, vec3 rd, float size) {
    gr.id = (floor(ro + rd * 1E-3) / size + 0.5) * size;
    vec3 src = -(ro - gr.id) / rd;
    vec3 dst = abs(0.5 * size) / rd;
    vec3 bz = src + dst;
    gr.d = min(bz.x, min(bz.y, bz.z));
}

// Modulate radius based on FFT values
float getModulatedRadius(vec3 gridId, float baseRadius) {
    float bassFreq = getFFTValue(abs(sin(gridId.x * 0.1))) * 2.0;
    float midFreq = getFFTValue(abs(sin(gridId.y * 0.2 + 0.3))) * 1.6;
    float highFreq = getFFTValue(abs(cos(gridId.z * 0.3 + 0.6))) * 1.2;
    float radiusModulation = bassFreq * 0.15 + midFreq * 0.1 + highFreq * 0.05;
    float spatialVariation = sin(gridId.x + gridId.y + gridId.z + uTime * 0.5) * 0.1;
    return baseRadius + radiusModulation + spatialVariation;
}

// Calculate shape of the orb with deformation
float getOrbShape(vec3 p, float rn, float gy) {
    float baseRadius = 0.01 + gy * 0.05 - rn * 0.02;
    float dynamicRadius = getModulatedRadius(gr.id, baseRadius);
    
    float bassDeform = getFFTValue(0.1) * sin(p.x * 8.0 + uTime) * 1.2;
    float midDeform = getFFTValue(0.5) * sin(p.y * 6.0 + uTime * 1.2) * 0.9;
    float highDeform = getFFTValue(0.9) * sin(p.z * 4.0 + uTime * 0.8) * 0.7;
    
    vec3 deformedP = p;
    deformedP.x += bassDeform;
    deformedP.y += midDeform;
    deformedP.z += highDeform;
    
    return rn > 0.0 ? 0.5 : length(deformedP) - dynamicRadius;
}

// Create FFT overlay effect
vec4 createFFTOverlay(vec2 uv) {
    float dist = length(uv);
    
    // Add rotation based on time
    float rotationSpeed = 0.2;
    float rotationAngle = uTime * rotationSpeed;
    
    // Apply rotation to UV coordinates
    float cosAngle = cos(rotationAngle);
    float sinAngle = sin(rotationAngle);
    vec2 rotatedUV = vec2(
        uv.x * cosAngle - uv.y * sinAngle,
        uv.x * sinAngle + uv.y * cosAngle
    );
    
    // Calculate angle from rotated coordinates
    float angle = atan(rotatedUV.y, rotatedUV.x);
    
    // Normalize angle from [-π, π] to [0, 1]
    float normalizedAngle = (angle + 3.14159) / (2.0 * 3.14159);
    
    // Sample FFT value based on the normalized angle
    float fftValue = getFFTValue(normalizedAngle);
    
    // Create the circular FFT bars
    float baseRadius = 0.15;
    float barWidth = 0.008 + fftValue * 0.05; // Dynamic thickness
    
    // Calculate the radial bar effect
    float barDist = abs(dist - (baseRadius + fftValue * 0.9));
    float barMask = smoothstep(barWidth, 0.0, barDist);
    
    // Reduce base glow and enhance peak glow
    float baseGlow = exp(-barDist * 4.0) * 0.1; // Reduced base glow
    float peakGlow = exp(-barDist * 9.0) * (0.4 + fftValue * 0.9); // Enhanced peak glow
    
    // Calculate intensity for color modulation
    float intensity = fftValue * 2.5; // Increased intensity for peaks
    
    // Create dynamic color based on intensity
    vec3 baseColor = vec3(0.4, 1.0, 1.2); // Brighter base color
    vec3 peakColor = vec3(1.2, 0.4, 1.0); // Brighter peak color
    vec3 barColor = mix(baseColor, peakColor, intensity);
    
    // Enhanced alpha for more visibility
    float alpha = (barMask + peakGlow) * smoothstep(1.2, 0.0, dist) * (0.9 + fftValue * 0.1); // Dynamic transparency
    
    // Add extra glow based on overall FFT intensity
    float totalIntensity = getFFTValue(0.1) + getFFTValue(0.5) + getFFTValue(0.9);
    barColor *= 1.0 + totalIntensity * 0.9;
    
    return vec4(barColor, alpha);
}

// Calculate zoom level based on time and beat
float getZoom(float currentTime, float lastBeatTime, float beatDuration, float beatCount) {
    // Slow cycle using sin
    float cycleSpeed = ZOOM_CYCLE_SPEED; // Adjust this to change speed of zoom cycle
    float cycle = sin(currentTime * cycleSpeed);
    
    // Use tanh to smoothen the transitions at min/max points
    float smoothCycle = tanh(cycle * 2.0); // Adjust 2.0 to change "squareness" of the wave
    
    // Remap from [-1,1] to [0,1]
    float progress = smoothCycle * 0.5 + 0.5;
    
    // Allow dwelling at certain zoom levels by adjusting the range
    float dwellFactor = DWELL_FACTOR; // Adjust this to control how long it dwells at min/max
    float minZoom = MIN_ZOOM + dwellFactor * (MAX_ZOOM - MIN_ZOOM);
    float maxZoom = MAX_ZOOM - dwellFactor * (MAX_ZOOM - MIN_ZOOM);
    
    return mix(minZoom, maxZoom, progress);
}

// Apply FFT effect to color
vec3 applyFFTEffect(vec3 color, vec3 p, float g) {
    float bassFFT = getFFTValue(0.1) * 1.1;
    float midFFT = getFFTValue(0.5) * 1.1;
    float highFFT = getFFTValue(0.9) * 0.8;
    
    vec3 fftColor = vec3(bassFFT * 1.5, midFFT * 1.2, highFFT * 0.8);
    float wave = sin(p.z * 0.5 + bassFFT * 4.0) * 0.4 + 0.5;
    color *= 1.0 + fftColor * wave * 0.8;
    
    float glow = (bassFFT + midFFT + highFFT) * 0.1;
    color += fftColor * glow * exp(-g * 0.15);
    
    return color;
}

// Main function to render the fragment
void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    vec3 col = vec3(0.);

    if (ENABLE_UNDERWATER_EFFECT) {
        // Add a subtle wave effect to the background
        uv.x += sin(uv.y * 10.0 + uTime * 0.5) * WAVE_STRENGTH;
        uv.y += cos(uv.x * 10.0 + uTime * 0.5) * WAVE_STRENGTH;
    }
    
    vec3 ro = vec3(0.2, 0.2, -5.); // Ray origin
    vec3 rt = vec3(0.); // Ray target
    vec3 z = normalize(rt - ro); // Forward direction
    vec3 x = normalize(cross(z, vec3(0., -1., 0.))); // Right direction
    vec3 y = cross(z, x); // Up direction

    float zoom = getZoom(uTime, uLastBeatTime, uBeatDuration, uBeatCount);
    vec3 perspective = vec3(uv, zoom);
    vec3 rd = mat3(x, y, z) * normalize(perspective); // Ray direction

    float i, e, g;
    float gridlen = 0.;

    for(i = 0., e = 0.01, g = 0.; i++ < 99.;) {
        vec3 p = ro + rd * g;
        p = erot(p, normalize(sin(uTime * 0.33 + vec3(-0.6, 0.4, 0.2))), uTime * 0.2);
        p.z += uTime * 3.0;

        vec3 op = p;

        if(gridlen <= g) {
            dogrid(p, rd, 1.);
            gridlen += gr.d;
        }

        p -= gr.id;
        float gy = dot(sin(gr.id * 2.), cos(gr.id.zxy * 5.));
        float rn = hash(gr.id + floor(2.0));
        p.x += sin(rn) * 0.25;

        float h = getOrbShape(p, rn, gy);
        e = max(0.001 + op.z * 0.000002, abs(h));
        g += e;

        vec3 baseColor = vec3(
            hashfloat(uBeatCount * 1.618033988749895),
            hashfloat(uBeatCount * 2.618033988749895),
            hashfloat(uBeatCount * 1.618033988749895) + abs(rn)
        );

        // Adjust color to more aquatic tones
        if (ENABLE_UNDERWATER_EFFECT) {
            baseColor = mix(baseColor, vec3(0.0, 0.4, 0.6), COLOR_INTENSITY);
        }

        baseColor = normalize(baseColor) * (0.03 + (0.02 * exp(5. * fract(gy + uTime)))) / exp(e * e * i);

        col += baseColor;
    }

    float brightness = 0.12;
    col *= exp(-brightness * g);

    vec4 fftOverlay = createFFTOverlay((gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y); // Use original UVs for FFT
    float blendFactor = fftOverlay.a;
    col = mix(sqrt(col), fftOverlay.rgb, blendFactor);

    col += fftOverlay.rgb * fftOverlay.a * 0.4;

    // Add a blue tint to simulate underwater lighting
    if (ENABLE_UNDERWATER_EFFECT) {
        col = mix(col, vec3(0.0, 0.2, 0.4), 0.2);
    }

    fragColor = vec4(col, 0.3); // Final fragment color with transparency
}`;
