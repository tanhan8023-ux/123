import React, { useState, useEffect, useRef } from 'react';
import { Battery, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface DynamicStatusWidgetProps {
  onLongPress?: () => void;
  bgImage?: string;
  onClick?: () => void;
}

export function DynamicStatusWidget({ onLongPress, bgImage, onClick }: DynamicStatusWidgetProps) {
  const [time, setTime] = useState(new Date());
  const [battery, setBattery] = useState<number | null>(null);
  
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    let batteryManager: any = null;
    let listener: any = null;
    const updateBattery = (bm: any) => {
      setBattery(Math.round(bm.level * 100));
    };

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bm: any) => {
        batteryManager = bm;
        listener = () => updateBattery(bm);
        updateBattery(bm);
        bm.addEventListener('levelchange', listener);
      }).catch(() => {
        setBattery(80);
      });
    } else {
      setBattery(80);
    }

    // Polling as a fallback
    const pollInterval = setInterval(() => {
      if (batteryManager) {
        updateBattery(batteryManager);
      }
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(pollInterval);
      if (batteryManager && listener) {
        batteryManager.removeEventListener('levelchange', listener);
      }
    };
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return { hours, minutes };
  };

  const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return { dateStr: `${month}-${day}`, weekday };
  };

  const { hours, minutes } = formatTime(time);
  const { dateStr, weekday } = formatDate(time);

  // Calculate day progress for "今日剩余"
  const startOfDay = new Date(time.getFullYear(), time.getMonth(), time.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
  const progress = ((time.getTime() - startOfDay) / (endOfDay - startOfDay)) * 100;
  const remaining = Math.round(100 - progress);

  return (
    <button 
      className="w-full h-full bg-white/5 backdrop-blur-sm rounded-[2.5rem] p-5 flex flex-col items-center justify-between shadow-sm border border-white/10 relative overflow-hidden text-left cursor-default group"
      onPointerDown={(e) => {
        touchStartTime.current = Date.now();
        longPressTimer.current = setTimeout(() => {
          onLongPress?.();
        }, 600);
      }}
      onPointerUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Only trigger if it wasn't a long press
        if (Date.now() - touchStartTime.current < 500) {
          onClick?.();
        }
      }}
    >
      {bgImage && (
        <img src={bgImage} className="absolute inset-0 w-full h-full object-cover z-0" alt="Background" />
      )}
      <div className={`absolute inset-0 z-1 ${bgImage ? 'bg-black/20' : ''}`} />

      {/* Top Pill */}
      <div className="bg-neutral-100/80 px-4 py-1 rounded-full flex items-center gap-2 mb-2 pointer-events-none z-10">
        <span className="text-[10px] text-neutral-500 font-medium">今日剩余 {remaining}%</span>
        <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center">
          <Heart size={10} className="text-pink-400 fill-pink-400" />
        </div>
      </div>

      {/* Date and Quote */}
      <div className={`flex items-center gap-4 ${bgImage ? 'text-white/80' : 'text-neutral-400'} text-[13px] font-medium mb-1 pointer-events-none z-10`}>
        <span>{dateStr}</span>
        <span>{weekday}</span>
        <span className={bgImage ? 'text-white/60' : 'text-neutral-300'}>Love is more than that</span>
      </div>

      {/* Large Clock */}
      <div className="flex items-center gap-6 relative pointer-events-none z-10">
        {/* Left Wing */}
        <div className="opacity-20">
          <svg width="40" height="30" viewBox="0 0 40 30" fill="currentColor" className={bgImage ? 'text-white' : 'text-neutral-400'}>
             <path d="M0 15C0 15 10 0 25 5C25 5 15 10 20 20C20 20 10 15 0 15Z" />
             <path d="M5 20C5 20 15 10 30 15C30 15 20 20 25 25C25 25 15 20 5 20Z" opacity="0.6" />
          </svg>
        </div>

        <div className={`flex items-center gap-3 text-[56px] font-bold ${bgImage ? 'text-white' : 'text-neutral-700'} tracking-tighter leading-none`}>
          <span>{hours}</span>
          <span className="animate-pulse opacity-50">:</span>
          <span>{minutes}</span>
        </div>

        {/* Right Wing */}
        <div className="opacity-20 scale-x-[-1]">
          <svg width="40" height="30" viewBox="0 0 40 30" fill="currentColor" className={bgImage ? 'text-white' : 'text-neutral-400'}>
             <path d="M0 15C0 15 10 0 25 5C25 5 15 10 20 20C20 20 10 15 0 15Z" />
             <path d="M5 20C5 20 15 10 30 15C30 15 20 20 25 25C25 25 15 20 5 20Z" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="w-full flex items-end justify-between mt-2 pointer-events-none z-10">
        <div className="flex flex-col gap-0.5">
          <div className={`flex items-center gap-1 text-[10px] ${bgImage ? 'text-white/80' : 'text-neutral-400'} font-bold`}>
            <Battery size={12} className="rotate-90" />
            <span>{battery !== null ? `${battery}%` : 'N/A'}</span>
          </div>
          <div className={`text-[10px] ${bgImage ? 'text-white/70' : 'text-neutral-400'} font-medium italic`}>keep loving</div>
          <div className="flex gap-1 mt-1">
            {[1,2,3,4].map(i => <Heart key={i} size={8} className={bgImage ? 'text-white/40' : 'text-neutral-300'} />)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`flex-1 mx-4 h-1.5 ${bgImage ? 'bg-white/20' : 'bg-neutral-100'} rounded-full overflow-hidden mb-1`}>
          <div className={`h-full ${bgImage ? 'bg-white/60' : 'bg-neutral-400/40'} rounded-full`} style={{ width: '45%' }}></div>
        </div>

        {/* Circular Stats */}
        <div className="flex gap-2">
          <div className={`w-8 h-8 rounded-full border-2 ${bgImage ? 'border-white/20' : 'border-neutral-100'} flex flex-col items-center justify-center scale-90`}>
            <span className={`text-[8px] font-bold ${bgImage ? 'text-white' : 'text-neutral-600'} leading-none`}>2</span>
            <span className={`text-[6px] ${bgImage ? 'text-white/60' : 'text-neutral-400'} scale-75`}>生日</span>
          </div>
          <div className={`w-8 h-8 rounded-full border-2 ${bgImage ? 'border-white/20' : 'border-neutral-100'} flex flex-col items-center justify-center scale-90 relative`}>
             <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke={bgImage ? "rgba(255,255,255,0.1)" : "#e5e5e5"} strokeWidth="2" />
                <circle cx="16" cy="16" r="14" fill="none" stroke={bgImage ? "rgba(255,255,255,0.6)" : "#a3a3a3"} strokeWidth="2" strokeDasharray="88" strokeDashoffset="20" />
             </svg>
            <span className={`text-[8px] font-bold ${bgImage ? 'text-white' : 'text-neutral-600'} leading-none z-10`}>307</span>
            <span className={`text-[6px] ${bgImage ? 'text-white/60' : 'text-neutral-400'} scale-75 z-10`}>今年</span>
          </div>
        </div>
      </div>
    </button>
  );
}
