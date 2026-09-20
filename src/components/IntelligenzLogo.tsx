import React from 'react';

interface IntelligenzLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | 'watermark';
  className?: string;
  showText?: boolean;
  interactive?: boolean;
}

export const IntelligenzLogo: React.FC<IntelligenzLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  interactive = false,
}) => {
  const sizeMap = {
    xs: 'w-7 h-7',
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
    hero: 'w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64',
    watermark: 'w-96 h-96 opacity-5 pointer-events-none select-none',
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative flex items-center justify-center shrink-0 ${sizeMap[size]} ${
          interactive ? 'group cursor-pointer transition-transform duration-300 hover:scale-105' : ''
        }`}
      >
        {/* Original Official Club Logo Image Asset (Unmodified, Preserved Aspect Ratio) */}
        <img
          src="/logo.svg"
          alt="IntelliGenZ Club Official Logo"
          className="w-full h-full object-contain select-none"
          loading={size === 'watermark' || size === 'hero' ? 'eager' : 'lazy'}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.triedFallback1) {
              target.dataset.triedFallback1 = 'true';
              target.src = '/club-logo.jpeg';
            } else if (!target.dataset.triedFallback2) {
              target.dataset.triedFallback2 = 'true';
              target.src = '/club%20logo.jpeg';
            } else if (!target.dataset.triedFallback3) {
              target.dataset.triedFallback3 = 'true';
              target.src = '/uploads/club-logo.jpeg';
            }
          }}
        />
      </div>

      {/* Brand Text for Horizontal Layouts */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-white font-['Outfit'] text-lg sm:text-xl leading-none">
              INTELLIGENZ
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              CLUB
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-300 tracking-wide mt-1 leading-tight line-clamp-1">
            Dept. of CSE (AIML) &amp; AI
          </span>
          <span className="text-[9.5px] font-medium text-slate-400 tracking-tight leading-tight line-clamp-1 hidden sm:block">
            DR. K. V. SUBBA REDDY INSTITUTE OF TECHNOLOGY
          </span>
        </div>
      )}
    </div>
  );
};
