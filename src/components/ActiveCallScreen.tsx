import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { Persona, CallRecord, ApiSettings, WorldbookSettings, UserProfile } from '../types';
import { fetchAiResponse } from '../services/aiService';
import { GoogleGenAI } from '@google/genai';

interface Props {
  persona: Persona;
  type: 'incoming' | 'outgoing';
  onEndCall: (duration: number, wasMissed: boolean) => void;
  apiSettings: ApiSettings;
  worldbook: WorldbookSettings;
  userProfile: UserProfile;
  aiRef: React.MutableRefObject<GoogleGenAI | null>;
  setPersonas: React.Dispatch<React.SetStateAction<Persona[]>>;
}

export function ActiveCallScreen({ persona, type, onEndCall, apiSettings, worldbook, userProfile, aiRef, setPersonas }: Props) {
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended'>(type === 'incoming' ? 'ringing' : 'ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'connected') {
      const timer = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (type === 'outgoing' && status === 'ringing') {
      const timer = setTimeout(() => {
        if (persona.isOffline) {
          setStatus('ended');
          setTimeout(() => onEndCall(0, true), 2000);
        } else {
          setStatus('connected');
          handleInitialGreeting();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [type, status, persona]);

  const handleInitialGreeting = async () => {
    setIsTyping(true);
    try {
      let prompt = `你现在是${persona.name}，正在和用户通电话。`;
      let blockInstruction = "\n\n【重要规则】这是纯语音电话，你的回复必须是纯粹的口语对话内容，绝对不能包含任何括号里的动作描写、神态描写，也绝对不能有任何物理接触（比如拥抱、擦眼泪等）。绝对不能替用户说话，严禁输出任何用户可能说的话。";
      if (persona.hasBlockedUser) {
        prompt += `\n【重要提示】你在微信上把用户拉黑了。现在用户给你打来了电话。你可以选择直接挂断（输出 [ACTION:HANGUP]），或者接听并根据你的人设表达你的情绪（比如质问、冷漠、或者被哄好）。如果被哄好，请输出 [ACTION:UNBLOCK]。`;
      } else if (persona.isBlockedByUser) {
        prompt += `\n【重要提示】用户在微信上把你拉黑了。现在你主动给用户打电话求和/道歉/质问。请直接说出你的第一句话。`;
      } else {
        prompt += `\n请直接说出你的第一句话（比如“喂？”或者符合你人设的开场白）。`;
      }

      const response = await fetchAiResponse(prompt, [], persona, apiSettings, worldbook, userProfile, aiRef, false, blockInstruction);
      let text = response.responseText.trim();

      if (text.includes('[ACTION:HANGUP]')) {
        setStatus('ended');
        setTimeout(() => onEndCall(duration, false), 2000);
        return;
      }

      if (text.includes('[ACTION:UNBLOCK]')) {
        text = text.replace('[ACTION:UNBLOCK]', '').trim();
        setPersonas(prev => prev.map(p => p.id === persona.id ? { ...p, hasBlockedUser: false } : p));
      }

      setMessages([{ role: 'ai', text }]);
    } catch (e) {
      console.error(e);
      setMessages([{ role: 'ai', text: '喂？' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAccept = () => {
    setStatus('connected');
    handleInitialGreeting();
  };

  const handleDecline = () => {
    setStatus('ended');
    setTimeout(() => onEndCall(0, true), 1000);
  };

  const handleEndCall = () => {
    setStatus('ended');
    setTimeout(() => onEndCall(duration, false), 1000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || status !== 'connected') return;

    const userText = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const context = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // 简化 prompt，只发送用户最新消息，将拉黑状态作为系统指令传递
      let prompt = `用户刚刚说："${userText}"。请根据你的人设，直接回应用户的这句话。`;
      
      let blockInstruction = "【重要规则】这是纯语音电话。你的回复必须是纯粹的口语对话，简短自然，严禁包含任何动作描写、神态描写或物理接触。绝对严禁替用户说话，严禁输出任何用户可能说的话。";
      
      if (persona.hasBlockedUser) {
        blockInstruction += "\n【当前状态】你（AI）拉黑了用户。你可以根据用户的态度决定是否原谅TA。如果原谅了，请回复中包含 [ACTION:UNBLOCK]。如果不想聊了，包含 [ACTION:HANGUP]。";
      } else if (persona.isBlockedByUser) {
        blockInstruction += "\n【当前状态】用户拉黑了你（AI）。你正在主动给用户打电话求和/道歉/质问。";
      }

      const response = await fetchAiResponse(prompt, context, persona, apiSettings, worldbook, userProfile, aiRef, false, blockInstruction);
      let text = response.responseText.trim();

      if (text.includes('[ACTION:HANGUP]')) {
        setStatus('ended');
        setTimeout(() => onEndCall(duration, false), 2000);
        return;
      }

      if (text.includes('[ACTION:UNBLOCK]')) {
        text = text.replace('[ACTION:UNBLOCK]', '').trim();
        setPersonas(prev => prev.map(p => p.id === persona.id ? { ...p, hasBlockedUser: false } : p));
      }

      setMessages(prev => [...prev, { role: 'ai', text }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const formatDurationStr = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 z-50 flex flex-col bg-gray-900 text-white"
    >
      {/* Top Section: Avatar & Name */}
      <div className="flex-1 flex flex-col items-center justify-center pt-12 pb-8">
        <motion.div 
          animate={status === 'ringing' ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="relative mb-6"
        >
          <img 
            src={persona.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} 
            alt={persona.name} 
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-700 shadow-2xl"
          />
          {status === 'connected' && (
            <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-2 border-gray-900 animate-pulse"></div>
          )}
        </motion.div>
        
        <h2 className="text-3xl font-light mb-2">{persona.name}</h2>
        
        <div className="text-gray-400 text-lg h-8">
          {status === 'ringing' && type === 'incoming' && '来电...'}
          {status === 'ringing' && type === 'outgoing' && '正在呼叫...'}
          {status === 'connected' && formatDurationStr(duration)}
          {status === 'ended' && '通话结束'}
        </div>
      </div>

      {/* Middle Section: Subtitles (Chat) */}
      {status === 'connected' && (
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`text-xs text-gray-500 mb-1`}>{msg.role === 'user' ? '你' : persona.name}</div>
              <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex flex-col items-start">
              <div className="text-xs text-gray-500 mb-1">{persona.name}</div>
              <div className="px-4 py-2 rounded-2xl bg-gray-800 text-gray-200 flex gap-1 items-center h-10">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Bottom Section: Controls */}
      <div className="pb-safe pt-4 px-8 bg-gray-900/80 backdrop-blur-lg">
        {status === 'connected' && (
          <form onSubmit={handleSendMessage} className="mb-6 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="输入你想说的话..."
              className="flex-1 bg-gray-800 border-none rounded-full px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="bg-blue-600 text-white p-3 rounded-full disabled:opacity-50"
            >
              <MessageSquare size={20} />
            </button>
          </form>
        )}

        <div className="flex justify-around items-center mb-8">
          {status === 'ringing' && type === 'incoming' ? (
            <>
              <button onClick={handleDecline} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                <PhoneOff size={28} className="text-white" />
              </button>
              <button onClick={handleAccept} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 animate-bounce">
                <Phone size={28} className="text-white" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                disabled={status !== 'connected'}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button 
                onClick={handleEndCall} 
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
              >
                <PhoneOff size={28} className="text-white" />
              </button>
              <button 
                onClick={() => setIsSpeaker(!isSpeaker)} 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isSpeaker ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                disabled={status !== 'connected'}
              >
                {isSpeaker ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
