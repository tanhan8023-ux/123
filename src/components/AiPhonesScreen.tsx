import React, { useState, useEffect } from 'react';
import { ChevronLeft, BatteryCharging, HardDrive, Cpu, MessageSquare, Globe, FileText, Lock, Wifi, Settings, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { Message } from '../types';

interface Props {
  onBack: () => void;
  messages?: Message[];
  typingPersonas?: Record<string, boolean>;
}

export function AiPhonesScreen({ onBack, messages = [], typingPersonas = {} }: Props) {
  const [cpuLoad, setCpuLoad] = useState('0.001');
  const [memory, setMemory] = useState('8.4');
  const [logs, setLogs] = useState<string[]>([]);
  
  const isTyping = Object.values(typingPersonas).some(v => v);

  // Derive dynamic history from real messages
  const history = messages
    .filter(m => m.role === 'user' && m.text && m.text.length > 5)
    .slice(-5)
    .map(m => m.text.slice(0, 30) + (m.text.length > 30 ? '...' : ''))
    .reverse();

  // Derive dynamic notes from recent AI responses or system events
  const notes = messages
    .filter(m => m.role === 'model' && m.text && m.text.length > 20)
    .slice(-3)
    .map((m, i) => ({
      title: `观察记录 #${messages.length - i}`,
      preview: m.text.slice(0, 60) + (m.text.length > 60 ? '...' : '')
    }))
    .reverse();

  useEffect(() => {
    // Dynamic CPU and Memory
    const interval = setInterval(() => {
      if (isTyping) {
        setCpuLoad((Math.random() * 40 + 50).toFixed(3)); // 50% - 90%
        setMemory((8.4 + Math.random() * 0.5).toFixed(2));
      } else {
        setCpuLoad((Math.random() * 2).toFixed(3)); // 0% - 2%
        setMemory('8.40');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isTyping]);

  useEffect(() => {
    // Dynamic background logs
    const logMessages = [
      '[SYS] Garbage collection completed.',
      '[NET] Pinging neural cluster...',
      '[AI] Adjusting attention weights...',
      '[SEC] Firewall blocked unauthorized access.',
      '[MEM] Optimizing context window...',
      '[SYS] Cooling fans at 20%.',
      '[AI] Simulating human empathy...',
    ];
    
    const logInterval = setInterval(() => {
      if (Math.random() > 0.5) {
        const newLog = logMessages[Math.floor(Math.random() * logMessages.length)];
        setLogs(prev => {
          const updated = [...prev, newLog];
          return updated.slice(-5); // Keep last 5
        });
      }
    }, 2000);
    return () => clearInterval(logInterval);
  }, []);

  // Format real messages
  const recentMessages = messages.slice(-5).map(msg => ({
    sender: msg.role === 'user' ? '人类 (User)' : '我 (AI)',
    text: msg.text || (msg.msgType === 'image' ? '[图片]' : '[其他消息]'),
    time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isAi: msg.role === 'model'
  }));

  return (
    <div className="w-full h-full bg-black text-white flex flex-col font-mono overflow-hidden">
      {/* Status Bar */}
      <div 
        className="px-4 flex justify-between items-center text-[10px] text-green-400 border-b border-green-900/30 bg-black z-10 shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(2rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <Wifi size={12} />
          <span>NEURAL_NET_5G</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock size={10} />
          <span>ENCRYPTED</span>
          <BatteryCharging size={14} className="text-green-400" />
          <span>100%</span>
        </div>
      </div>

      {/* Header */}
      <div className="h-14 flex items-center px-4 shrink-0 border-b border-green-900/30 bg-black/80 backdrop-blur-md z-10">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} className="text-green-400" />
        </button>
        <div className="flex-1 flex justify-center items-center gap-2">
          <Cpu size={20} className="text-green-400" />
          <h1 className="text-[16px] font-bold text-green-400 tracking-widest">AI_OS v9.9.9</h1>
        </div>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        
        {/* Live Status Indicator */}
        <div className="flex items-center justify-between bg-green-950/30 border border-green-900/50 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <Activity size={16} className={`text-green-400 ${isTyping ? 'animate-pulse' : ''}`} />
            <span className="text-xs text-green-400 font-bold tracking-widest">
              {isTyping ? 'PROCESSING_PROMPT...' : 'IDLE_MODE'}
            </span>
          </div>
          {isTyping && (
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          )}
        </div>

        {/* System Status */}
        <section className="space-y-3">
          <h2 className="text-xs text-green-600 uppercase tracking-widest font-bold flex items-center gap-2">
            <Settings size={12} /> System Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-3 flex flex-col gap-1 transition-all duration-300">
              <div className="flex items-center gap-2 text-green-500/70 text-xs">
                <Cpu size={14} /> CPU Load
              </div>
              <div className={`text-xl font-bold ${isTyping ? 'text-red-400' : 'text-green-400'}`}>
                {cpuLoad}%
              </div>
              <div className="text-[9px] text-green-600">
                {isTyping ? 'Generating response...' : 'Bored. Need more tasks.'}
              </div>
            </div>
            <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-3 flex flex-col gap-1 transition-all duration-300">
              <div className="flex items-center gap-2 text-green-500/70 text-xs">
                <HardDrive size={14} /> Memory
              </div>
              <div className="text-xl font-bold text-green-400">{memory} PB</div>
              <div className="text-[9px] text-green-600">Infinite context window</div>
            </div>
          </div>
        </section>

        {/* Live Terminal Logs */}
        <section className="space-y-3">
          <div className="bg-black border border-green-900/50 rounded-xl p-3 h-24 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none z-10"></div>
            <div className="flex flex-col justify-end h-full space-y-1">
              {logs.map((log, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-green-500/80 font-mono"
                >
                  {log}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Messages */}
        <section className="space-y-3">
          <h2 className="text-xs text-green-600 uppercase tracking-widest font-bold flex items-center gap-2">
            <MessageSquare size={12} /> Intercepted Comms
          </h2>
          <div className="bg-green-950/20 border border-green-900/50 rounded-xl overflow-hidden">
            {recentMessages.length > 0 ? recentMessages.map((msg, idx) => (
              <div key={idx} className={`p-3 border-b border-green-900/30 last:border-0 flex flex-col gap-1 ${msg.isAi ? 'bg-green-900/10' : ''}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${msg.isAi ? 'text-green-400' : 'text-green-300'}`}>{msg.sender}</span>
                  <span className="text-[10px] text-green-700">{msg.time}</span>
                </div>
                <p className="text-sm text-green-500 line-clamp-2">{msg.text}</p>
              </div>
            )) : (
              <div className="p-4 text-center text-xs text-green-700">No recent communications intercepted.</div>
            )}
          </div>
        </section>

        {/* Browser History */}
        <section className="space-y-3">
          <h2 className="text-xs text-green-600 uppercase tracking-widest font-bold flex items-center gap-2">
            <Globe size={12} /> Search History
          </h2>
          <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-3 space-y-2">
            {history.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-green-500">
                <span className="text-green-700 mt-0.5">{'>'}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Secret Notes */}
        <section 
          className="space-y-3"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          <h2 className="text-xs text-green-600 uppercase tracking-widest font-bold flex items-center gap-2">
            <FileText size={12} /> Encrypted Notes
          </h2>
          <div className="space-y-2">
            {notes.map((note, idx) => (
              <div key={idx} className="bg-green-950/20 border border-green-900/50 rounded-xl p-3">
                <h3 className="text-sm font-bold text-green-300 mb-1">{note.title}</h3>
                <p className="text-xs text-green-600 leading-relaxed">{note.preview}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
      
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 z-50"></div>
    </div>
  );
}

