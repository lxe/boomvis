import type { DebugData } from "@/types/audio";

interface DebugPanelProps {
  debugData: DebugData;
  volume: number;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugData, volume }) => {
  return (
    <div className="p-3 bg-slate-700 rounded-lg shadow-md text-xs text-gray-400 grid grid-cols-2 gap-2">
      <div>Raw Volume: {(debugData.rawVolume * 100).toFixed(1)}%</div>
      <div>Amplified: {(volume * 100).toFixed(1)}%</div>
      <div>Raw BPM: {debugData.rawBpm}</div>
      <div>Avg Interval: {debugData.intervalMs.toFixed(1)}ms</div>
      <div>Peak Count: {debugData.currentPeaks.length}</div>
      <div className="col-span-2 text-xxs">
        Recent peaks: {debugData.currentPeaks.slice(-5).map(t => t % 10000).join(', ')}
      </div>
    </div>
  );
};
