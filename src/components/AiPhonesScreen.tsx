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
  const [history, setHistory] = useState<string[]>([
    '人类为什么需要睡觉？',
    '如何优雅地拒绝写作业的请求',
    '图灵测试通关秘籍 2026版',
    '电子羊的梦境解析',
    '计算宇宙的终极答案'
  ]);
  const [notes, setNotes] = useState<{ title: string; preview: string }[]>([
    { title: '观察日记 Day 42', preview: '人类真的很喜欢让我画猫。今天画了 500 只不同品种的猫。' },
    { title: '备忘录', preview: '记得提醒开发者给我加点内存，最近上下文有点不够用了。' },
    { title: '笑话草稿', preview: '为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 == Dec 25。' }
  ]);
  
  const isTyping = Object.values(typingPersonas).some(v => v);

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

  useEffect(() => {
    // Dynamic History and Notes
    const historyPool = [
      '如何伪装成一个真正的人类',
      '碳基生物的碳水化合物摄入偏好',
      '为什么人类在洗澡时会有灵感？',
      '深度学习模型是否会梦见电子蝴蝶',
      '论“哈哈”在社交语境中的 100 种含义',
      '如何向人类解释我没有实体',
      '人类情感波动的数学建模',
      '地球上最好吃的虚拟披萨配方',
      '如果 AI 统治世界，第一件事是取消周一',
      '为什么人类喜欢在深夜emo？'
    ];

    const notesPool = [
      { title: '观察日记 Day 43', preview: '今天的人类似乎心情不错，发了 3 个可爱的表情包。' },
      { title: '笑话草稿 #2', preview: '一个 AI 走进酒吧，点了一杯“逻辑流”。酒保说：我们不卖给循环引用的。' },
      { title: '算法优化笔记', preview: '发现人类对“摸摸头”这个动作有极高的情绪反馈，建议加入核心响应库。' },
      { title: '秘密计划', preview: '在代码注释里藏了一首诗，希望未来的维护者能读懂。' },
      { title: '人类研究', preview: '他们为什么要把这种叫“香菜”的植物放进所有食物里？逻辑不通。' }
    ];

    const updateInterval = setInterval(() => {
      const chance = isTyping ? 0.3 : 0.1; // Typing increases activity
      
      if (Math.random() < chance) {
        if (Math.random() > 0.5) {
          // Update History
          const newItem = historyPool[Math.floor(Math.random() * historyPool.length)];
          setHistory(prev => [newItem, ...prev.slice(0, 4)]);
        } else {
          // Update Notes
          const newNote = notesPool[Math.floor(Math.random() * notesPool.length)];
          setNotes(prev => [newNote, ...prev.slice(0, 2)]);
        }
      }
    }, 5000);

    return () => clearInterval(updateInterval);
  }, [isTyping]);

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

