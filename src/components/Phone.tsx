import React, { useState, useEffect } from 'react';
import { Wifi, Signal, Zap } from 'lucide-react';
import { ThemeSettings } from '../types';

export function Phone({ children, onHomeClick, theme, hideHomeIndicator }: { children: React.ReactNode, onHomeClick: () => void, theme: ThemeSettings, hideHomeIndicator?: boolean }) {
  const [battery, setBattery] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setBattery(b => {
        if (isCharging) return Math.min(100, b + 1);
        return Math.max(0, b - 1);
      });
    }, 3000); // Fast update for demo purposes
    return () => clearInterval(timer);
  }, [isCharging]);

  useEffect(() => {
    const timeTimer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timeTimer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className={`font-sans overflow-hidden ${theme.immersiveMode ? 'fixed inset-0 w-full h-full' : 'h-full flex items-center justify-center sm:bg-neutral-900 sm:p-4'}`} style={{ scrollbarGutter: 'stable' }}>
      {(theme.fontUrl || theme.globalCss) && (
        <style>
          {`
            ${theme.fontUrl ? `
            @font-face {
              font-family: 'CustomThemeFont';
              src: url('${theme.fontUrl}');
            }
            .theme-font {
              font-family: 'CustomThemeFont', sans-serif !important;
            }
            ` : ''}
            ${theme.globalCss || ''}
          `}
        </style>
      )}
      
      {/* Phone Casing */}
      <div 
        className={`relative w-full ${
          theme.immersiveMode 
            ? 'h-full max-w-none rounded-none border-0' 
            : 'h-full sm:w-[393px] sm:h-[852px] sm:rounded-[50px] sm:shadow-2xl sm:border-[8px] border-neutral-800'
        } bg-black flex flex-col shrink-0 overflow-hidden theme-font`}
      >
        
        {/* Background Image */}
        <div className="absolute inset-0 z-0 bg-neutral-900 overflow-hidden">
          {/* Blurred Background for Immersive Mode on Wide Screens */}
          {theme.immersiveMode && (
            <div className="absolute inset-0 z-0">
              {theme.wallpaper ? (
                <img 
                  src={theme.wallpaper} 
                  alt="Blur Background" 
                  className="w-full h-full object-cover blur-3xl opacity-50 scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <img 
                  src="https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=800&q=80" 
                  alt="Blur Background" 
                  className="w-full h-full object-cover blur-3xl opacity-50 scale-110"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          )}

          {/* Main Background - Centered in Immersive Mode */}
          <div className={`relative z-10 w-full h-full ${theme.immersiveMode ? 'max-w-[480px] mx-auto shadow-2xl' : ''}`}>
            {theme.wallpaper ? (
              <img 
                src={theme.wallpaper} 
                alt="Background" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=800&q=80" 
                alt="Snowy Background" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>

        {/* Status Bar */}
        {(theme.showStatusBar !== false) && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] flex items-center justify-between px-6 z-50 text-xs font-bold pointer-events-none"
          style={{ color: theme.statusColor || '#ffffff', paddingTop: 'calc(0.5rem + env(safe-area-inset-top))', height: 'calc(3.5rem + env(safe-area-inset-top))' }}
        >
          <span className="drop-shadow-md text-[13px]">{formatTime(time)}</span>
          
          <div className="flex items-center gap-1.5 drop-shadow-md">
            <span className="text-[10px] mr-1">VPN</span>
            <Signal size={14} strokeWidth={2.5} />
            <Wifi size={14} strokeWidth={2.5} />
            
            {/* Dynamic Battery */}
            <div 
              className="flex items-center gap-1 ml-1 cursor-pointer pointer-events-none"
              title="Click to toggle charging"
            >
              <span className="text-[11px]">{battery}</span>
              <div 
                className="relative w-6 h-3 border rounded-[4px] p-[1px] flex items-center pointer-events-auto"
                onClick={() => setIsCharging(!isCharging)}
                style={{ borderColor: theme.statusColor || '#ffffff' }}
              >
                <div 
                  className={`h-full rounded-[1px] transition-all duration-500 ${isCharging ? 'bg-[#34C759]' : battery <= 20 ? 'bg-red-500' : ''}`} 
                  style={{ 
                    width: `${battery}%`,
                    backgroundColor: (!isCharging && battery > 20) ? (theme.statusColor || '#ffffff') : undefined
                  }}
                ></div>
                <div 
                  className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-1.5 rounded-r-sm opacity-80"
                  style={{ backgroundColor: theme.statusColor || '#ffffff' }}
                ></div>
                {isCharging && <Zap size={10} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white fill-white drop-shadow-sm" />}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Screen Content */}
        <div className={`flex-1 relative z-10 overflow-hidden flex flex-col w-full max-w-[480px] mx-auto ${theme.fontUrl ? 'theme-font' : ''}`}>
          {children}
        </div>

        {/* Home Indicator (Bottom Bar) */}
        {!theme.immersiveMode && !hideHomeIndicator && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-1.5 bg-neutral-800/50 backdrop-blur-sm rounded-full z-50 cursor-pointer" onClick={onHomeClick}></div>
        )}
      </div>
    </div>
  );
}
