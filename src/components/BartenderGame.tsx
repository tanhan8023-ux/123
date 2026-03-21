import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, GlassWater, Wine, Beer, Coffee, IceCream, Sparkles, Send, Loader2, RefreshCw, Dices, Trophy, PartyPopper, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAiResponse } from '../services/aiService';
import { GoogleGenAI } from '@google/genai';
import { ApiSettings, Persona, Message, UserProfile, WorldbookSettings, ThemeSettings } from '../types';
import { generateId } from '../utils/id';

interface Props {
  onBack: () => void;
  apiSettings: ApiSettings;
  personas: Persona[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  userProfile: UserProfile;
  worldbook: WorldbookSettings;
  theme: ThemeSettings;
}

interface Ingredient {
  id: string;
  name: string;
  icon: any;
  color: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'gin', name: '金酒', icon: Wine, color: '#e0f2fe' },
  { id: 'vodka', name: '伏特加', icon: GlassWater, color: '#f8fafc' },
  { id: 'rum', name: '朗姆酒', icon: Beer, color: '#fef3c7' },
  { id: 'lemon', name: '柠檬汁', icon: Coffee, color: '#fef08a' },
  { id: 'sugar', name: '糖浆', icon: IceCream, color: '#ffffff' },
  { id: 'soda', name: '苏打水', icon: Sparkles, color: '#dcfce7' },
];

type GameState = 'dice-roll' | 'mixing' | 'serving' | 'decision' | 'truth-or-dare' | 'answering' | 'drunk-event' | 'round-end' | 'user-asking';

