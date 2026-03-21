import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { ThemeSettings } from '../types';

interface ProfileCardWidgetProps {
  theme: ThemeSettings;
  onEdit?: () => void;
  onLongPress?: () => void;
}

export function ProfileCardWidget({ theme, onEdit, onLongPress }: ProfileCardWidgetProps) {
  const settings = theme.profileCard || {};
  const avatar = settings.avatar || "https://picsum.photos/seed/rabbit/200/200";
  const bgImage = settings.bgImage || "https://picsum.photos/seed/forest/400/200";
  const name = settings.name || "小兔叽萌";
  const signature = settings.signature || "天生我萌必有用·ฅ^•ﻌ•^ฅ·";
  const date = settings.date || "02-27";

  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{x: number, y: number}>({x: 0, y: 0});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  return (
    <button 
      className="w-full h-full bg-white rounded-[2rem] shadow-sm border border-white/50 overflow-hidden flex flex-col relative group cursor-pointer touch-manipulation text-left"
      onPointerDown={(e) => {
        touchStartTime.current = Date.now();
        touchStartPos.current = { x: e.clientX, y: e.clientY };
        longPressTimer.current = setTimeout(() => {
          onLongPress?.();
        }, 600);
      }}
      onPointerUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onPointerCancel={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (Date.now() - touchStartTime.current < 500) {
          onEdit?.();
        }
      }}
    >
      {/* Top Background */}
      <div className="h-[45%] w-full relative pointer-events-none">
        <img src={bgImage} alt="background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/5 opacity-10" />
        
        {/* Date Badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-white/40 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/30">
          <span className="text-[10px] text-white font-medium tracking-wider drop-shadow-sm">{date}</span>
        </div>
      </div>

      {/* Bottom Content */}
      <div className="flex-1 flex flex-col items-center pt-8 pb-4 px-4 pointer-events-none w-full">
        <h4 className="text-[14px] font-bold text-neutral-800 mb-2">{name}</h4>
        
        {/* Signature Pill */}
        <div className="bg-neutral-50 border border-neutral-100 px-4 py-1.5 rounded-full max-w-full">
          <p className="text-[10px] text-neutral-500 truncate">{signature}</p>
        </div>
      </div>

      {/* Avatar - Centered on the line */}
      <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
            <img src={avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          {/* Wings/Decoration (Optional, based on image) */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-60">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-pink-200">
               <path d="M12 21C12 21 7 18 4 14C1 10 2 6 6 4C10 2 12 6 12 6C12 6 14 2 18 4C22 6 23 10 20 14C17 18 12 21 12 21Z" fill="currentColor" />
             </svg>
          </div>
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-60">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-pink-200">
               <path d="M12 21C12 21 7 18 4 14C1 10 2 6 6 4C10 2 12 6 12 6C12 6 14 2 18 4C22 6 23 10 20 14C17 18 12 21 12 21Z" fill="currentColor" />
             </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
