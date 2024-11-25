# Real-time BPM Detector & Audio Visualizer

A modern web application that detects BPM from audio input in real-time while providing stunning WebGL-based visualizations.

![BPM Detector Screenshot]
*Screenshot placeholder - Add your own screenshot here*

## Features

- 🎵 Real-time BPM detection from microphone input
- 🎨 WebGL-powered audio visualization
- 🎛️ Adjustable audio parameters:
  - Gain control
  - Peak detection sensitivity
  - Filter frequency and Q
  - Smoothing controls
- 📊 FFT spectrum analyzer
- 🖥️ Fullscreen mode
- 🎯 Beat indication system
- 📱 Responsive design with collapsible sidebar

## Tech Stack

- React 18
- TypeScript
- WebGL 2.0
- Web Audio API
- Tailwind CSS
- shadcn/ui components
- Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
\```bash
git clone https://github.com/yourusername/bpm-detector.git
cd bpm-detector
\```

2. Install dependencies:
\```bash
npm install
# or
pnpm install
\```

3. Start the development server:
\```bash
npm run dev
# or
pnpm dev
\```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Click the "Start" button to begin audio capture
2. Allow microphone access when prompted
3. Adjust parameters in the sidebar to optimize detection:
   - **Gain**: Amplifies input signal (0.1x - 5.0x)
   - **Min Peak Distance**: Minimum time between beats (100ms - 1000ms)
   - **Peak Threshold**: Sensitivity of beat detection (0.1 - 0.9)
   - **Filter Frequency**: Center frequency for bandpass filter (60Hz - 2000Hz)
   - **Filter Q**: Sharpness of the frequency filter (0.1 - 5.0)

## Building for Production

To create a production build:

\```bash
npm run build
# or
pnpm build
\```

The built files will be in the `dist` directory.

## Project Structure

\```
src/
├── components/         # React components
│   ├── BPMDetector.tsx    # Main BPM detection logic
│   ├── Visualizer.tsx     # WebGL visualization
│   └── ui/               # UI components
├── lib/
│   ├── shaders/         # GLSL shader code
│   └── utils.ts         # Utility functions
└── App.tsx             # Root component
\```

## How It Works

The application uses the Web Audio API to capture and analyze audio input in real-time. The audio signal goes through the following pipeline:

1. Audio capture via `getUserMedia`
2. Processing through Web Audio nodes:
   - Gain node for amplitude control
   - BiquadFilter for frequency isolation
   - AnalyserNode for FFT analysis
3. Peak detection algorithm for beat identification
4. BPM calculation based on inter-beat intervals
5. WebGL visualization using custom GLSL shaders

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [totetmatt](https://www.shadertoy.com/user/totetmatt) for the bubbles shader