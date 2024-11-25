import type { DebugData } from "@/types/audio";

interface DebugPanelProps {
  debugData: DebugData;
  volume: number;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugData, volume }) => {
  return (
    <div className="space-y-2 text-sm text-gray-400">
      <h3 className="font-semibold text-gray-200">Debug Info</h3>
      <div>Raw Volume: {(debugData.rawVolume * 100).toFixed(1)}%</div>
      <div>Amplified: {(volume * 100).toFixed(1)}%</div>
      <div>Raw BPM: {debugData.rawBpm}</div>
      <div>Avg Interval: {debugData.intervalMs.toFixed(1)}ms</div>
      <div>Peak Count: {debugData.currentPeaks.length}</div>
      <div className="text-xs">
        Recent peaks: {debugData.currentPeaks.slice(-5).map(t => t % 10000).join(', ')}
      </div>
    </div>
  );
};
