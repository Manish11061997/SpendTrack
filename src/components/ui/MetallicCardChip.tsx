import React from 'react';

interface MetallicCardChipProps {
  className?: string;
}

export const MetallicCardChip: React.FC<MetallicCardChipProps> = ({ className = '' }) => {
  return (
    <div className={`relative flex items-center gap-2 select-none ${className}`}>
      {/* Metallic EMV Smart Chip */}
      <div 
        className="w-10 h-7.5 rounded-md border border-amber-300/40 relative overflow-hidden shadow-xs shrink-0"
        style={{
          background: 'linear-gradient(135deg, #FFE082 0%, #FFB300 45%, #FFA000 65%, #FFD54F 100%)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), inset 0 -1px 2px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        {/* Microchip internal etching lines */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 p-0.5 pointer-events-none opacity-60">
          <div className="border-r border-b border-amber-900/50 rounded-tl-sm" />
          <div className="border-r border-b border-amber-900/50" />
          <div className="border-b border-amber-900/50 rounded-tr-sm" />
          <div className="border-r border-amber-900/50 rounded-bl-sm" />
          <div className="border-r border-amber-900/50" />
          <div className="rounded-br-sm" />
        </div>
        {/* Core contact pad center */}
        <div className="absolute inset-x-2.5 inset-y-1.5 rounded-xs border border-amber-900/40 bg-amber-200/40 pointer-events-none" />
      </div>

      {/* Contactless Wave Symbol */}
      <div className="text-on-surface-variant/70 dark:text-white/40 flex items-center" title="Contactless Active">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2" strokeLinecap="round">
          <path d="M8.5 16.5a5 5 0 0 1 0-9" />
          <path d="M12 19a8.5 8.5 0 0 1 0-14" />
          <path d="M15.5 21.5a12 12 0 0 1 0-19" />
        </svg>
      </div>
    </div>
  );
};

export default MetallicCardChip;
