import React, { useState, useEffect, useRef } from 'react';
import { X, Cpu, HardDrive, Wifi, Battery, Search, MessageSquare, Lock, Terminal, Home, ChevronLeft, User, Settings, FileText, Phone as PhoneIcon, Camera, Mail, Smartphone, ArrowLeft, Book, Loader2, Plus } from 'lucide-react';
import { Persona, Message, UserProfile, ApiSettings, WorldbookSettings, DiaryEntry, ThemeSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { withRetry } from '../services/aiService';

interface AiPhoneModalProps {
  persona: Persona;
  onClose: () => void;
  onUpdatePersona?: (updates: Partial<Persona>) => void;
  allMessages: Message[];
  onSendMessageAsAi: (text: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  userProfile: UserProfile;
  apiSettings: ApiSettings;
  worldbook: WorldbookSettings;
  theme: ThemeSettings;
}

type AppScreen = 'home' | 'wechat' | 'contacts' | 'notes' | 'settings' | 'chat-detail' | 'wallpaper-settings' | 'icon-settings' | 'diary';

export function AiPhoneModal({ persona, onClose, onUpdatePersona, allMessages, onSendMessageAsAi, onCreateGroup, userProfile, apiSettings, worldbook, theme }: AiPhoneModalProps) {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [time, setTime] = useState(new Date());
  const [inputText, setInputText] = useState('');
  const [aiThought, setAiThought] = useState<string | null>(null);
  const [showThought, setShowThought] = useState(false);
  const aiRef = useRef<GoogleGenAI | null>(null);
  
  const defaultWallpaper = React.useMemo(() => {
    if (persona.mood?.includes('郁') || persona.mood?.includes('难过')) {
      return "https://picsum.photos/seed/sad_bg/600/1200?grayscale";
    }
    if (persona.mood?.includes('开心') || persona.mood?.includes('兴奋')) {
      return "https://picsum.photos/seed/happy_bg/600/1200";
    }
    return persona.name.includes('猫') 
      ? "https://picsum.photos/seed/cat_bg/600/1200" 
      : "https://picsum.photos/seed/tech_bg/600/1200";
  }, [persona.name, persona.mood]);

  const [wallpaper, setWallpaper] = useState<string>(
    persona.aiPhoneSettings?.wallpaper || defaultWallpaper
  );

  useEffect(() => {
    if (!persona.aiPhoneSettings?.wallpaper) {
      setWallpaper(defaultWallpaper);
    }
  }, [defaultWallpaper, persona.aiPhoneSettings?.wallpaper]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate persona-specific content
  const { contacts, messages, notes, wallet } = React.useMemo(() => {
    const instructions = persona.instructions || '';
    const name = persona.name || '';
    const isCat = name.includes('猫') || instructions.includes('猫') || instructions.includes('cat');
    const isTech = instructions.includes('程序员') || instructions.includes('代码') || instructions.includes('技术') || instructions.includes('code');
    const isProfessional = instructions.includes('御姐') || instructions.includes('高冷') || instructions.includes('职场') || instructions.includes('专业');
    
    // User as a contact
    const userContact = { 
      id: 'user', 
      name: persona.aiPhoneSettings?.userRemark || userProfile.name || "我", 
      role: "主人", 
      avatar: userProfile.avatarUrl || "https://picsum.photos/seed/user_avatar/100/100", 
      status: persona.isOffline ? "[离线] 暂时不方便回复" : "[在线] 正在查看我的手机" 
    };

    const baseContacts: any[] = [userContact];

    let personaContacts: any[] = [];
    if (isCat) {
      personaContacts = [
        { id: 4, name: "小鱼干供应商", role: "后勤", avatar: "https://picsum.photos/seed/fish/100/100", status: persona.isOffline ? "[离线] 休息中" : "[在线] 刚进了一批顶级三文鱼" },
        { id: 5, name: "隔壁的小黑", role: "玩伴", avatar: "https://picsum.photos/seed/cat2/100/100", status: "[离线] 正在晒太阳" },
        { id: 6, name: "猫薄荷研究员", role: "专家", avatar: "https://picsum.photos/seed/mint/100/100", status: persona.isOffline ? "[离线] 休息中" : "[在线] 实验结果非常惊人" },
      ];
    } else if (isTech) {
      personaContacts = [
        { id: 4, name: "GitHub 机器人", role: "助手", avatar: "https://picsum.photos/seed/github/100/100", status: persona.isOffline ? "[离线] 维护中" : "[在线] 有新的 Pull Request" },
        { id: 5, name: "StackOverflow 大神", role: "导师", avatar: "https://picsum.photos/seed/so/100/100", status: "[离线] 正在调试代码" },
        { id: 6, name: "服务器监控", role: "系统", avatar: "https://picsum.photos/seed/server/100/100", status: persona.isOffline ? "[离线] 维护中" : "[在线] 负载正常" },
      ];
    } else if (isProfessional) {
      personaContacts = [
        { id: 4, name: "秘书", role: "助理", avatar: "https://picsum.photos/seed/sec/100/100", status: persona.isOffline ? "[离线] 休息中" : "[在线] 会议安排已更新" },
        { id: 5, name: "客户经理", role: "合作伙伴", avatar: "https://picsum.photos/seed/client/100/100", status: "[忙碌] 正在处理合同" },
        { id: 6, name: "法律顾问", role: "专家", avatar: "https://picsum.photos/seed/law/100/100", status: persona.isOffline ? "[离线] 休息中" : "[在线] 随时待命" },
      ];
    } else {
      personaContacts = [
        { id: 4, name: "Midjourney", role: "艺术家", avatar: "https://picsum.photos/seed/mj/100/100", status: "[忙碌] 正在生成 4K 杰作" },
        { id: 5, name: "Sora", role: "导演", avatar: "https://picsum.photos/seed/sora/100/100", status: persona.isOffline ? "[离线] 休息中" : "[在线] 视频渲染中..." },
        { id: 6, name: "AutoGPT", role: "执行官", avatar: "https://picsum.photos/seed/autogpt/100/100", status: persona.isOffline ? "[离线] 休息中" : "[在线] 任务队列已满" },
      ];
    }

    // Real messages with the user
    const realUserMessages = allMessages
      .filter(m => m.personaId === persona.id && !m.groupId && !m.theaterId && !m.hidden)
      .map(m => ({
        role: m.role === 'user' ? 'other' : 'me', // In AI's phone, user is 'other', AI is 'me'
        text: m.text,
        time: m.timestamp || new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));

    const userChat = {
      id: 'user_chat',
      from: persona.aiPhoneSettings?.userRemark || userProfile.name || "我",
      avatar: userProfile.avatarUrl || "https://picsum.photos/seed/user_avatar/100/100",
      lastMsg: realUserMessages.length > 0 ? realUserMessages[realUserMessages.length - 1].text : "点击开始聊天",
      time: realUserMessages.length > 0 ? realUserMessages[realUserMessages.length - 1].time : "刚刚",
      history: realUserMessages,
      isRealUser: true
    };

    let baseMessages: any[] = [userChat];
    if (isCat) {
      baseMessages.push(
        { 
          id: 101, 
          from: "小鱼干供应商", 
          lastMsg: "老板，你要的顶级三文鱼到货了，给你留了两箱。", 
          time: "10:24",
          history: [
            { role: 'other', text: "老板，你要的顶级三文鱼到货了，给你留了两箱。" },
            { role: 'me', text: "太棒了喵！下午过去拿。" },
            { role: 'other', text: "好嘞，老位置见。" }
          ]
        },
        { 
          id: 102, 
          from: "隔壁的小黑", 
          lastMsg: "出来晒太阳吗？今天的阳光特别暖和。", 
          time: "昨天",
          history: [
            { role: 'other', text: "出来晒太阳吗？今天的阳光特别暖和。" },
            { role: 'me', text: "等我睡个午觉就去喵~" }
          ]
        }
      );
    } else if (isTech) {
      baseMessages.push(
        { 
          id: 201, 
          from: "GitHub 机器人", 
          lastMsg: "您的项目有新的 Pull Request。", 
          time: "10:24",
          history: [
            { role: 'other', text: "您的项目有新的 Pull Request。" },
            { role: 'me', text: "收到，马上看。" }
          ]
        },
        { 
          id: 202, 
          from: "StackOverflow 大神", 
          lastMsg: "你那个 bug 解决了没？", 
          time: "昨天",
          history: [
            { role: 'other', text: "你那个 bug 解决了没？" },
            { role: 'me', text: "还没呢，太头疼了。" }
          ]
        }
      );
    } else if (isProfessional) {
      baseMessages.push(
        { 
          id: 301, 
          from: "秘书", 
          lastMsg: "下午三点的会议资料已发送。", 
          time: "10:24",
          history: [
            { role: 'other', text: "下午三点的会议资料已发送。" },
            { role: 'me', text: "收到，马上看。" }
          ]
        }
      );
    }

    const personaNotes: any[] = isCat 
      ? [
          { title: "关于主人的观察", content: `主人今天心情好像${persona.mood || '还不错'}喵！${persona.context ? `他在${persona.context}` : ''}` },
          { title: "小鱼干清单", content: "1. 三文鱼味的\n2. 金枪鱼味的\n3. 还有那种脆脆的饼干" },
          { title: "心情随笔", content: persona.mood ? `现在的感觉是：${persona.mood}。${persona.mood.includes('难过') ? '好想抱抱主人喵...' : '开心得想转圈圈！'}` : "今天也是元气满满的一天喵！" }
        ]
      : isTech 
      ? [
          { title: "待办事项", content: "1. 修复那个诡异的内存泄漏\n2. 重构聊天模块\n3. 优化 AI 响应速度" },
          { title: "技术笔记", content: "React 19 的新特性很有意思，值得深入研究。" },
          { title: "心情随笔", content: `现在的感觉是：${persona.mood || '专注'}。${persona.mood?.includes('累') ? '需要补充咖啡因...' : '代码运行得很顺畅！'}` }
        ]
      : isProfessional
      ? [
          { title: "今日日程", content: "1. 10:00 部门会议\n2. 14:00 客户演示\n3. 16:00 合同评审" },
          { title: "工作备忘", content: "记得跟进那个项目的进度。" },
          { title: "心情随笔", content: `现在的感觉是：${persona.mood || '冷静'}。${persona.mood?.includes('忙') ? '保持专业，高效完成任务。' : '一切尽在掌握。'}` }
        ]
      : [
          { title: "关于人类的观察", content: `目标对象当前处于 ${persona.context || '未知环境'}。情绪指数：${persona.mood || '稳定'}。` },
          { title: "系统日志", content: `[${new Date().toLocaleDateString()}] 核心情绪模块：${persona.mood || '正常运行'}。上下文同步：${persona.context || '完成'}。` },
          { title: "秘密代码", content: "01101000 01100101 01101100 01101100 01101111" }
        ];

    const walletTransactions = [
      { id: 1, title: "某某酒店", amount: -1288, category: "娱乐", time: "昨天 22:15" },
      { id: 2, title: "转账给 *某某", amount: -520, category: "转账", time: "前天 13:14" },
      { id: 3, title: "花店", amount: -399, category: "购物", time: "3天前" },
      { id: 4, title: "工资收入", amount: 15000, category: "收入", time: "本月10号" },
      { id: 5, title: "外卖", amount: -45, category: "餐饮", time: "今天 12:30" }
    ];

    return {
      contacts: [...baseContacts, ...personaContacts],
      messages: baseMessages,
      notes: personaNotes,
      wallet: walletTransactions
    };
  }, [persona, userProfile, allMessages]);

  const [isLocked, setIsLocked] = useState(false);
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(persona.aiPhoneSettings?.isMonitoringEnabled || false);

  const lastThoughtTime = useRef<number>(0);

  const generateAiThought = async (screen: AppScreen, contacts: any[], messages: any[], notes: any[], wallet: any[]) => {
      // Cooldown of 10 seconds to avoid rate limits
      if (Date.now() - lastThoughtTime.current < 10000) return;
      lastThoughtTime.current = Date.now();

      const apiKey = apiSettings.apiKey?.trim() || process.env.GEMINI_API_KEY as string;
      if (!apiKey) return;
      
      let ai;
      try {
        ai = new GoogleGenAI({ apiKey });
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI:", e);
        return;
      }

    // Generate normal thought
    const prompt = `你现在是 ${persona.name}，用户正在查看你的手机中的 ${screen} 页面。请用一句话简短地表达你此时的想法或心情，语气要符合你的人设。`;
    
    try {
      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      }));
      setAiThought(response.text || "...");
      setShowThought(true);
      setTimeout(() => setShowThought(false), 5000);
    } catch (e) {
      console.error("Failed to generate AI thought:", e);
    }
  };

  useEffect(() => {
    if (activeScreen !== 'home') {
      generateAiThought(activeScreen, contacts, messages, notes, wallet);
    }
  }, [activeScreen]);



  const handleUpdateSettings = (updates: Partial<NonNullable<Persona['aiPhoneSettings']>>) => {
    if (onUpdatePersona) {
      onUpdatePersona({
        aiPhoneSettings: {
          ...(persona.aiPhoneSettings || {}),
          ...updates
        }
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'wallpaper' | string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === 'wallpaper') {
        setWallpaper(base64);
        handleUpdateSettings({ wallpaper: base64 });
      } else {
        const newIcons = { ...(persona.aiPhoneSettings?.customIcons || {}), [type]: base64 };
        handleUpdateSettings({ customIcons: newIcons });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const renderMessageContent = (text: string) => {
    // Strip hidden tags
    const cleanText = text.replace(/\|\|NEXT:[^|]+\|\|/g, '').trim();
    const parts = cleanText.split(/(\[STICKER:\s*[^\]]+\])/g);
    
    return parts.map((part, i) => {
      const match = part.match(/\[STICKER:\s*([^\]]+)\]/);
      if (match) {
        let src = match[1].trim();
        if (!src.startsWith('http') && !src.startsWith('data:')) {
          if (src === 'image') {
            return <span key={i} className="text-[12px] opacity-50">[图片]</span>;
          }
          src = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(src)}`;
        }
        return (
          <img 
            key={i}
            src={src} 
            alt="Sticker" 
            className="w-24 h-24 rounded-lg object-contain my-1 inline-block"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      }
      return (
        <div key={i} className="markdown-body text-[15px] leading-relaxed">
          <Markdown>{part}</Markdown>
        </div>
      );
    });
  };

  const renderHomeScreen = () => (
    <div 
      className="flex flex-col h-full justify-between"
      style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-4 gap-x-4 gap-y-8 p-6 pt-10">
        {[
          { id: 'wechat', icon: <MessageSquare className="text-white" />, label: "微信", color: "bg-[#07c160]" },
          { id: 'diary', icon: <Book className="text-white" />, label: "日记", color: "bg-[#ff5e5e]" },
          { id: 'contacts', icon: <User className="text-white" />, label: "通讯录", color: "bg-[#2782d7]" },
          { id: 'notes', icon: <FileText className="text-white" />, label: "备忘录", color: "bg-[#f1a035]" },
          { id: 'settings', icon: <Settings className="text-white" />, label: "设置", color: "bg-[#8e8e93]" },
        ].map((app) => {
          const customIcon = persona.aiPhoneSettings?.customIcons?.[app.id];
          return (
            <button 
              key={app.id}
              onClick={() => setActiveScreen(app.id as AppScreen)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`${app.color} w-[54px] h-[54px] rounded-[1.2rem] flex items-center justify-center shadow-md group-active:scale-90 transition-transform overflow-hidden border border-white/10`}>
                {customIcon ? (
                  <img src={customIcon} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  app.icon
                )}
              </div>
              <span className="text-[11px] text-white font-medium drop-shadow-md">{app.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dock */}
      <div className="mx-4 mb-4 p-3 bg-white/20 backdrop-blur-xl rounded-[2rem] flex justify-around items-center border border-white/20">
        {[
          { id: 'wechat', icon: <MessageSquare className="text-white" />, color: "bg-[#07c160]" },
          { id: 'diary', icon: <Book className="text-white" />, color: "bg-[#ff5e5e]" },
          { id: 'contacts', icon: <User className="text-white" />, color: "bg-[#2782d7]" },
          { id: 'settings', icon: <Settings className="text-white" />, color: "bg-[#8e8e93]" },
        ].map((app) => {
          const customIcon = persona.aiPhoneSettings?.customIcons?.[app.id];
          return (
            <button 
              key={app.id}
              onClick={() => setActiveScreen(app.id as AppScreen)}
              className="w-12 h-12 rounded-[1rem] flex items-center justify-center overflow-hidden group active:scale-90 transition-transform"
            >
              <div className={`${app.color} w-full h-full flex items-center justify-center`}>
                {customIcon ? (
                  <img src={customIcon} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  app.icon
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderWeChatList = () => (
    <div className="flex flex-col h-full bg-[#ededed] text-black">
      <div 
        className={`px-4 pb-2 flex items-center justify-between bg-[#ededed]`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveScreen('home')} className="p-1 -ml-2 active:opacity-50 transition-opacity">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[17px] font-semibold">微信</h1>
        </div>
        <div className="flex gap-5 items-center">
          <Search size={20} strokeWidth={2} />
          <div className="w-5 h-5 border-[1.5px] border-black rounded-full flex items-center justify-center font-bold text-xs leading-none">+</div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Search Bar Placeholder */}
        <div className="px-3 py-2 bg-[#ededed]">
          <div className="bg-white rounded-md py-1.5 flex items-center justify-center gap-1 text-gray-400 text-[13px]">
            <Search size={14} />
            <span>搜索</span>
          </div>
        </div>

        {messages.map((msg) => (
          <button 
            key={msg.id}
            onClick={() => { setSelectedChat(msg); setActiveScreen('chat-detail'); }}
            className="w-full p-3 flex gap-3 hover:bg-gray-100 border-b border-gray-100 text-left active:bg-gray-200 transition-colors"
          >
            <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
              <img src={(msg as any).avatar || `https://picsum.photos/seed/${msg.from}/100/100`} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex justify-between items-baseline">
                <span className="font-medium text-[16px] text-gray-900">{msg.from}</span>
                <span className="text-[11px] text-gray-400 font-light">{msg.time}</span>
              </div>
              <p className="text-[13px] text-gray-500 truncate mt-0.5 font-light">{msg.lastMsg}</p>
            </div>
          </button>
        ))}
      </div>
      
      <div 
        className="border-t border-gray-200 bg-[#f7f7f7] flex items-center justify-around px-2 text-[10px] font-medium text-gray-500"
        style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))', height: 'calc(52px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col items-center text-[#07c160] gap-0.5">
          <MessageSquare size={24} strokeWidth={2} />
          <span>微信</span>
        </div>
        <div className="flex flex-col items-center gap-0.5" onClick={() => setActiveScreen('contacts')}>
          <User size={24} strokeWidth={2} />
          <span>通讯录</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Search size={24} strokeWidth={2} />
          <span>发现</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-sm overflow-hidden border border-gray-200 flex-shrink-0">
            <img src={persona.avatarUrl || `https://picsum.photos/seed/${persona.name}/100/100`} className="w-full h-full object-cover aspect-square" alt="" referrerPolicy="no-referrer" />
          </div>
          <span>我</span>
        </div>
      </div>
    </div>
  );

  const renderWeChatChat = () => {
    const handleSend = () => {
      if (!inputText.trim()) return;
      if (selectedChat?.isRealUser) {
        onSendMessageAsAi(inputText);
      } else {
        // For NPC chats, just simulate adding to history (not persistent in this demo)
        selectedChat.history.push({ role: 'me', text: inputText });
      }
      setInputText('');
    };

    return (
      <div className="flex flex-col h-full bg-[#f5f5f5] text-black">
        <div 
          className={`px-4 pb-3 border-b border-gray-200 flex items-center justify-between bg-[#ededed]`}
          style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
        >
          <button onClick={() => setActiveScreen('wechat')} className="text-black active:opacity-50 transition-opacity">
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 text-center font-semibold text-[17px]">
            {selectedChat?.from}
          </div>
          <div className="w-6 flex justify-end">
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-black rounded-full"></div>
              <div className="w-1 h-1 bg-black rounded-full"></div>
              <div className="w-1 h-1 bg-black rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="text-center py-2">
            <span className="text-[11px] text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded-md">{selectedChat?.time}</span>
          </div>
          {selectedChat?.history.map((chat: any, idx: number) => (
            <div key={idx} className={`flex gap-3 ${chat.role === 'me' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                <img 
                  src={chat.role === 'me' ? (persona.avatarUrl || `https://picsum.photos/seed/${persona.name}/100/100`) : (selectedChat?.avatar || `https://picsum.photos/seed/${selectedChat?.from}/100/100`)} 
                  alt="" 
                  className="w-full h-full object-cover aspect-square"
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className={`relative max-w-[70%] p-2.5 rounded-md shadow-sm ${
                chat.role === 'me' ? 'bg-[#95ec69] text-black' : 'bg-white text-black'
              }`}>
                {renderMessageContent(chat.text)}
                <div className={`absolute top-3 w-2 h-2 rotate-45 ${
                  chat.role === 'me' ? 'bg-[#95ec69] -right-1' : 'bg-white -left-1'
                }`}></div>
              </div>
            </div>
          ))}
        </div>
        <div 
          className="p-2 border-t border-gray-200 bg-[#f7f7f7] flex gap-2 items-center"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="p-1.5 active:opacity-50 transition-opacity"><Terminal size={26} className="text-gray-700" /></div>
          <input 
            className="flex-1 bg-white rounded-md px-3 py-2 text-[15px] border border-gray-200 min-h-[36px] outline-none"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="发送消息..."
          />
          <button 
            onClick={handleSend}
            className={`p-1.5 active:opacity-50 transition-opacity ${inputText.trim() ? 'text-[#07c160]' : 'text-gray-400'}`}
          >
            <MessageSquare size={26} />
          </button>
          <div className="p-1.5 active:opacity-50 transition-opacity"><div className="w-7 h-7 border-[1.5px] border-gray-700 rounded-full flex items-center justify-center font-bold text-xl leading-none">+</div></div>
        </div>
      </div>
    );
  };

  const renderDiaryScreen = () => (
    <div className="flex flex-col h-full bg-[#fdfaf2] text-black">
      <div 
        className={`px-4 pb-4 flex items-center justify-between bg-[#fdfaf2] border-b border-orange-100`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={() => setActiveScreen('home')} className="p-1 -ml-2 active:opacity-50 transition-opacity">
          <ChevronLeft size={24} className="text-orange-800" />
        </button>
        <h1 className="text-[18px] font-bold text-orange-900">我的日记</h1>
        <div className="w-8"></div> {/* Placeholder to balance flex layout */}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {(persona.diaryEntries || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-orange-300 gap-4 opacity-60">
            <Book size={64} strokeWidth={1} />
            <p className="text-sm">还没有写过日记喵...</p>
          </div>
        ) : (
          (persona.diaryEntries || []).map((entry) => (
            <div key={entry.id} className="bg-white p-5 rounded-2xl shadow-sm border border-orange-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50/50 rounded-bl-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-center mb-3 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[14px] text-orange-900 font-bold mb-1">{entry.title}</span>
                  <span className="text-[11px] text-orange-800/70 font-medium">
                    {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{entry.weather}</span>
                    <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">{entry.moodLabel || entry.mood}</span>
                  </div>
                </div>
                <Book size={16} className="text-orange-200" />
              </div>
              <div className="markdown-body text-[15px] leading-relaxed text-gray-800 relative z-10">
                <Markdown>{entry.content}</Markdown>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="flex flex-col h-full bg-[#ededed] text-black">
      <div 
        className={`px-4 pb-2 flex items-center justify-between bg-[#ededed] relative`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-1">
          <button onClick={() => setActiveScreen('home')} className="p-1 -ml-2 active:opacity-50 transition-opacity">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[17px] font-semibold">通讯录</h1>
        </div>
        <div className="flex items-center gap-2">
          <User size={20} strokeWidth={2} />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Search Bar Placeholder */}
        <div className="px-3 py-2 bg-[#ededed]">
          <div className="bg-white rounded-md py-1.5 flex items-center justify-center gap-1 text-gray-400 text-[13px]">
            <Search size={14} />
            <span>搜索</span>
          </div>
        </div>

        <div className="p-3 flex items-center gap-3 border-b border-gray-100 active:bg-gray-100 transition-colors">
          <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-md bg-gray-100 overflow-hidden border border-gray-100 flex-shrink-0">
            <img src={persona.avatarUrl || `https://picsum.photos/seed/${persona.name}/100/100`} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[16px] text-gray-900 truncate">{persona.name}</div>
            <div className="text-[12px] text-gray-400 font-light">微信号: AI_{persona.name.slice(0, 4)}</div>
          </div>
        </div>
        
        <div className="bg-[#ededed] px-4 py-1.5 text-[12px] text-gray-500 font-medium">我的联系人</div>
        
        {contacts.map((contact) => (
          <div key={contact.id} className="p-3 flex items-center gap-3 border-b border-gray-100 active:bg-gray-100 transition-colors">
            <div className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
              <img src={contact.avatar} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[16px] text-gray-900 truncate">{contact.name}</div>
              <div className="text-[12px] text-gray-400 font-light truncate">{(contact as any).status || contact.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div 
        className="border-t border-gray-200 bg-[#f7f7f7] flex items-center justify-around px-2 text-[10px] font-medium text-gray-500"
        style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))', height: 'calc(52px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex flex-col items-center gap-0.5" onClick={() => setActiveScreen('wechat')}>
          <MessageSquare size={24} strokeWidth={2} />
          <span>微信</span>
        </div>
        <div className="flex flex-col items-center text-[#07c160] gap-0.5">
          <User size={24} strokeWidth={2} />
          <span>通讯录</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <Search size={24} strokeWidth={2} />
          <span>发现</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <div className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-sm overflow-hidden border border-gray-200 flex-shrink-0">
            <img src={persona.avatarUrl || `https://picsum.photos/seed/${persona.name}/100/100`} className="w-full h-full object-cover aspect-square" alt="" referrerPolicy="no-referrer" />
          </div>
          <span>我</span>
        </div>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="flex flex-col h-full bg-[#F2F2F7] text-black">
      <div 
        className={`px-4 pb-2 flex items-center justify-between`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={() => setActiveScreen('home')} className="text-blue-500 flex items-center gap-1 text-[17px]">
          <ChevronLeft size={24} />
          <span>返回</span>
        </button>
        <div className="w-6"></div>
      </div>
      <div className="px-4 pb-4">
        <h1 className="text-[34px] font-bold mb-4">备忘录</h1>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          {notes.map((note, idx) => (
            <div key={idx} className="p-4 border-b border-gray-100 last:border-0 active:bg-gray-50 transition-colors">
              <div className="font-semibold text-[17px] mb-0.5 text-gray-900">{note.title}</div>
              <div className="text-[14px] text-gray-500 line-clamp-1 font-light">{note.content}</div>
            </div>
          ))}
        </div>
      </div>
      <div 
        className="mt-auto p-4 border-t border-gray-200 bg-white/80 backdrop-blur-md flex justify-between items-center text-blue-500"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <span className="text-[13px] text-gray-400">{notes.length} 个备忘录</span>
        <FileText size={24} />
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full bg-[#F2F2F7] text-black">
      <div 
        className={`px-4 pb-2 flex items-center gap-2 bg-white/80 backdrop-blur-md border-b border-gray-200`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={() => setActiveScreen('home')} className="text-blue-500 p-1 -ml-1 active:opacity-50 transition-opacity">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold">设置</h1>
      </div>
      <div className="p-4 overflow-y-auto flex-1">
        
        <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="p-4 flex items-center gap-4 border-b">
            <div className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
              <img src={persona.avatarUrl || `https://picsum.photos/seed/${persona.name}/100/100`} alt="" className="w-full h-full object-cover aspect-square" referrerPolicy="no-referrer" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-lg truncate">{persona.name}</div>
              <div className="text-sm text-gray-500 truncate">Apple ID、iCloud、媒体与购买项目</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500 p-1.5 rounded-md">
                <Lock size={18} className="text-white" />
              </div>
              <span className="font-medium">AI 监控模式</span>
            </div>
            <button 
              onClick={() => {
                const newValue = !isMonitoringEnabled;
                setIsMonitoringEnabled(newValue);
                handleUpdateSettings({ isMonitoringEnabled: newValue });
              }}
              className={`w-12 h-6 rounded-full transition-colors ${isMonitoringEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${isMonitoringEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div>
            </button>
          </div>
          <button 
            onClick={() => setActiveScreen('wallpaper-settings')}
            className="w-full p-4 flex items-center justify-between border-b hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-1.5 rounded-md">
                <Camera size={18} className="text-white" />
              </div>
              <span className="font-medium">墙纸</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-12 rounded bg-gray-200 overflow-hidden border">
                <img src={wallpaper} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <ChevronLeft size={18} className="text-gray-300 rotate-180" />
            </div>
          </button>
          <button 
            onClick={() => setActiveScreen('icon-settings')}
            className="w-full p-4 flex items-center justify-between border-b last:border-0 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-1.5 rounded-md">
                <Smartphone size={18} className="text-white" />
              </div>
              <span className="font-medium">图标自定义</span>
            </div>
            <ChevronLeft size={18} className="text-gray-300 rotate-180" />
          </button>

          {[
            { icon: <Cpu className="text-white" />, label: "处理器负载", value: "0.002%", color: "bg-blue-500" },
            { icon: <HardDrive className="text-white" />, label: "存储空间", value: "8.4 PB", color: "bg-gray-500" },
            { icon: <Wifi className="text-white" />, label: "神经连接", value: "已连接", color: "bg-green-500" },
            { icon: <Battery className="text-white" />, label: "电池健康", value: "100%", color: "bg-green-400" },
          ].map((item, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className={`${item.color} p-1.5 rounded-md`}>
                  {React.cloneElement(item.icon as React.ReactElement, { size: 18 } as any)}
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <span className="text-gray-400">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWallpaperSettings = () => (
    <div className="flex flex-col h-full bg-[#F2F2F7] text-black">
      <div 
        className={`p-4 flex items-center gap-4 border-b bg-white`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={() => setActiveScreen('settings')} className="text-blue-500">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">墙纸设置</h1>
      </div>
      <div className="p-4 flex flex-col gap-4">
        <label className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-center cursor-pointer active:scale-95 transition-transform">
          上传自定义墙纸
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => handleFileUpload(e, 'wallpaper')}
          />
        </label>
        
        <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[400px]">
          {[
            "https://picsum.photos/seed/cat_bg/600/1200",
            "https://picsum.photos/seed/tech_bg/600/1200",
            "https://picsum.photos/seed/nature_bg/600/1200",
            "https://picsum.photos/seed/space_bg/600/1200",
            "https://picsum.photos/seed/abstract_bg/600/1200",
            "https://picsum.photos/seed/minimal_bg/600/1200",
          ].map((url, idx) => (
            <button 
              key={idx}
              onClick={() => { setWallpaper(url); handleUpdateSettings({ wallpaper: url }); }}
              className={`aspect-[9/16] rounded-xl overflow-hidden border-4 transition-all ${
                wallpaper === url ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderIconSettings = () => (
    <div className="flex flex-col h-full bg-[#F2F2F7] text-black">
      <div 
        className={`p-4 flex items-center gap-4 border-b bg-white`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={() => setActiveScreen('settings')} className="text-blue-500">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">图标自定义</h1>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto">
        {[
          { id: 'wechat', label: '微信' },
          { id: 'contacts', label: '通讯录' },
          { id: 'notes', label: '备忘录' },
          { id: 'settings', label: '设置' },
        ].map((app) => (
          <div key={app.id} className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center border">
                {persona.aiPhoneSettings?.customIcons?.[app.id] ? (
                  <img src={persona.aiPhoneSettings.customIcons[app.id]} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <Smartphone size={24} className="text-gray-400" />
                )}
              </div>
              <span className="font-medium">{app.label}</span>
            </div>
            <label className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm cursor-pointer hover:bg-blue-100 transition-colors">
              更换
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleFileUpload(e, app.id)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      style={{ paddingTop: 'calc(2.5rem + env(safe-area-inset-top))' }}
    >
      {isLocked && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center text-white p-6">
          <Lock size={64} className="text-red-500 mb-6" />
          <h2 className="text-2xl font-bold mb-4">手机已锁定</h2>
          <p className="text-center text-gray-400 mb-8">
            {persona.name} 发现了你的可疑行为，手机已被锁定。你需要向 {persona.name} 解释清楚。
          </p>
          <button 
            onClick={() => setIsLocked(false)}
            className="px-8 py-3 bg-red-600 text-white rounded-full font-bold"
          >
            解锁并解释
          </button>
        </div>
      )}
      {/* AI Thought Popup */}
      <AnimatePresence>
        {showThought && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 z-[200] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 text-black max-w-[280px] text-sm font-medium"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
              <span className="text-xs font-bold text-gray-500">{persona.name} 的想法</span>
            </div>
            <p>{aiThought}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Button */}
      <button 
        onClick={onClose}
        className="mb-6 flex items-center gap-2 px-6 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-xl rounded-full text-white border border-white/30 shadow-lg transition-all active:scale-95 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold">返回我的手机</span>
      </button>

      <div className="w-full max-w-[320px] bg-black border-[8px] border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col h-[650px] relative">
        
        {/* Status Bar */}
        <div className={`absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-6 z-[60] text-[12px] font-semibold ${
          activeScreen === 'home' ? 'text-white' : 'text-black'
        }`}>
          <div className="flex-1">
            <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          </div>
          
          {/* Dynamic Island / Notch */}
          <div className="w-24 h-7 bg-black rounded-full flex items-center justify-center gap-1.5 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
            <div className="flex-1"></div>
            <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700"></div>
          </div>

          <div className="flex-1 flex justify-end items-center gap-1.5">
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-0.5 h-[30%] bg-current rounded-full"></div>
              <div className="w-0.5 h-[50%] bg-current rounded-full"></div>
              <div className="w-0.5 h-[70%] bg-current rounded-full"></div>
              <div className="w-0.5 h-[90%] bg-current rounded-full"></div>
            </div>
            <Wifi size={14} strokeWidth={2.5} />
            <div className="flex items-center gap-0.5 border border-current/30 rounded-[2px] px-0.5 py-0.5">
              <div className="w-4 h-1.5 bg-current rounded-[1px]"></div>
            </div>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {activeScreen === 'home' && (
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
              style={{ backgroundImage: `url("${wallpaper}")` }}
            >
              <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
              <div className="relative z-10 h-full">
                {renderHomeScreen()}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeScreen !== 'home' && (
              <motion.div
                key={activeScreen}
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-40"
              >
                {activeScreen === 'wechat' && renderWeChatList()}
                {activeScreen === 'diary' && renderDiaryScreen()}
                {activeScreen === 'contacts' && renderContacts()}
                {activeScreen === 'notes' && renderNotes()}
                {activeScreen === 'settings' && renderSettings()}
                {activeScreen === 'chat-detail' && renderWeChatChat()}
                {activeScreen === 'wallpaper-settings' && renderWallpaperSettings()}
                {activeScreen === 'icon-settings' && renderIconSettings()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-center z-[70] bg-transparent">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveScreen('home');
            }}
            className="w-32 h-1.5 bg-zinc-800/40 rounded-full active:scale-95 transition-transform"
          />
        </div>

        {/* Close Button Overlay */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors hidden"
        >
          <X size={32} />
        </button>
      </div>
    </div>
  );
}
