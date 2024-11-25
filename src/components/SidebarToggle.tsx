import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface SidebarToggleProps {
  isOpen: boolean;
  isFullscreen: boolean;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  isOpen,
  isFullscreen,
  onToggleSidebar,
  onToggleFullscreen,
}) => {
  return (
    <div 
      className="absolute right-0 top-4 flex flex-col gap-2 z-10"
      style={{
        right: '16px',
      }}
    >
      <button
        onClick={onToggleFullscreen}
        className="p-2 rounded-full bg-slate-800/50 backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-200 group"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 className="w-5 h-5 text-slate-300 group-hover:text-white" />
        ) : (
          <Maximize2 className="w-5 h-5 text-slate-300 group-hover:text-white" />
        )}
      </button>
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-full bg-slate-800/50 backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-200 group"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-white" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-white" />
        )}
      </button>
    </div>
  );
};