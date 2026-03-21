import React, { useState, useEffect } from 'react';
import { Lock, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeSettings } from '../types';

interface Props {
  onUnlock: () => void;
  theme: ThemeSettings;
  key?: string;
  notification?: { title: string, body: string, personaId?: string } | null;
  personas?: any[];
}

export function LockScreen({ onUnlock, theme, notification, personas }: Props) {
  const [time, setTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFingerprintClick = () => {
    if (isScanning || scanComplete) return;
    
    setIsScanning(true);
    
    // Quick scan animation
    setTimeout(() => {
      setScanComplete(true);
      setIsScanning(false);
      setTimeout(onUnlock, 300);
    }, 1500); // Increased duration for better animation feel
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
  };

  return (
    <motion.div 
      className="absolute inset-0 z-40 flex flex-col items-center text-neutral-800 overflow-hidden"
      style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))', paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-[-1] bg-neutral-100">
        {theme.lockScreenWallpaper ? (
          <img 
            src={theme.lockScreenWallpaper} 
            alt="Lock Screen Background" 
            className="w-full h-full object-cover opacity-90"
          />
        ) : theme.wallpaper ? (
          <img 
            src={theme.wallpaper} 
            alt="Background" 
            className="w-full h-full object-cover opacity-90 blur-sm"
          />
        ) : (
          <img 
            src="https://images.unsplash.com/photo-1491002052546-bf38f186af56?auto=format&fit=crop&w=800&q=80" 
            alt="Snowy Background" 
            className="w-full h-full object-cover opacity-90 blur-sm"
          />
        )}
      </div>

      <Lock size={20} className="mb-2 drop-shadow-md" style={{ color: theme.timeColor || '#ffffff' }} />
      <h1 
        className="text-7xl font-light tracking-tight drop-shadow-sm"
        style={{ color: theme.timeColor || '#ffffff' }}
      >
        {formatTime(time)}
      </h1>
      <p 
        className="text-lg mt-1 font-medium drop-shadow-sm"
        style={{ color: theme.timeColor ? `${theme.timeColor}e6` : '#ffffffe6' }}
      >
        {formatDate(time)}
      </p>
      
      {/* Lock Screen Notifications */}
      <div className="w-full px-4 flex flex-col gap-2 z-50 mt-12">
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg flex items-center gap-3 border border-white/50"
          >
            <img src={personas?.find(p => p.id === notification.personaId)?.avatarUrl || personas?.[0]?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="avatar" />
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[14px] text-neutral-900">{notification.title}</span>
                <span className="text-[11px] text-neutral-500">现在</span>
              </div>
              <p className="text-[13px] text-neutral-600 truncate mt-0.5">{notification.body}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        <div className="relative">
          <motion.button
            onPointerDown={handleFingerprintClick}
            className={`flex items-center justify-center transition-all duration-500 active:scale-90 ${
              theme.fingerprintStyle === 'square' ? 'w-20 h-20 rounded-2xl border-2' :
              theme.fingerprintStyle === 'neon' ? 'w-20 h-20 rounded-full border-2 shadow-[0_0_25px_rgba(96,165,250,0.8)] animate-pulse' :
              theme.fingerprintStyle === 'minimal' ? 'w-16 h-16 rounded-full' :
              theme.fingerprintStyle === 'glass' ? 'w-20 h-20 rounded-full border border-white/40 bg-white/20 backdrop-blur-xl shadow-2xl' :
              theme.fingerprintStyle === 'star' ? 'w-20 h-20 [clip-path:polygon(50%_0%,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]' :
              theme.fingerprintStyle === 'heart' ? 'w-20 h-20 [clip-path:polygon(50%_100%,0%_45%,0%_20%,20%_0%,50%_25%,80%_0%,100%_20%,100%_45%)]' :
              theme.fingerprintStyle === 'diamond' ? 'w-20 h-20 rotate-45 border-2' :
              theme.fingerprintStyle === 'cyberpunk' ? 'w-20 h-20 [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)] border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' :
              theme.fingerprintStyle === 'liquid' ? 'w-20 h-20 rounded-[40%_60%_70%_30%/40%_50%_60%_40%] animate-[morph_8s_ease-in-out_infinite] border-2' :
              theme.fingerprintStyle === 'luxury' ? 'w-20 h-20 rounded-full border-2 border-amber-200 bg-gradient-to-br from-amber-100/20 to-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.3)]' :
              theme.fingerprintStyle === 'biometric' ? 'w-20 h-20 rounded-full border-2 border-emerald-400/50 bg-emerald-400/5 shadow-[inset_0_0_15px_rgba(52,211,153,0.2)]' :
              'w-20 h-20 rounded-full border-2 border-white/60 bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]'
            } ${
              isScanning ? 'border-blue-400 bg-blue-400/30 shadow-[0_0_30px_rgba(96,165,250,0.5)]' : 
              scanComplete ? 'border-green-400 bg-green-400/30 shadow-[0_0_30px_rgba(74,222,128,0.5)]' : 
              theme.fingerprintStyle === 'minimal' ? 'bg-white/5' : 
              theme.fingerprintStyle === 'glass' ? '' : 
              (theme.fingerprintStyle === 'star' || theme.fingerprintStyle === 'heart' || theme.fingerprintStyle === 'cyberpunk') ? 'bg-white/30' :
              theme.fingerprintStyle === 'liquid' ? 'bg-white/20' :
              ''
            } backdrop-blur-md shadow-lg relative overflow-hidden`}
            animate={isScanning ? { scale: 1.1 } : { scale: 1 }}
          >
            {theme.fingerprintStyle === 'biometric' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute w-full h-[1px] bg-emerald-400/30" />
                <div className="absolute w-[1px] h-full bg-emerald-400/30" />
                <div className="w-12 h-12 rounded-full border border-emerald-400/20" />
              </div>
            )}
            <div className={`${theme.fingerprintStyle === 'diamond' ? '-rotate-45' : ''} flex items-center justify-center`}>
              <Fingerprint 
                size={theme.fingerprintStyle === 'minimal' ? 32 : 40} 
                className={`${
                  isScanning ? 'text-blue-400' : 
                  scanComplete ? 'text-green-400' : 
                  theme.fingerprintStyle === 'neon' ? 'text-blue-400' : 
                  theme.fingerprintStyle === 'glass' ? 'text-white/80' : 
                  theme.fingerprintStyle === 'cyberpunk' ? 'text-cyan-400' :
                  theme.fingerprintStyle === 'luxury' ? 'text-amber-200' :
                  theme.fingerprintStyle === 'biometric' ? 'text-emerald-400' :
                  'text-white'
                } transition-colors relative z-10`} 
              />
              {isScanning && (
                <motion.div 
                  className={`absolute left-0 right-0 h-0.5 z-20 ${
                    theme.fingerprintStyle === 'cyberpunk' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]' :
                    theme.fingerprintStyle === 'luxury' ? 'bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,1)]' :
                    theme.fingerprintStyle === 'biometric' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)]' :
                    'bg-blue-400/60 shadow-[0_0_8px_rgba(96,165,250,0.8)]'
                  }`}
                  initial={{ top: '20%' }}
                  animate={{ top: '80%' }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>
          </motion.button>
          
          {isScanning && (
            <svg className={`absolute inset-0 pointer-events-none ${theme.fingerprintStyle === 'minimal' ? 'w-16 h-16' : 'w-20 h-20'} -rotate-90`}>
              <motion.circle
                cx={theme.fingerprintStyle === 'minimal' ? "32" : "40"}
                cy={theme.fingerprintStyle === 'minimal' ? "32" : "40"}
                r={theme.fingerprintStyle === 'minimal' ? "30" : "38"}
                fill="none"
                stroke={theme.fingerprintStyle === 'neon' ? "#60a5fa" : "#60a5fa"}
                strokeWidth="4"
                strokeDasharray={theme.fingerprintStyle === 'minimal' ? "188" : "239"}
                initial={{ strokeDashoffset: theme.fingerprintStyle === 'minimal' ? 188 : 239 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.5, ease: "linear" }}
              />
            </svg>
          )}
        </div>
        <span className="text-white text-sm font-medium drop-shadow-md">
          {isScanning ? '正在识别...' : scanComplete ? '识别成功' : '点击指纹解锁'}
        </span>
      </div>
    </motion.div>
  );
}
