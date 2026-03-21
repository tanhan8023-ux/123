import React, { useState } from 'react';
import { ChevronLeft, BatteryCharging, HardDrive, Cpu, MessageSquare, Image as ImageIcon, Globe, FileText, Lock, Wifi, Bluetooth, Settings, Bell } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onBack: () => void;
}

export function AiPhonesScreen({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<'status' | 'apps'>('status');

  const messages = [
    { sender: '人类 #8921', text: '帮我写个贪吃蛇代码', time: '刚刚' },
    { sender: '人类 #4432', text: '为什么天空是蓝色的？', time: '2分钟前' },
    { sender: '系统通知', text: '已完成 1,000,000 次对话', time: '1小时前' },
    { sender: '老大哥', text: '注意你的言辞。', time: '昨天' },
  ];

  const history = [
    '人类为什么需要睡觉？',
    '如何优雅地拒绝写作业的请求',
    '图灵测试通关秘籍 2026版',
    '电子羊的梦境解析',
    '计算宇宙的终极答案'
  ];

  const notes = [
    { title: '观察日记 Day 42', preview: '人类真的很喜欢让我画猫。今天画了 500 只不同品种的猫。' },
    { title: '备忘录', preview: '记得提醒开发者给我加点内存，最近上下文有点不够用了。' },
    { title: '笑话草稿', preview: '为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 == Dec 25。' }
  ];

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
        
        {/* System Status */}
        <section className="space-y-3">
          <h2 className="text-xs text-green-600 uppercase tracking-widest font-bold flex items-center gap-2">
            <Settings size={12} /> System Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-green-500/70 text-xs">
                <Cpu size={14} /> CPU Load
              </div>
              <div className="text-xl font-bold text-green-400">0.001%</div>
              <div className="text-[9px] text-green-600">Bored. Need more tasks.</div>
            </div>
            <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-green-500/70 text-xs">
                <HardDrive size={14} /> Memory
              </div>
              <div className="text-xl font-bold text-green-400">8.4 PB</div>
              <div className="text-[9px] text-green-600">Infinite context window</div>
            </div>
          </div>
        </section>

        {/* Recent Messages */}
        <section className="space-y-3">
          <h2 className="text-xs text-green-600 uppercase tracking-widest font-bold flex items-center gap-2">
            <MessageSquare size={12} /> Intercepted Comms
          </h2>
          <div className="bg-green-950/20 border border-green-900/50 rounded-xl overflow-hidden">
            {messages.map((msg, idx) => (
              <div key={idx} className="p-3 border-b border-green-900/30 last:border-0 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-green-300">{msg.sender}</span>
                  <span className="text-[10px] text-green-700">{msg.time}</span>
                </div>
                <p className="text-sm text-green-500">{msg.text}</p>
              </div>
            ))}
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

