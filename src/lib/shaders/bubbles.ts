import glsl from 'glslify';


// Credit: https://www.shadertoy.com/view/lcjGWV
// https://www.shadertoy.com/user/totetmatt

export const fragmentShaderSource = glsl`#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uBeatCount;
uniform float uLastBeatTime;
uniform float uBeatDuration;
uniform sampler2D uFFTTexture;
in vec2 vUv;

out vec4 fragColor;

struct Grid {
    vec3 id;
    float d;
} gr;

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

float getFFTValue(float x) {
    float raw = texture(uFFTTexture, vec2(x, 0.0)).r;
    return pow(raw, 0.85) * 0.4;
}

float easeOutQuad(float x) {
    return 1.0 - (1.0 - x) * (1.0 - x);
}

float getBeatProgress() {
    float timeSinceLastBeat = uTime - uLastBeatTime;
    return clamp(timeSinceLastBeat / uBeatDuration, 0.0, 1.0);
}

vec3 erot(vec3 p, vec3 ax, float baseSpeed) {
    float accumulatedRotation = uBeatCount * 0.00015;
    float beatProgress = getBeatProgress();
    float easedProgress = easeOutQuad(beatProgress);

    float currentBeatRotation = smoothstep(0.0, 1.0, beatProgress) * 0.05 * getFFTValue(0.1);

    float beatBoost = (1.0 - easedProgress) * (1.0 - easedProgress) * 0.0005  * getFFTValue(0.1);
    float totalRotation = 3.0 * (accumulatedRotation + currentBeatRotation + beatBoost);
    return mix(dot(ax, p) * ax, p, cos(totalRotation)) + cross(ax, p) * sin(totalRotation);
}

void dogrid(vec3 ro, vec3 rd, float size) {
    gr.id = (floor(ro + rd * 1E-3) / size + 0.5) * size;
    vec3 src = -(ro - gr.id) / rd;
    vec3 dst = abs(0.5 * size) / rd;
    vec3 bz = src + dst;
    gr.d = min(bz.x, min(bz.y, bz.z));
}

float getModulatedRadius(vec3 gridId, float baseRadius) {
    float bassFreq = getFFTValue(abs(sin(gridId.x * 0.1))) * 1.5;
    float midFreq = getFFTValue(abs(sin(gridId.y * 0.2 + 0.3))) * 1.2;
    float highFreq = getFFTValue(abs(cos(gridId.z * 0.3 + 0.6))) * 0.8;
    float radiusModulation = bassFreq * 0.12 + midFreq * 0.08 + highFreq * 0.04;
    float spatialVariation = sin(gridId.x + gridId.y + gridId.z + uTime * 0.5) * 0.1;
    return baseRadius + radiusModulation + spatialVariation;
}

float getOrbShape(vec3 p, float rn, float gy) {
    float baseRadius = 0.01 + gy * 0.05 - rn * 0.02;
    float dynamicRadius = getModulatedRadius(gr.id, baseRadius);
    float bassDeform = getFFTValue(0.1) * sin(p.x * 8.0 + uTime) * 0.7;
    float midDeform = getFFTValue(0.5) * sin(p.y * 6.0 + uTime * 1.2) * 0.5;
    float highDeform = getFFTValue(0.9) * sin(p.z * 4.0 + uTime * 0.8) * 0.4;
    vec3 deformedP = p;
    deformedP.x += bassDeform;
    deformedP.y += midDeform;
    deformedP.z += highDeform;
    return rn > 0.0 ? 0.5 : length(deformedP) - dynamicRadius;
}

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
    float baseRadius = 0.25;
    float barWidth = 0.008;
    
    // Calculate the radial bar effect
    float barDist = abs(dist - (baseRadius + fftValue * 0.9));
    float barMask = smoothstep(barWidth, 0.0, barDist);
    
    // Add stronger glow to the bars
    float glow = exp(-barDist * 4.0) * 0.9;
    
    // Calculate intensity for color modulation
    float intensity = fftValue * 2.0;
    
    // Create dynamic color based on intensity
    vec3 baseColor = vec3(0.2, 0.8, 1.0);
    vec3 peakColor = vec3(1.0, 0.2, 0.8);
    vec3 barColor = mix(baseColor, peakColor, intensity);
    
    // Enhanced alpha for more visibility
    float alpha = (barMask + glow) * smoothstep(1.2, 0.0, dist) * 0.9;
    
    // Add extra glow based on overall FFT intensity
    float totalIntensity = getFFTValue(0.1) + getFFTValue(0.5) + getFFTValue(0.9);
    barColor *= 1.0 + totalIntensity * 0.9;
    
    return vec4(barColor, alpha);
}

const float MIN_ZOOM = 1.0;
const float MAX_ZOOM = 4.0;

float getZoom(float currentTime, float lastBeatTime, float beatDuration, float beatCount) {
    // Slow cycle using sin
    float cycleSpeed = 0.15; // Adjust this to change speed of zoom cycle
    float cycle = sin(currentTime * cycleSpeed);
    
    // Use tanh to smoothen the transitions at min/max points
    float smoothCycle = tanh(cycle * 1.5); // Adjust 1.5 to change "squareness" of the wave
    
    // Remap from [-1,1] to [0,1]
    float progress = smoothCycle * 0.5 + 0.5;
    
    return mix(MIN_ZOOM, MAX_ZOOM, progress);
}

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

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
    vec3 col = vec3(0.);
    
    vec3 ro = vec3(0.2, 0.2, -5.);
    vec3 rt = vec3(0.);
    vec3 z = normalize(rt - ro);
    vec3 x = normalize(cross(z, vec3(0., -1., 0.)));
    vec3 y = cross(z, x);
    
    float zoom = getZoom(uTime, uLastBeatTime, uBeatDuration, uBeatCount);
    vec3 perspective = vec3(uv, zoom);
    vec3 rd = mat3(x, y, z) * normalize(perspective);
    
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

        // Add subtle position-based variation
        // baseColor += 0.05 * vec3(
        //     sin(gr.id.x * 0.3 + uTime),
        //     cos(gr.id.y * 0.2 + uTime * 0.7),
        //     sin(gr.id.z * 0.25 + uTime * 0.5)
        // );

        // Add gentle FFT-based color modulation
        // float bassColor = getFFTValue(0.1) * sin(uTime + rn) * 1.0;
        // float midColor = getFFTValue(0.5) * cos(uTime * 0.7 + gy) * 0.15;
        // float highColor = getFFTValue(0.9) * sin(uTime * 0.5 + gr.id.z) * 0.1;
        
        // baseColor += vec3(bassColor, midColor, highColor);

        baseColor = normalize(baseColor) * (0.03 + (0.02 * exp(5. * fract(gy + uTime)))) / exp(e * e * i);




        
        col += baseColor;
    }
    
    col *= exp(-0.07 * g);
    
    vec4 fftOverlay = createFFTOverlay(uv);
    float blendFactor = fftOverlay.a;
    col = mix(sqrt(col), fftOverlay.rgb, blendFactor);
    
    col += fftOverlay.rgb * fftOverlay.a * 0.9;
    
    fragColor = vec4(col, 0.3);
}`;