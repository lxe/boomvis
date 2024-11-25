import glsl from 'glslify';

// From https://www.shadertoy.com/view/lcjGWV

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
    return pow(raw, 0.85) * 1.5;
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
    
    float spatialVariation = sin(gridId.x + gridId.y + gridId.z + uTime * 0.5) * 0.04;
    
    return baseRadius + radiusModulation + spatialVariation;
}

float getOrbShape(vec3 p, float rn, float gy) {
    float baseRadius = 0.01 + gy * 0.05 - rn * 0.02;
    float dynamicRadius = getModulatedRadius(gr.id, baseRadius);
    
    float bassDeform = getFFTValue(0.1) * sin(p.x * 8.0 + uTime) * 0.07;
    float midDeform = getFFTValue(0.5) * sin(p.y * 6.0 + uTime * 1.2) * 0.05;
    float highDeform = getFFTValue(0.9) * sin(p.z * 4.0 + uTime * 0.8) * 0.04;
    
    vec3 deformedP = p;
    deformedP.x += bassDeform;
    deformedP.y += midDeform;
    deformedP.z += highDeform;
    
    return rn > 0.0 ? 0.5 : length(deformedP) - dynamicRadius;
}

vec3 erot(vec3 p, vec3 ax, float t) {
    return mix(dot(ax, p) * ax, p, cos(t)) + cross(ax, p) * sin(t);
}

const float MIN_ZOOM = 0.9;
const float MAX_ZOOM = 4.5;

float getZoom(float currentTime, float lastBeatTime, float beatDuration, float beatCount) {
    float timeSinceLastBeat = currentTime - lastBeatTime;
    float progress = clamp(timeSinceLastBeat / beatDuration, 0.0, 1.0);
    float smoothProgress = smoothstep(0.0, 1.0, progress);
    
    bool isOddBeat = mod(beatCount, 2.0) == 1.0;
    
    return isOddBeat ? mix(MIN_ZOOM, MAX_ZOOM, smoothProgress) : mix(MAX_ZOOM, MIN_ZOOM, smoothProgress);
}

vec3 applyFFTEffect(vec3 color, vec3 p, float g) {
    float bassFFT = getFFTValue(0.1) * 1.1; 
    float midFFT = getFFTValue(0.5) * 1.1; 
    float highFFT = getFFTValue(0.9) * 0.8; 
    
    vec3 fftColor = vec3(
        bassFFT * 1.5,
        midFFT * 1.2,
        highFFT * 0.8
    );
    
    float wave = sin(p.z * 0.5 + bassFFT * 4.0) * 0.4 + 0.5;
    color *= 1.0 + fftColor * wave * 0.8; 
    
    float glow = (bassFFT + midFFT + highFFT) * 0.1; 
    color += fftColor * glow * exp(-g * 0.15);
    
    return color;
}

vec4 createFFTOverlay(vec2 uv) {
    vec2 fftUV = uv * vec2(1.0, 2.0);
    float freq = abs(fftUV.x);
    
    float fftLow = getFFTValue(freq * 0.25) * 1.1; 
    float fftMid = getFFTValue(freq * 0.5) * 1.0; 
    float fftHigh = getFFTValue(freq * 0.75) * 0.8;
    
    float fftCombined = (fftLow * 0.1 + fftMid * 0.25 + fftHigh * 0.15) * 1.9; 
    
    float heightThreshold = 1.0 - fftCombined;
    float barHeight = step(heightThreshold, abs(fftUV.y));
    float intensity = smoothstep(heightThreshold - 0.1, heightThreshold + 0.1, abs(fftUV.y));
    
    float glow = exp(-abs(fftUV.y - heightThreshold) * 3.5) * fftCombined * 1.5; 
    
    vec3 barColor = mix(
        vec3(0.2, 0.8, 1.0),
        vec3(1.0, 0.2, 0.8),
        freq
    );
    
    barColor = mix(
        barColor,
        vec3(1.0, 0.9, 0.3),
        sin(uTime * 3.0 + freq * 15.0) * 0.25 + 0.25 
    );
    
    barColor *= 1.0 + fftCombined * 0.8;
    
    float alpha = max(intensity * 0.6, glow * 0.8);
    
    return vec4(barColor * (intensity + glow * 1.2), alpha);
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
        p.z += uTime;
        
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
        ) * (0.025 + (0.018 * exp(5. * fract(gy + uTime)))) / exp(e * e * i);
        
        col += applyFFTEffect(baseColor, p, g);
    }
    
    col *= exp(-0.08 * g);
    
    vec4 fftOverlay = createFFTOverlay(uv);
    float blendFactor = fftOverlay.a * 0.6;
    col = mix(sqrt(col), fftOverlay.rgb, blendFactor);
    
    col += fftOverlay.rgb * fftOverlay.a * 0.2;
    
    fragColor = vec4(col, 0.3);
}`;