export function BartenderGame({ onBack, apiSettings, personas, messages, setMessages, userProfile, worldbook, theme }: Props) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(() => {
    const saved = localStorage.getItem('bartender_selectedPersonaId');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('bartender_selectedIngredients');
    return saved ? JSON.parse(saved) : [];
  });
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('bartender_gameState');
    return saved ? JSON.parse(saved) : 'dice-roll';
  });
  const [bartenderComment, setBartenderComment] = useState(() => {
    const saved = localStorage.getItem('bartender_bartenderComment');
    return saved ? JSON.parse(saved) : '';
  });
  const [question, setQuestion] = useState(() => {
    const saved = localStorage.getItem('bartender_question');
    return saved ? JSON.parse(saved) : '';
  });
  const [userAnswer, setUserAnswer] = useState(() => {
    const saved = localStorage.getItem('bartender_userAnswer');
    return saved ? JSON.parse(saved) : '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ role: 'bartender' | 'user' | 'system', text: string }>>(() => {
    const saved = localStorage.getItem('bartender_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Dice Game State
  const [userDice, setUserDice] = useState<number>(() => {
    const saved = localStorage.getItem('bartender_userDice');
    return saved ? JSON.parse(saved) : 0;
  });
  const [aiDice, setAiDice] = useState<number>(() => {
    const saved = localStorage.getItem('bartender_aiDice');
    return saved ? JSON.parse(saved) : 0;
  });
  const [winner, setWinner] = useState<'user' | 'ai' | null>(() => {
    const saved = localStorage.getItem('bartender_winner');
    return saved ? JSON.parse(saved) : null;
  });
  const [isRolling, setIsRolling] = useState(false);
  
  // Drunk State
  const [intoxication, setIntoxication] = useState(() => {
    const saved = localStorage.getItem('bartender_intoxication');
    return saved ? JSON.parse(saved) : 0;
  });
  const [userIntoxication, setUserIntoxication] = useState(() => {
    const saved = localStorage.getItem('bartender_userIntoxication');
    return saved ? JSON.parse(saved) : 0;
  });
  const [gameMemory, setGameMemory] = useState<string[]>(() => {
    const saved = localStorage.getItem('bartender_gameMemory');
    return saved ? JSON.parse(saved) : [];
  });
  const DRUNK_THRESHOLD = 3;
  
  // Heart Rate State
  const [aiHeartRate, setAiHeartRate] = useState(75);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('bartender_selectedPersonaId', JSON.stringify(selectedPersonaId));
    localStorage.setItem('bartender_selectedIngredients', JSON.stringify(selectedIngredients));
    localStorage.setItem('bartender_gameState', JSON.stringify(gameState));
    localStorage.setItem('bartender_bartenderComment', JSON.stringify(bartenderComment));
    localStorage.setItem('bartender_question', JSON.stringify(question));
    localStorage.setItem('bartender_userAnswer', JSON.stringify(userAnswer));
    localStorage.setItem('bartender_history', JSON.stringify(history));
    localStorage.setItem('bartender_userDice', JSON.stringify(userDice));
    localStorage.setItem('bartender_aiDice', JSON.stringify(aiDice));
    localStorage.setItem('bartender_winner', JSON.stringify(winner));
    localStorage.setItem('bartender_intoxication', JSON.stringify(intoxication));
    localStorage.setItem('bartender_userIntoxication', JSON.stringify(userIntoxication));
    localStorage.setItem('bartender_gameMemory', JSON.stringify(gameMemory));
  }, [selectedPersonaId, selectedIngredients, gameState, bartenderComment, question, userAnswer, history, userDice, aiDice, winner, intoxication, userIntoxication, gameMemory]);

  // Simulate heart rate
  useEffect(() => {
      const interval = setInterval(() => {
          const baseRate = 75 + (intoxication * 15);
          const fluctuation = Math.floor(Math.random() * 14) - 7;
          setAiHeartRate(baseRate + fluctuation);
      }, 2000);
      return () => clearInterval(interval);
  }, [intoxication]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading, gameState]);

  const handleAddIngredient = (ing: Ingredient) => {
    if (selectedIngredients.length < 3) {
      setSelectedIngredients([...selectedIngredients, ing]);
    }
  };

  const handleReset = () => {
    setSelectedIngredients([]);
    setGameState('dice-roll');
    setBartenderComment('');
    setQuestion('');
    setUserAnswer('');
    setHistory([]);
    setUserDice(0);
    setAiDice(0);
    setWinner(null);
    setIntoxication(0);
    setUserIntoxication(0);
  };

  const startNewRound = () => {
    setSelectedIngredients([]);
    setGameState('dice-roll');
    setBartenderComment('');
    setQuestion('');
    setUserAnswer('');
    setUserDice(0);
    setAiDice(0);
    setWinner(null);
    setHistory(prev => [...prev, { role: 'system', text: '--- 新的一局 ---' }]);
  };

  const addToMemory = (event: string) => {
    setGameMemory(prev => {
        const newMemory = [...prev, event];
        // Keep only last 5 major events to avoid context bloat
        return newMemory.slice(-5);
    });
  };

  // Sync game events to chat history
  const syncToChat = (text: string, role: 'user' | 'model') => {
    if (!selectedPersonaId) return;
    
    const newMsg: Message = {
      id: generateId(),
      personaId: selectedPersonaId,
      role: role,
      text: `[调酒真心话] ${text}`,
      msgType: 'text',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isRead: true,
      createdAt: Date.now(),
      hidden: true
    };
    
    setMessages(prev => [...prev, newMsg]);
  };

  const generateGameContent = async (prompt: string, expectJson: boolean = false) => {
    if (!selectedPersona) return null;

    // Convert history to context messages
    const contextMessages: Message[] = history
        .filter(h => h.role !== 'system')
        .map(h => ({
            id: generateId(),
            personaId: selectedPersona.id,
            role: h.role === 'bartender' ? 'model' : 'user',
            text: h.text,
            msgType: 'text',
            timestamp: '',
            isRead: true,
            createdAt: Date.now(),
            hidden: false
        }));

    try {
      const memoryContext = gameMemory.length > 0 
        ? `\n[游戏记忆（之前的回合）：\n${gameMemory.map((m, i) => `${i+1}. ${m}`).join('\n')}]`
        : "";

      const response = await fetchAiResponse(
        prompt + memoryContext,
        contextMessages, // Pass history as context
        selectedPersona,
        apiSettings,
        worldbook,
        userProfile,
        aiRef,
        false, // disable quote
        expectJson ? "请务必只输出合法的JSON格式，不要包含Markdown代码块标记。" : "",
        undefined,
        {
            // Override model if needed, but we use apiSettings.model by default
        },
        undefined,
        undefined,
        undefined,
        expectJson // isSystemTask
      );
      
      let text = response.responseText;
      
      // Strip sticker tags if present (e.g., [STICKER: ...])
      text = (text || '').replace(/\[STICKER:.*?\]/g, '').trim();
      
      // Clean up markdown code blocks if present
      if (expectJson) {
        text = (text || '').replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON from AI:", text);
            // Fallback for JSON parsing failure
            return {
                drinkName: "神秘特调",
                comment: "这杯酒的味道...难以言喻。",
                question: "你敢喝吗？",
                choice: "drink",
                response: "很有趣的味道。"
            };
        }
      }
      
      return text;
    } catch (error: any) {
      console.error("Game AI Error:", error);
      throw error;
    }
  };

  const rollDice = async () => {
    if (isRolling || isLoading) return;
    setIsLoading(true);
    setIsRolling(true);
    setWinner(null);
    
    try {
      // Animation effect
      const interval = setInterval(() => {
          setUserDice(Math.floor(Math.random() * 6) + 1);
          setAiDice(Math.floor(Math.random() * 6) + 1);
      }, 80);

      await new Promise(resolve => setTimeout(resolve, 1500));
      clearInterval(interval);

      const uDice = Math.floor(Math.random() * 6) + 1;
      const aDice = Math.floor(Math.random() * 6) + 1;
      
      setUserDice(uDice);
      setAiDice(aDice);
      setIsRolling(false);
      
      // Highlight winner immediately
      if (uDice > aDice) {
          setWinner('user');
      } else if (aDice > uDice) {
          setWinner('ai');
      } else {
          setWinner(null);
      }

      // Wait for user to see the result
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      if (uDice > aDice) {
        const aiChoice = Math.random() > 0.5 ? 'drink' : 'truth';
        
        if (aiChoice === 'drink') {
            const text = await generateGameContent(`[系统提示：用户掷出了 ${uDice} 点，你掷出了 ${aDice} 点。用户赢了！你决定选择“大冒险/喝酒”。请表现出愿赌服输的样子，让用户为你调制一杯特饮。]`);
            if (typeof text === 'string') setHistory(prev => [...prev, { role: 'bartender', text }]);
            setGameState('mixing');
        } else {
            const text = await generateGameContent(`[系统提示：用户掷出了 ${uDice} 点，你掷出了 ${aDice} 点。用户赢了！你决定选择“真心话”。请让用户问你一个问题。]`);
            if (typeof text === 'string') setHistory(prev => [...prev, { role: 'bartender', text }]);
            setGameState('user-asking');
        }
      } else if (aDice > uDice) {
        const text = await generateGameContent(`[系统提示：你掷出了 ${aDice} 点，用户掷出了 ${uDice} 点。你赢了！请得意地让用户选择：是喝下你特制的“惩罚特饮”，还是选择“真心话”？]`);
        if (typeof text === 'string') setHistory(prev => [...prev, { role: 'bartender', text }]);
        setGameState('decision');
      } else {
        setWinner(null);
        const text = await generateGameContent(`[系统提示：平局（都是 ${uDice} 点）。请吐槽一下，并要求重新掷骰子。]`);
        if (typeof text === 'string') setHistory(prev => [...prev, { role: 'bartender', text }]);
      }
    } catch (error) {
      console.error("Roll dice error:", error);
      setHistory(prev => [...prev, { role: 'system', text: '游戏同步出错，请重试。' }]);
    } finally {
      setIsRolling(false);
      setIsLoading(false);
    }
  };

  const userMixDrink = async () => {
    if (selectedIngredients.length === 0) return;
    setIsLoading(true);
    
    let nextState: GameState = 'round-end';

    const ingredientsList = selectedIngredients.map(i => i.name).join('、');
    setHistory(prev => [...prev, { role: 'user', text: `(调制了一杯由 ${ingredientsList} 组成的特饮)` }]);
    
    try {
        const text = await generateGameContent(`[系统提示：用户为你调制了一杯酒，使用了以下配料：${ingredientsList}。请品尝这杯酒，描述它的味道（可能是美味，也可能是黑暗料理），并根据味道给出评价。如果味道很奇怪，可以表现出想吐或晕倒。]`);
        if (typeof text === 'string') {
            setHistory(prev => [...prev, { role: 'bartender', text }]);
            syncToChat(`我给你调了一杯由${ingredientsList}组成的酒。\n${selectedPersona?.name}: ${text}`, 'user');
            addToMemory(`用户调制了由 ${ingredientsList} 组成的酒，你的评价是：${text.slice(0, 30)}...`);
        }
        
        // Calculate alcohol content
        const alcoholCount = selectedIngredients.filter(i => ['gin', 'vodka', 'rum'].includes(i.id)).length;
        if (alcoholCount > 0) {
            setIntoxication(prev => prev + alcoholCount);
            if (intoxication + alcoholCount >= DRUNK_THRESHOLD) {
                nextState = 'drunk-event';
                triggerDrunkEvent();
            }
        }
        
        if (nextState !== 'drunk-event') {
             setGameState('round-end');
        } else {
             setGameState('drunk-event');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const triggerDrunkEvent = async () => {
      const events = [
          "突然开始胡言乱语，说出了一些平时不敢说的真心话。",
          "脸红得像个苹果，开始傻笑，还要拉着你跳舞。",
          "变得非常感性，开始回忆过去，甚至掉下了眼泪。",
          "突然睡着了，怎么叫都叫不醒，嘴里还嘟囔着什么。",
          "变得异常大胆，开始调戏你，甚至提出了一些过分的要求。"
      ];
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      
      try {
        const text = await generateGameContent(`[系统提示：你喝醉了！醉酒状态：${randomEvent}。请根据这个状态进行表演，与用户互动。]`);
        if (typeof text === 'string') {
            setHistory(prev => [...prev, { role: 'bartender', text: `(醉酒状态) ${text}` }]);
        }
      } catch (error) {
        console.error("Drunk event error:", error);
      }
  };

  const handleUserDecision = async (choice: 'drink' | 'truth') => {
      setIsLoading(true);
      try {
        if (choice === 'drink') {
            setUserIntoxication(prev => prev + 1);
            setHistory(prev => [...prev, { role: 'user', text: "(选择了喝酒)" }]);
            
            let drunkPrompt = "";
            if (userIntoxication + 1 >= DRUNK_THRESHOLD) {
                drunkPrompt = " [系统提示：用户已经喝醉了！请根据你的人设，对醉酒的用户做出反应，可以是关切、调侃、照顾或趁机套话。]";
            }
            
            const text = await generateGameContent(`[系统提示：用户选择了“大冒险/喝酒”。请发挥你的创意，现场调制一杯名字古怪、成分离谱的“惩罚特饮”，描述它的外观 and 气味，并看着用户喝下去。]${drunkPrompt}`);
            if (typeof text === 'string') {
                setHistory(prev => [...prev, { role: 'bartender', text }]);
                syncToChat(`我选择喝酒。\n${selectedPersona?.name}: ${text}`, 'user');
                addToMemory(`用户选择了喝酒惩罚，你调制了特饮并看着TA喝下。`);
            }
            setGameState('round-end');
        } else {
            setGameState('answering');
            setHistory(prev => [...prev, { role: 'user', text: "(选择了真心话)" }]);
            
            let drunkPrompt = "";
            if (userIntoxication >= DRUNK_THRESHOLD) {
                drunkPrompt = " [系统提示：用户已经喝醉了！请根据你的人设，对醉酒的用户做出反应，可以是关切、调侃、照顾或趁机套话。]";
            }
            
            const text = await generateGameContent(`[系统提示：用户选择了“真心话”。请问用户一个犀利、有趣或略带私密的问题。]${drunkPrompt}`);
            if (typeof text === 'string') {
                setHistory(prev => [...prev, { role: 'bartender', text }]);
            }
        }
      } catch (error) {
        console.error("Decision error:", error);
        setHistory(prev => [...prev, { role: 'system', text: '操作失败，请重试。' }]);
      } finally {
        setIsLoading(false);
      }
  };

  const submitAnswer = async () => {
      if (!userAnswer.trim()) return;
      setIsLoading(true);
      
      setHistory(prev => [...prev, { role: 'user', text: userAnswer }]);
      
      try {
        if (gameState === 'user-asking') {
            const text = await generateGameContent(`[系统提示：用户问了你一个真心话问题：“${userAnswer}”。请诚实、有趣或深情地回答这个问题。]`);
            if (typeof text === 'string') {
                setHistory(prev => [...prev, { role: 'bartender', text }]);
                syncToChat(`真心话提问：${userAnswer}\n${selectedPersona?.name}: ${text}`, 'user');
                addToMemory(`用户问了你真心话：${userAnswer}，你的回答是：${text.slice(0, 30)}...`);
            }
        } else {
            const text = await generateGameContent(`[系统提示：用户回答了你的真心话问题：“${userAnswer}”。请对这个回答进行点评，可以是调侃、惊讶或深思。]`);
            if (typeof text === 'string') {
                setHistory(prev => [...prev, { role: 'bartender', text }]);
                syncToChat(`真心话回答：${userAnswer}\n${selectedPersona?.name}: ${text}`, 'user');
                addToMemory(`你问了用户真心话，用户的回答是：${userAnswer}`);
            }
        }
      } finally {
        setUserAnswer('');
        setIsLoading(false);
        setGameState('round-end');
      }
  };

  if (!selectedPersonaId) {
    return (
      <div className="absolute inset-0 bg-slate-900 text-slate-200 z-[100] flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-100" />
        <div 
          className={`relative z-10 pb-2 flex items-center px-4 border-b border-white/10 shrink-0 bg-white/5 backdrop-blur-md`}
          style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
        >
          <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="flex-1 text-center font-medium text-slate-100 tracking-wide">选择游戏对象</h1>
          <div className="w-10" />
        </div>
        <div 
          className="flex-1 overflow-y-auto px-6 pt-6"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-2 gap-4">
            {personas.map(persona => (
              <button
                key={persona.id}
                onClick={() => setSelectedPersonaId(persona.id)}
                className="bg-white/5 hover:bg-white/10 rounded-2xl p-5 flex flex-col items-center gap-4 border border-white/5 active:scale-95 transition-all shadow-lg shadow-black/20"
              >
                <div className="relative">
                    <img src={persona.avatarUrl} className="w-20 h-20 rounded-full object-cover border-2 border-white/10 shadow-md" alt={persona.name} />
                    <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10"></div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-slate-100 text-lg">{persona.name}</div>
                  <div className="text-xs text-slate-400 mt-1 line-clamp-2 px-2 leading-relaxed">{persona.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-[#0f172a] text-slate-200 z-[100] flex flex-col font-sans overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-100" />
      {/* Header */}
      <div 
        className={`relative pb-2 px-4 flex items-center border-b border-white/5 shrink-0 bg-white/5 backdrop-blur-xl z-20 shadow-sm`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={() => setSelectedPersonaId(null)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 flex flex-col items-center">
          <h1 className="font-medium text-slate-100 tracking-wide">调酒真心话 · {selectedPersona?.name}</h1>
          <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/30 px-2 py-0.5 rounded-full mt-0.5">
            <Heart size={10} className="fill-current" />
            <span>{aiHeartRate} BPM</span>
          </div>
        </div>
        <button onClick={handleReset} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
        <AnimatePresence mode="popLayout">
          {history.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-md backdrop-blur-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : msg.role === 'system'
                    ? 'bg-white/5 text-slate-400 text-xs italic px-6 py-2 rounded-full border border-white/5'
                    : 'bg-white/10 text-slate-100 border border-white/5 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white/5 p-4 rounded-2xl rounded-bl-none border border-white/5 backdrop-blur-sm">
                <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Interaction Area */}
      <div 
        className="relative z-10 p-5 bg-white/5 backdrop-blur-2xl border-t border-white/10 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        
        {/* Dice Roll Phase */}
        {gameState === 'dice-roll' && (
          <div className="flex flex-col items-center gap-8 py-2">
            <div className="flex items-center gap-16">
                <div className="flex flex-col items-center gap-3 group">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-xl border transition-all duration-300 ${
                        winner === 'user' 
                            ? 'bg-indigo-500 text-white border-indigo-400 scale-110 shadow-indigo-500/40' 
                            : 'bg-white/10 text-slate-300 border-white/10'
                    }`}>
                        {userDice || '?'}
                    </div>
                    <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">你</span>
                </div>
                
                <div className="text-xl font-black text-white/20 italic">VS</div>
                
                <div className="flex flex-col items-center gap-3 group">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-xl border transition-all duration-300 ${
                        winner === 'ai' 
                            ? 'bg-pink-500 text-white border-pink-400 scale-110 shadow-pink-500/40' 
                            : 'bg-white/10 text-slate-300 border-white/10'
                    }`}>
                        {aiDice || '?'}
                    </div>
                    <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">{selectedPersona?.name}</span>
                </div>
            </div>
            <button
              onClick={rollDice}
              disabled={isRolling}
              className="w-full max-w-xs py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Dices size={22} />
              <span>掷骰子</span>
            </button>
          </div>
        )}

        {/* Mixing Phase (User Turn) */}
        {gameState === 'mixing' && winner === 'user' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between px-1">
                <div className="text-sm font-medium text-slate-300">选择配料 (最多3种)</div>
                <div className="text-xs text-slate-500">{selectedIngredients.length}/3</div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {INGREDIENTS.map(ing => (
                <button
                  key={ing.id}
                  onClick={() => handleAddIngredient(ing)}
                  className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-white/10 transition-colors">
                    <ing.icon size={20} style={{ color: ing.color }} />
                  </div>
                  <span className="text-xs text-slate-300 font-medium">{ing.name}</span>
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1 flex gap-2 p-3 bg-black/20 rounded-2xl border border-white/5 min-h-[60px] items-center">
                {selectedIngredients.length === 0 && <span className="text-xs text-slate-600 ml-1">点击上方配料...</span>}
                {selectedIngredients.map((ing, idx) => (
                  <motion.div
                    key={`${ing.id}-${idx}`}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: ing.color }}
                  >
                    <ing.icon size={16} className="text-slate-900" />
                  </motion.div>
                ))}
              </div>
              <button
                onClick={userMixDrink}
                disabled={selectedIngredients.length === 0 || isLoading}
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
              >
                调制
              </button>
            </div>
          </div>
        )}

        {/* Decision Phase (User Lost) */}
        {gameState === 'decision' && winner === 'ai' && (
            <div className="flex gap-4">
                <button
                    onClick={() => handleUserDecision('drink')}
                    className="flex-1 py-5 bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-200 rounded-2xl font-bold text-lg active:scale-95 transition-all flex flex-col items-center gap-2 group"
                >
                    <div className="p-3 rounded-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
                        <Beer size={28} className="text-amber-400" />
                    </div>
                    <span>喝掉它</span>
                    <span className="text-[11px] font-normal opacity-60">接受惩罚，继续游戏</span>
                </button>
                <button
                    onClick={() => handleUserDecision('truth')}
                    className="flex-1 py-5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-200 rounded-2xl font-bold text-lg active:scale-95 transition-all flex flex-col items-center gap-2 group"
                >
                    <div className="p-3 rounded-full bg-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                        <Sparkles size={28} className="text-indigo-400" />
                    </div>
                    <span>真心话</span>
                    <span className="text-[11px] font-normal opacity-60">回答一个私密问题</span>
                </button>
            </div>
        )}

        {/* Truth or Dare / Answering Phase */}
        {(gameState === 'truth-or-dare' || gameState === 'answering' || gameState === 'user-asking') && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
              placeholder={gameState === 'user-asking' ? "输入你想问的问题..." : "诚实地回答..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-slate-100 outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
            />
            <button
              onClick={submitAnswer}
              disabled={!userAnswer.trim() || isLoading}
              className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
            >
              <Send size={22} />
            </button>
          </div>
        )}

        {/* Drunk Event Phase */}
        {gameState === 'drunk-event' && (
          <div className="flex flex-col items-center justify-center py-6 text-pink-300">
            <div className="p-4 bg-pink-500/10 rounded-full mb-4 animate-bounce">
                <PartyPopper size={40} />
            </div>
            <div className="text-lg font-medium tracking-wide mb-6">TA好像有点醉了...</div>
            <button
                onClick={() => setGameState('round-end')}
                className="px-8 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-500 transition-colors shadow-lg shadow-pink-500/20"
            >
                继续游戏
            </button>
          </div>
        )}

        {/* Round End Phase */}
        {gameState === 'round-end' && (
            <div className="flex gap-4">
                <button
                    onClick={startNewRound}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <RefreshCw size={20} />
                    <span>再来一局</span>
                </button>
                <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-white/10 text-slate-200 rounded-2xl font-bold text-lg border border-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={20} />
                    <span>结束游戏</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
