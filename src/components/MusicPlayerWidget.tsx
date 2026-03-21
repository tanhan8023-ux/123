import React, { useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { ThemeSettings, Song } from '../types';

interface MusicPlayerWidgetProps {
  theme: ThemeSettings;
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onNavigate: () => void;
  onLongPress?: () => void;
}

export function MusicPlayerWidget({
  theme,
  currentSong,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onNavigate,
  onLongPress
}: MusicPlayerWidgetProps) {
  const settings = theme.musicPlayer || {};
  const avatar1 = settings.avatar1 || "https://picsum.photos/seed/avatar1/100/100";
  const avatar2 = settings.avatar2 || "https://picsum.photos/seed/avatar2/100/100";
  const title = settings.title || "想变成你的随身听...";

  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{x: number, y: number}>({x: 0, y: 0});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <button 
      className="w-full h-full bg-white/80 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col justify-between shadow-sm border border-white/50 overflow-hidden relative group cursor-pointer touch-manipulation text-left"
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
          onNavigate();
        }
      }}
    >
      {/* Top Title */}
      <div className="text-center relative z-10 pointer-events-none w-full">
        <span className="text-[11px] text-neutral-400 font-medium tracking-wider">{title}</span>
      </div>

      {/* Main Content: Avatars and Waveform */}
      <div className="flex items-center justify-between px-2 relative z-10 pointer-events-none w-full">
        {/* Avatar 1 */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-neutral-100">
            <img src={avatar1} alt="Avatar 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>

        {/* Waveform and Heart */}
        <div className="flex-1 flex items-center justify-center relative h-14">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-full h-8 opacity-20" viewBox="0 0 100 20" preserveAspectRatio="none">
              <motion.path
                d="M 0 10 Q 5 0 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                className="text-neutral-400"
                animate={{
                  d: isPlaying 
                    ? [
                        "M 0 10 Q 5 0 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10",
                        "M 0 10 Q 5 20 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10",
                        "M 0 10 Q 5 0 10 10 T 20 10 T 30 10 T 40 10 T 50 10 T 60 10 T 70 10 T 80 10 T 90 10 T 100 10"
                      ]
                    : "M 0 10 L 100 10"
                }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              />
            </svg>
          </div>
          <motion.div
            animate={{ scale: isPlaying ? [1, 1.2, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="relative z-10"
          >
            <Heart size={20} className="text-pink-400 fill-pink-400/20" />
          </motion.div>
        </div>

        {/* Avatar 2 */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-neutral-100">
            <img src={avatar2} alt="Avatar 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>

        {/* Playback Controls (Overlay on hover) */}
        <div className="absolute inset-0 flex items-center justify-between px-0 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
          <div 
            onClick={(e) => { e.stopPropagation(); onPrev(); }} 
            className="p-1.5 bg-white/90 rounded-full shadow-md text-neutral-600 hover:text-neutral-900 pointer-events-auto active:scale-90 transition-transform cursor-pointer"
          >
            <SkipBack size={14} />
          </div>
          <div 
            onClick={(e) => { e.stopPropagation(); onPlayPause(); }} 
            className="p-2 bg-white/90 rounded-full shadow-md text-neutral-600 hover:text-neutral-900 pointer-events-auto active:scale-90 transition-transform cursor-pointer"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </div>
          <div 
            onClick={(e) => { e.stopPropagation(); onNext(); }} 
            className="p-1.5 bg-white/90 rounded-full shadow-md text-neutral-600 hover:text-neutral-900 pointer-events-auto active:scale-90 transition-transform cursor-pointer"
          >
            <SkipForward size={14} />
          </div>
        </div>
      </div>

      {/* Progress Bar and Time */}
      <div className="px-1 relative z-10 pointer-events-none w-full">
        <div className="flex justify-between text-[9px] text-neutral-400 mb-1 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-pink-300"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
          />
        </div>
      </div>

      {/* Bottom Song Info */}
      <div className="text-center truncate px-2 relative z-10 pointer-events-none w-full">
        <span className="text-[10px] text-neutral-500 font-medium">
          正在播放: {currentSong ? `${currentSong.title} - ${currentSong.artist}` : '暂无播放'}
        </span>
      </div>
    </button>
  );
}
