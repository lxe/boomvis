import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface SidebarToggleProps {
  isOpen: boolean;
  isFullscreen: boolean;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  sidebarWidth: number;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  isOpen,
  isFullscreen,
  onToggleSidebar,
  onToggleFullscreen,
  sidebarWidth,
}) => {
  return (
    <div 
      className="absolute right-0 top-4 flex gap-2 z-10"
      style={{
        right: isOpen ? `${sidebarWidth}px` : '0',
      }}
    >
      <button
        onClick={onToggleFullscreen}
        className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 p-1.5 rounded-l-sm transition-all duration-200"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
      <button
        onClick={onToggleSidebar}
        className="bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 p-1.5 rounded-l-sm transition-all duration-200"
      >
        {isOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
};