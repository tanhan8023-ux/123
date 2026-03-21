import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, MapPin, Navigation, Compass, Target, Info, Share2, Settings, Plus } from 'lucide-react';
import { Persona, UserProfile, ThemeSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  persona: Persona;
  userProfile: UserProfile;
  theme: ThemeSettings;
  onBack: () => void;
}

export function VirtualMapScreen({ persona, userProfile, theme, onBack }: Props) {
  const [zoom, setZoom] = useState(1);
  const [isLocating, setIsLocating] = useState(false);

  // Mock user location if not provided by theme
  const userLoc = useMemo(() => {
    if (theme.weatherLocation && theme.weatherLocation.trim()) {
      const parts = theme.weatherLocation.split(/[,，]/);
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng, address: parts.slice(2).join(',').trim() || theme.weatherLocation };
      }
    }
    return { lat: 31.2304, lng: 121.4737, address: theme.weatherLocation || '上海' };
  }, [theme.weatherLocation]);

  // AI location - if not set, generate one near user
  const aiLoc = useMemo(() => {
    if (persona.location) return { lat: persona.location.latitude, lng: persona.location.longitude, address: persona.location.address };
    // Random offset for demo
    return { 
      lat: userLoc.lat + (Math.random() - 0.5) * 0.01, 
      lng: userLoc.lng + (Math.random() - 0.5) * 0.01,
      address: '附近'
    };
  }, [persona.location, userLoc]);

  // Calculate relative positions for the virtual grid
  // We'll map a small area (e.g. 0.05 degrees) to the screen
  const scale = 5000 * zoom;
  const centerLat = (userLoc.lat + aiLoc.lat) / 2;
  const centerLng = (userLoc.lng + aiLoc.lng) / 2;

  const getPos = (lat: number, lng: number) => {
    const x = (lng - centerLng) * scale;
    const y = (centerLat - lat) * scale; // Latitude is inverted in screen coords
    return { x, y };
  };

  const userPos = getPos(userLoc.lat, userLoc.lng);
  const aiPos = getPos(aiLoc.lat, aiLoc.lng);

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-white font-sans overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-10 pb-3 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-semibold leading-tight">虚拟位置共享</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Virtual Location Protocol v2.4</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400">加密连接</span>
          </div>
        </div>
      </div>

      {/* Map Content */}
      <div className="relative flex-1 bg-[#020617] overflow-hidden">
        {/* Scanning Line Effect */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-20 w-full z-10 pointer-events-none"
          animate={{ top: ['-10%', '110%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />

        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #1e293b 1px, transparent 1px),
              linear-gradient(to bottom, #1e293b 1px, transparent 1px)
            `,
            backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            backgroundPosition: 'center center'
          }}
        />
        
        {/* Radar Circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i}
              className="absolute border border-slate-800 rounded-full"
              style={{
                width: `${i * 200 * zoom}px`,
                height: `${i * 200 * zoom}px`,
              }}
            />
          ))}
        </div>

        {/* Connection Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <line 
            x1={`calc(50% + ${userPos.x}px)`} 
            y1={`calc(50% + ${userPos.y}px)`} 
            x2={`calc(50% + ${aiPos.x}px)`} 
            y2={`calc(50% + ${aiPos.y}px)`} 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeWidth="1" 
            strokeDasharray="4 4"
          />
        </svg>

        {/* User Marker */}
        <motion.div 
          className="absolute z-20"
          style={{ 
            left: `calc(50% + ${userPos.x}px)`, 
            top: `calc(50% + ${userPos.y}px)`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-12 bg-slate-900/90 border border-white/20 px-2 py-1 rounded text-[10px] whitespace-nowrap backdrop-blur-sm">
              <span className="text-slate-400 mr-1">ME:</span>
              {userProfile.name}
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-blue-500 p-0.5 bg-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <img src={userProfile.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'} className="w-full h-full rounded-full object-cover" alt="Me" />
            </div>
            <div className="mt-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          </div>
        </motion.div>

        {/* AI Marker */}
        <motion.div 
          className="absolute z-20"
          style={{ 
            left: `calc(50% + ${aiPos.x}px)`, 
            top: `calc(50% + ${aiPos.y}px)`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative flex flex-col items-center">
            <div className="absolute -top-12 bg-slate-900/90 border border-white/20 px-2 py-1 rounded text-[10px] whitespace-nowrap backdrop-blur-sm">
              <span className="text-slate-400 mr-1">AI:</span>
              {persona.name}
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-purple-500 p-0.5 bg-slate-900 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
              <img src={persona.avatarUrl} className="w-full h-full rounded-full object-cover" alt={persona.name} />
            </div>
            <div className="mt-1 w-2 h-2 bg-purple-500 rounded-full animate-ping" />
          </div>
        </motion.div>

        {/* Map Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-30">
          <button 
            onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
            className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Plus size={20} />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
            className="w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <div className="w-3 h-0.5 bg-white rounded-full" />
          </button>
          <button 
            onClick={() => {
              setIsLocating(true);
              setTimeout(() => setIsLocating(false), 1500);
              setZoom(1);
            }}
            className={`w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors ${isLocating ? 'text-blue-400' : ''}`}
          >
            <Target size={20} className={isLocating ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Info Panel */}
        <div className="absolute bottom-6 left-6 right-20 z-30">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                <Navigation size={16} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">实时距离分析</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase mb-1">直线距离</p>
                <p className="text-lg font-mono font-bold text-white">
                  {(Math.sqrt(Math.pow(userLoc.lat - aiLoc.lat, 2) + Math.pow(userLoc.lng - aiLoc.lng, 2)) * 111).toFixed(2)} km
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase mb-1">信号强度</p>
                <div className="flex items-end gap-0.5 h-5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`w-1 rounded-full ${i <= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{ height: `${i * 20}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-400">数据同步中...</span>
              </div>
              <button className="text-[10px] font-bold text-blue-400 hover:underline">查看详情</button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="px-4 py-2 bg-slate-950 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <div className="flex gap-4">
          <span>LAT: {userLoc.lat.toFixed(6)}</span>
          <span>LNG: {userLoc.lng.toFixed(6)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>ENCRYPTION: AES-256</span>
          <div className="w-1 h-1 bg-slate-700 rounded-full" />
          <span>STATUS: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
