import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Minimize2, X, Plus } from 'lucide-react';
import { Message, Persona, UserProfile } from '../types';
import { TransferCard } from './TransferCard';

interface ChatBubbleProps {
  listeningWith: Persona;
  chatMessages: Message[];
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  userProfile?: UserProfile;
  handleSendMessage: (text: string) => void;
  isCommentaryLoading: boolean;
  onClose: () => void;
}

export const ChatBubble = React.memo(function ChatBubble({
  listeningWith,
  chatMessages,
  isMinimized,
  setIsMinimized,
  userProfile,
  handleSendMessage,
  isCommentaryLoading,
  onClose
}: ChatBubbleProps) {
  const [messageText, setMessageText] = React.useState('');
  const [showChatMenu, setShowChatMenu] = React.useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      key={isMinimized ? "minimized" : "expanded"}
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`absolute z-[100] will-change-transform ${
        isMinimized
          ? "w-12 h-12 rounded-full bg-black/60 border border-white/20 shadow-xl flex items-center justify-center cursor-pointer"
          : "w-[280px] bg-black/80 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      }`}
      style={{
        maxHeight: isMinimized ? '48px' : '300px',
        top: '50%',
        left: '50%',
        x: '-50%',
        y: '-50%'
      }}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {isMinimized ? (
        <div className="w-full h-full rounded-full overflow-hidden p-0.5" onClick={() => setIsMinimized(false)}>
          <img
            src={listeningWith.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listeningWith.name}`}
            alt={listeningWith.name}
            className="w-full h-full rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <>
          <div className="h-8 w-full bg-white/5 flex items-center justify-between px-3 cursor-move active:cursor-grabbing border-b border-white/5">
            <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">聊天</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                <Minimize2 className="w-3 h-3" />
              </button>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-hide space-y-3 p-3" onPointerDown={(e) => e.stopPropagation()}>
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/20 shadow-md">
                  <img
                    src={msg.role === 'user'
                      ? (userProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'User'}`)
                      : (listeningWith.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listeningWith.name}`)
                    }
                    alt={msg.role}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className={`max-w-[80%] px-3 py-1.5 rounded-xl text-[10px] leading-relaxed relative group ${msg.role === 'user' ? 'bg-indigo-500/80 text-white rounded-tr-sm' : 'bg-white/10 backdrop-blur-md text-white/90 rounded-tl-sm border border-white/5'}`}>
                  {(() => {
                    if (msg.text.includes("【微信路线】") || msg.text.includes("金额：")) {
                      return <TransferCard text={msg.text} />;
                    }
                    // Strip hidden tags
                    const cleanText = msg.text.replace(/\|\|NEXT:[^|]+\|\|/g, '').trim();
                    const parts = cleanText.split(/(\[STICKER:\s*[^\]]+\])/g);
                    return parts.map((part, i) => {
                      const match = part.match(/\[STICKER:\s*([^\]]+)\]/);
                      if (match) {
                        let src = match[1].trim();
                        if (!src.startsWith('http') && !src.startsWith('data:')) {
                           if (src === 'image') {
                              return <span key={i} className="text-[10px] opacity-50">[图片]</span>;
                           }
                           src = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(src)}`;
                        }
                        return (
                          <img 
                            key={i}
                            src={src} 
                            alt="Sticker" 
                            className="w-24 h-24 rounded-lg object-contain bg-white/10 my-1 inline-block"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        );
                      }
                      return <span key={i} className="break-words break-all whitespace-pre-wrap">{part}</span>;
                    });
                  })()}
                </div>
              </div>
            ))}
            {isCommentaryLoading && (
              <div className="text-[10px] text-white/40 italic">正在输入...</div>
            )}
          </div>
          <div className="p-2 border-t border-white/10 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <div className="relative">
              <button 
                onClick={() => setShowChatMenu(!showChatMenu)}
                className={`p-1.5 rounded-full transition-colors ${showChatMenu ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
              >
                <Plus className="w-4 h-4" />
              </button>
              
              <AnimatePresence>
                {showChatMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        setShowChatMenu(false);
                        const prompt = window.prompt("想要什么样的表情包？(例如：开心的猫咪)");
                        if (prompt) {
                          handleSendMessage(`给我发一个表情包：${prompt}`);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <span>🖼️</span>
                      求表情包
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && messageText.trim()) {
                  handleSendMessage(messageText);
                  setMessageText('');
                }
              }}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-500/50"
              placeholder="输入消息..."
            />
          </div>
        </>
      )}
    </motion.div>
  );
});
