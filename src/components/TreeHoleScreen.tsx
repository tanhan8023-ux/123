import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, MessageCircle, Send, RefreshCw, Plus, X, Bell, UserPlus, Trash2, Reply, RotateCcw, Copy } from 'lucide-react';
import { TreeHolePost, Persona, UserProfile, ApiSettings, WorldbookSettings, TreeHoleComment, TreeHoleNotification, TreeHoleMessage, ThemeSettings } from '../types';
import { generateId } from '../utils/id';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAiResponse } from '../services/aiService';
import { GoogleGenAI } from '@google/genai';

interface Props {
  userProfile: UserProfile;
  personas: Persona[];
  posts: TreeHolePost[];
  setPosts: React.Dispatch<React.SetStateAction<TreeHolePost[]>>;
  notifications: TreeHoleNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<TreeHoleNotification[]>>;
  apiSettings: ApiSettings;
  worldbook: WorldbookSettings;
  aiRef: React.MutableRefObject<GoogleGenAI | null>;
  onBack: () => void;
  onStartChat: (npcId: string, npcName: string, npcAvatar: string, context?: string, authorPersona?: string) => void;
  onAddWechat: (npcId: string, npcName: string, npcAvatar: string, intro?: string) => void;
  privateChats: Record<string, TreeHoleMessage[]>;
  setPrivateChats: React.Dispatch<React.SetStateAction<Record<string, TreeHoleMessage[]>>>;
  theme: ThemeSettings;
}

const RANDOM_NAMES = ['匿名小猫', '忧郁的云', '深海里的鱼', '夜行者', '不知名的路人', '星空下的梦', '流浪的诗人', '午后的红茶', '月光下的猫', '孤独的旅人'];
const RANDOM_AVATARS = [
  'https://picsum.photos/seed/th1/100/100',
  'https://picsum.photos/seed/th2/100/100',
  'https://picsum.photos/seed/th3/100/100',
  'https://picsum.photos/seed/th4/100/100',
  'https://picsum.photos/seed/th5/100/100',
  'https://picsum.photos/seed/th6/100/100',
  'https://picsum.photos/seed/th7/100/100',
  'https://picsum.photos/seed/th8/100/100',
];

const MBTI_TYPES = ['ISTJ', 'ISFJ', 'INFJ', 'INTJ', 'ISTP', 'ISFP', 'INFP', 'INTP', 'ESTP', 'ESFP', 'ENFP', 'ENTP', 'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'];
const ZODIAC_SIGNS = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];

const RANDOM_COMMENTS = [
  '抱抱你', '一切都会好起来的', '感同身受', '加油！', '摸摸头', 
  '这个世界还是很美好的', '不要难过啦', '我也经历过类似的事情', 
  '早点休息', '多喝热水', '去吃顿好吃的吧', '明天又是新的一天',
  '哈哈哈哈', '确实', '太真实了', '扎心了老铁', '围观', '不明觉厉'
];

export function TreeHoleScreen({ userProfile, personas, posts, setPosts, notifications, setNotifications, apiSettings, worldbook, aiRef, onBack, onStartChat, onAddWechat, privateChats, setPrivateChats, theme }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChatNpcInfo, setActiveChatNpcInfo] = useState<{id: string, name: string, avatar: string} | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  
  const [activePostIdForComment, setActivePostIdForComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyToName, setReplyToName] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'posts' | 'messages'>('posts');
  const [messageTab, setMessageTab] = useState<'chats' | 'notifications'>('chats');

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Generate random persona traits
    const mbti = MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
    const zodiac = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
    const personaTraits = `${mbti} ${zodiac}`;
    
    // Generate post content via AI
    const prompt = `请模拟一个具有 ${mbti} 人格且是 ${zodiac} 的人，在匿名树洞发一条帖子。
要求：
1. 内容要符合该性格特质（例如INFP比较感性，ENTJ比较强势等）。
2. 话题可以是生活吐槽、情感宣泄、哲学思考、日常分享等。
3. 字数在20-100字之间。
4. 语气自然，不要出现“我是xxx人格”这种自我介绍。
5. 只要返回帖子内容，不要包含任何解释。`;

    let content = '';
    try {
      // Use a temporary persona for generation
      const tempPersona: Persona = {
        id: 'temp_gen',
        name: 'Generator',
        avatarUrl: '',
        instructions: '你是一个文案生成助手。',
        prompt: '请直接输出文案内容。'
      };

      const aiResponse = await fetchAiResponse(
        prompt,
        [],
        tempPersona,
        apiSettings,
        worldbook,
        userProfile,
        aiRef,
        false,
        "",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );
      
      content = aiResponse.responseText;
      
      // Clean up potential quotes or extra text
      content = (content || '').replace(/^["']|["']$/g, '').trim();
    } catch (e) {
      console.error("Failed to generate post content", e);
      // Fallback content
      content = [
        '突然好想吃火锅，有人一起吗？',
        '刚刚看了一场电影，哭得稀里哗啦的。',
        '生活总是在不经意间给你一个惊喜，或者一个惊吓。',
        '今天的夕阳好美，可惜身边没有人分享。',
        '努力工作的意义是什么呢？',
        '我想去一个没有人认识我的地方旅行。'
      ][Math.floor(Math.random() * 6)];
    }

    const commentCount = Math.floor(Math.random() * 5); // 0-4 comments
    const newComments: TreeHoleComment[] = [];
    
    for (let i = 0; i < commentCount; i++) {
      newComments.push({
        id: generateId(),
        authorId: 'th_npc_' + generateId() + '_c_' + i,
        authorName: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)],
        authorAvatar: RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)],
        text: RANDOM_COMMENTS[Math.floor(Math.random() * RANDOM_COMMENTS.length)],
        likes: Math.floor(Math.random() * 10),
        createdAt: Date.now() - Math.floor(Math.random() * 3600000),
      });
    }

    const newPost: TreeHolePost = {
      id: generateId(),
      authorId: 'th_npc_' + generateId(),
      authorName: RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)],
      authorAvatar: RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)],
      authorPersona: personaTraits,
      content: content,
      likes: Math.floor(Math.random() * 100),
      comments: newComments,
      createdAt: Date.now(),
    };
    setPosts(prev => [newPost, ...prev]);
    setIsRefreshing(false);
  };

  const handleLike = (id: string) => {
    setPosts(prev => prev.map(p => 
      p.id === id ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked } : p
    ));
  };

  const handleLikeComment = (postId: string, commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return {
        ...p,
        comments: p.comments.map(c => 
          c.id === commentId ? { ...c, likes: c.isLiked ? c.likes - 1 : c.likes + 1, isLiked: !c.isLiked } : c
        )
      };
    }));
  };

  const handleOpenChat = (id: string, name: string, avatar: string, context?: string, authorPersona?: string) => {
    // If context is not provided (e.g. from post list), construct it
    let fullContext = context;
    if (context && !context.startsWith('你')) {
       // It's likely just the post content passed from the post list button
       fullContext = `你之前发了一个帖子，内容是：“${context}”。用户是因为看到这个帖子才来找你私聊的。请根据这个帖子内容进行回复，不要忘记你发过这个帖子。`;
    }
    
    onStartChat(id, name, avatar, fullContext, authorPersona);
    setActiveChatNpcInfo({id, name, avatar});
  };

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    
    const newPost: TreeHolePost = {
      id: generateId(),
      authorId: 'user',
      authorName: '匿名用户',
      authorAvatar: userProfile.avatarUrl || 'https://picsum.photos/seed/user/100/100',
      content: newPostContent,
      likes: 0,
      comments: [],
      createdAt: Date.now(),
    };
    
    setPosts(prev => [newPost, ...prev]);
    setNewPostContent('');
    setShowCreatePost(false);
    
    // Simulate random NPC interactions
    const interactionCount = Math.floor(Math.random() * 8); // 0 to 7 interactions
    
    for (let i = 0; i < interactionCount; i++) {
      const delay = Math.random() * 60000 + 2000; // 2s to 60s delay
      
      setTimeout(async () => {
        const npcName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
        const npcAvatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
        const npcId = 'th_npc_' + generateId();
        
        // Randomly decide between like or comment (30% comment, 70% like)
        const isComment = Math.random() > 0.7;
        
        if (!isComment) {
          setPosts(prev => prev.map(p => p.id === newPost.id ? { ...p, likes: p.likes + 1 } : p));
          setNotifications(prev => [{
            id: generateId(),
            type: 'like',
            postId: newPost.id,
            authorName: npcName,
            authorAvatar: npcAvatar,
            createdAt: Date.now(),
            isRead: false
          }, ...prev]);
        } else {
          const mbti = MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
          const zodiac = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
          const personaTraits = `${mbti} ${zodiac}`;

          const tempPersona: Persona = {
            id: npcId,
            name: npcName,
            avatarUrl: npcAvatar,
            instructions: `你是一个在匿名树洞里评论的陌生人，性格是${personaTraits}。你看到一个帖子内容是：“${newPostContent}”。请给出一个简短、真实、像真人的评论，并体现出你的性格特质。不要透露你是AI。`,
            prompt: `请以匿名树洞用户的身份给出一个简短的评论（20字以内）。`
          };
          
          try {
            const aiResponse = await fetchAiResponse(
              newPostContent,
              [],
              tempPersona,
              apiSettings,
              worldbook,
              userProfile,
              aiRef,
              false,
              "",
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              true
            );
            
            const cleanedReply = (aiResponse.responseText || '').replace(/\[ID:\s*[^\]]+\]/gi, '').trim();
            
            const newComment: TreeHoleComment = {
              id: generateId(),
              authorId: npcId,
              authorName: npcName,
              authorAvatar: npcAvatar,
              text: cleanedReply,
              likes: 0,
              createdAt: Date.now(),
            };
            
            setPosts(prev => prev.map(p => 
              p.id === newPost.id ? { ...p, comments: [...p.comments, newComment] } : p
            ));
  
            setNotifications(prev => [{
              id: generateId(),
              type: 'comment',
              postId: newPost.id,
              authorName: npcName,
              authorAvatar: npcAvatar,
              text: cleanedReply,
              createdAt: Date.now(),
              isRead: false
            }, ...prev]);
          } catch (e) {
            console.error("Failed to generate NPC reply", e);
          }
        }
      }, delay);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !activePostIdForComment) return;
    
    const currentPostId = activePostIdForComment;
    const currentReplyToName = replyToName;
    const currentCommentText = commentText;

    const newComment: TreeHoleComment = {
      id: generateId(),
      authorId: 'user',
      authorName: '我',
      authorAvatar: userProfile.avatarUrl || 'https://picsum.photos/seed/user/100/100',
      text: currentCommentText,
      likes: 0,
      replyToName: currentReplyToName || undefined,
      createdAt: Date.now(),
    };
    
    setPosts(prev => prev.map(p => 
      p.id === currentPostId ? { ...p, comments: [...p.comments, newComment] } : p
    ));
    
    setCommentText('');
    setReplyToName(null);
    
    // Check if replying to an NPC and trigger potential response
    if (currentReplyToName) {
      // Find the comment being replied to to get authorId
      const post = posts.find(p => p.id === currentPostId);
      const targetComment = post?.comments.find(c => c.authorName === currentReplyToName);
      
      if (targetComment && targetComment.authorId.startsWith('th_npc_')) {
        // NPC decides whether to reply
        const npcId = targetComment.authorId;
        const npcName = targetComment.authorName;
        const npcAvatar = targetComment.authorAvatar;
        
        // Try to find existing persona or generate random traits
        const mbti = MBTI_TYPES[Math.floor(Math.random() * MBTI_TYPES.length)];
        const zodiac = ZODIAC_SIGNS[Math.floor(Math.random() * ZODIAC_SIGNS.length)];
        const personaTraits = `${mbti} ${zodiac}`;

        const tempPersona: Persona = {
          id: npcId,
          name: npcName,
          avatarUrl: npcAvatar,
          instructions: `你是一个在匿名树洞里评论的陌生人，性格是${personaTraits}。你之前评论了：“${targetComment.text}”。现在有人回复你：“${currentCommentText}”。请决定是否回复他。如果不想回复，请直接返回 "IGNORE"。如果想回复，请直接返回回复内容，语气自然。不要透露你是AI。`,
          prompt: `请以匿名树洞用户的身份回复这条评论（20字以内），或者返回 IGNORE。`
        };

        setTimeout(async () => {
          try {
            const aiResponse = await fetchAiResponse(
              currentCommentText,
              [],
              tempPersona,
              apiSettings,
              worldbook,
              userProfile,
              aiRef,
              false,
              "",
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              true
            );
            
            const cleanedReply = (aiResponse.responseText || '').replace(/\[ID:\s*[^\]]+\]/gi, '').trim();

            if (cleanedReply === 'IGNORE' || cleanedReply.includes('IGNORE')) {
              return;
            }
            
            const npcReplyComment: TreeHoleComment = {
              id: generateId(),
              authorId: npcId,
              authorName: npcName,
              authorAvatar: npcAvatar,
              text: cleanedReply,
              likes: 0,
              replyToName: '我',
              createdAt: Date.now(),
            };

            setPosts(prev => prev.map(p => 
              p.id === currentPostId ? { ...p, comments: [...p.comments, npcReplyComment] } : p
            ));

            setNotifications(prev => [{
              id: generateId(),
              type: 'comment',
              postId: currentPostId,
              authorName: npcName,
              authorAvatar: npcAvatar,
              text: cleanedReply,
              createdAt: Date.now(),
              isRead: false
            }, ...prev]);

          } catch (e) {
            console.error("Failed to generate NPC reply back", e);
          }
        }, Math.random() * 5000 + 2000); // 2-7s delay
      }
    }
  };

  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [revealedRecalledIds, setRevealedRecalledIds] = useState<string[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<TreeHoleMessage | null>(null);

  const handleDeleteMessage = (msgId: string) => {
    if (!activeChatNpcInfo) return;
    setPrivateChats(prev => ({
      ...prev,
      [activeChatNpcInfo.id]: prev[activeChatNpcInfo.id].filter(m => m.id !== msgId)
    }));
    setActiveMessageId(null);
  };

  const handleRecallMessage = (msgId: string) => {
    if (!activeChatNpcInfo) return;
    const chat = privateChats[activeChatNpcInfo.id];
    const msg = chat?.find(m => m.id === msgId);
    if (!msg) return;

    // Safety check: only allow recall within 2 minutes
    if (Date.now() - msg.time > 120000) {
      alert('超过2分钟的消息不能撤回');
      setActiveMessageId(null);
      return;
    }

    setPrivateChats(prev => ({
      ...prev,
      [activeChatNpcInfo.id]: prev[activeChatNpcInfo.id].map(m => 
        m.id === msgId ? { ...m, isRecalled: true } : m
      )
    }));
    setActiveMessageId(null);
  };

  const handleReplyToMessage = (msg: TreeHoleMessage) => {
    setReplyToMessage(msg);
    setActiveMessageId(null);
  };

  // Fix missing IDs for legacy messages
  useEffect(() => {
    if (!activeChatNpcInfo) return;
    
    setPrivateChats(prev => {
      const chat = prev[activeChatNpcInfo.id];
      if (!chat) return prev;
      
      const needsUpdate = chat.some(m => !m.id);
      if (!needsUpdate) return prev;
      
      return {
        ...prev,
        [activeChatNpcInfo.id]: chat.map(m => m.id ? m : { ...m, id: generateId() })
      };
    });
  }, [activeChatNpcInfo]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChatNpcInfo) return;

    const newMessage: TreeHoleMessage = {
      id: generateId(),
      text: messageText,
      isMe: true,
      time: Date.now(),
      replyTo: replyToMessage ? {
        id: replyToMessage.id,
        text: replyToMessage.text,
        name: replyToMessage.isMe ? '我' : activeChatNpcInfo.name
      } : undefined
    };

    setPrivateChats(prev => ({
      ...prev,
      [activeChatNpcInfo.id]: [...(prev[activeChatNpcInfo.id] || []), newMessage]
    }));

    const currentText = messageText;
    setMessageText('');
    setReplyToMessage(null);

    // AI Response
    const npcPersona = personas.find(p => p.id === activeChatNpcInfo.id);
    if (npcPersona) {
      setIsTyping(true);
      try {
        const history = privateChats[activeChatNpcInfo.id] || [];
        
        const contactInstruction = `【功能指令】如果你决定向用户推荐微信好友，请严格使用以下格式输出：[CONTACT: 名字 | 简介]。例如：[CONTACT: 喜欢猫的女孩 | 一个温柔的铲屎官]。名字不要包含特殊符号。简介要简短。如果你不想推荐，请正常回复拒绝理由。请根据你的人设决定是否推荐。`;

        const contextMessages = history.slice(-10).map(m => ({
            role: m.isMe ? 'user' : 'assistant',
            content: m.text
        }));

        // Add timeout to AI response
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI response timeout")), 60000)
        );

        const responseText = await Promise.race([
          fetchAiResponse(
            currentText,
            contextMessages,
            npcPersona,
            apiSettings,
            worldbook,
            userProfile,
            aiRef,
            false, // Disable quote for TreeHole
            contactInstruction
          ),
          timeoutPromise
        ]) as string;

        const cleanedResponse = (responseText || '').replace(/\[ID:\s*[^\]]+\]/gi, '').trim();
        
        // Split by sentence endings (period, question mark, exclamation mark) or newlines
        // This matches the logic in ChatScreen for consistent segmentation
        const segmentsRaw = cleanedResponse.split(/([。！？\n.!?]+)/);
        const segments: string[] = [];
        
        for (let i = 0; i < segmentsRaw.length; i++) {
          const part = segmentsRaw[i];
          if (!part.trim() && !part.match(/^[。！？\n.!?]+$/)) continue;
          
          if (part.match(/^[。！？\n.!?]+$/) && segments.length > 0) {
            // Append punctuation to the previous segment
            segments[segments.length - 1] += part;
          } else if (part.trim()) {
            segments.push(part);
          }
        }
        
        const responseParts = segments.length > 0 ? segments : (cleanedResponse ? [cleanedResponse] : []);

        if (responseParts.length === 0) {
           setIsTyping(false);
           return;
        }

        // Send parts sequentially
        let delay = 0;
        responseParts.forEach((part, index) => {
           let messageText = part;
           let contactMsg: TreeHoleMessage | null = null;

           const contactMatch = part.match(/\[CONTACT:\s*([^|\]]+)(?:\|\s*([^\]]+))?\]/);
           if (contactMatch) {
             const name = contactMatch[1].trim();
             const intro = contactMatch[2]?.trim() || '一位新朋友';
             const avatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
             const contactId = 'th_contact_' + generateId();

             contactMsg = {
               id: generateId(),
               text: `[推荐名片] ${name}`,
               isMe: false,
               time: Date.now() + 100,
               type: 'contact',
               contactInfo: {
                 id: contactId,
                 name: name,
                 avatar: avatar,
                 intro: intro
               }
             };
             
             messageText = (part || '').replace(contactMatch[0], '').trim();
           }

           // Base delay + typing time simulation
           delay += Math.min(messageText.length * 50, 2000) + 500;
           
           setTimeout(() => {
             if (messageText) {
                const textMsg: TreeHoleMessage = {
                  id: generateId(),
                  text: messageText,
                  isMe: false,
                  time: Date.now()
                };
                setPrivateChats(prev => ({
                  ...prev,
                  [activeChatNpcInfo.id]: [...(prev[activeChatNpcInfo.id] || []), textMsg]
                }));
             }

             if (contactMsg) {
                setTimeout(() => {
                    setPrivateChats(prev => ({
                      ...prev,
                      [activeChatNpcInfo.id]: [...(prev[activeChatNpcInfo.id] || []), contactMsg!]
                    }));
                }, 500);
             }
             
             // Only stop typing indicator after last message
             if (index === responseParts.length - 1) {
               setIsTyping(false);
             }
           }, delay);
        });

      } catch (e) {
        console.error("TreeHole AI response error:", e);
        setIsTyping(false);
      }
    }
  };

  const chatList = Object.entries(privateChats).map(([id, msgs]) => {
    const persona = personas.find(p => p.id === id);
    const npcName = persona?.name || '未知用户';
    const npcAvatar = persona?.avatarUrl || RANDOM_AVATARS[0];
    const lastMsg = msgs[msgs.length - 1];
    
    return {
      id,
      name: npcName,
      avatar: npcAvatar,
      lastMsg: lastMsg?.text || '',
      time: lastMsg?.time || 0
    };
  }).sort((a, b) => b.time - a.time);

  const markNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  useEffect(() => {
    if (viewMode === 'messages' && messageTab === 'notifications') {
      markNotificationsAsRead();
    }
  }, [viewMode, messageTab]);

  return (
    <div 
      className={`w-full h-full bg-neutral-50 flex flex-col overflow-hidden relative`}
      style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1">
            <ArrowLeft className="w-6 h-6 text-neutral-800" />
          </button>
          <h1 className="text-lg font-bold text-neutral-900">匿名树洞</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setViewMode(viewMode === 'posts' ? 'messages' : 'posts');
            }}
            className={`p-2 rounded-full transition-colors relative ${viewMode === 'messages' ? 'bg-blue-50 text-blue-500' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            )}
          </button>
          <button 
            onClick={() => setShowCreatePost(true)}
            className="p-2 rounded-full bg-blue-500 text-white shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button 
            onClick={handleRefresh}
            className={`p-2 rounded-full hover:bg-neutral-100 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw className="w-5 h-5 text-neutral-600" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'posts' ? (
          /* Posts List */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  id={`post-${post.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100 transition-colors duration-500"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={post.authorAvatar} 
                      className="w-10 h-10 rounded-full object-cover bg-neutral-200" 
                      alt="avatar"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-800">{post.authorName}</div>
                      <div className="text-[10px] text-neutral-400">
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-neutral-700 text-sm leading-relaxed mb-4">
                    {post.content}
                  </p>

                  {/* Comments Section */}
                  {post.comments.length > 0 && (
                    <div className="mb-4 space-y-3 bg-neutral-50 rounded-xl p-3">
                      {post.comments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className="flex gap-2 cursor-pointer active:bg-neutral-100 rounded-lg p-1 transition-colors"
                          onClick={() => {
                            setActivePostIdForComment(post.id);
                            setReplyToName(comment.authorName);
                            setCommentText(`@${comment.authorName} `);
                          }}
                        >
                          <img src={comment.authorAvatar} className="w-6 h-6 rounded-full shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <span className="text-xs font-semibold text-neutral-700">
                                {comment.authorName}
                                {comment.replyToName && (
                                  <span className="font-normal text-neutral-400 ml-1">回复 @{comment.replyToName}</span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenChat(comment.authorId, comment.authorName, comment.authorAvatar, `你之前在帖子“${post.content.substring(0, 20)}...”下发了一条评论：“${comment.text}”。用户看到这条评论后私信了你。`);
                                  }}
                                  className="text-[10px] text-neutral-400 hover:text-blue-500"
                                >
                                  私信
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLikeComment(post.id, comment.id);
                                  }}
                                  className={`flex items-center gap-0.5 text-[10px] ${comment.isLiked ? 'text-red-500' : 'text-neutral-400'}`}
                                >
                                  <Heart className={`w-3 h-3 ${comment.isLiked ? 'fill-current' : ''}`} />
                                  <span>{comment.likes}</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-neutral-600 mt-0.5">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-3 border-t border-neutral-50">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${post.isLiked ? 'text-red-500' : 'text-neutral-500'}`}
                    >
                      <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                      <span>{post.likes}</span>
                    </button>
                    <button 
                      onClick={() => setActivePostIdForComment(post.id)}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>评论</span>
                    </button>
                    <button 
                      onClick={() => handleOpenChat(post.authorId, post.authorName, post.authorAvatar, Array.isArray(post.content) ? post.content.join('\n') : post.content, post.authorPersona)}
                      className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-500 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      <span>私信</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Messages View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Message Tabs */}
            <div className="bg-white flex border-b border-neutral-100 shrink-0">
              <button 
                onClick={() => setMessageTab('chats')}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${messageTab === 'chats' ? 'text-blue-500' : 'text-neutral-500'}`}
              >
                私信列表
                {messageTab === 'chats' && <motion.div layoutId="msgTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </button>
              <button 
                onClick={() => setMessageTab('notifications')}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${messageTab === 'notifications' ? 'text-blue-500' : 'text-neutral-500'}`}
              >
                消息通知
                {unreadNotificationsCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">{unreadNotificationsCount}</span>}
                {messageTab === 'notifications' && <motion.div layoutId="msgTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {messageTab === 'chats' ? (
                /* Chat List */
                <div className="divide-y divide-neutral-50">
                  {chatList.length > 0 ? (
                    chatList.map((chat) => (
                      <button 
                        key={chat.id}
                        onClick={() => setActiveChatNpcInfo({id: chat.id, name: chat.name, avatar: chat.avatar})}
                        className="w-full p-4 flex gap-3 hover:bg-neutral-50 transition-colors text-left"
                      >
                        <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-neutral-900">{chat.name}</span>
                            <span className="text-[10px] text-neutral-400">{new Date(chat.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-neutral-500 truncate">{chat.lastMsg}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <p className="text-sm text-neutral-400">暂无私信，去树洞找人聊聊吧</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Notifications List */
                <div className="divide-y divide-neutral-50">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className="p-4 flex gap-3 bg-white cursor-pointer active:bg-neutral-50 transition-colors"
                        onClick={() => {
                          setViewMode('posts');
                          setTimeout(() => {
                            const element = document.getElementById(`post-${notif.postId}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              element.classList.add('bg-blue-50');
                              setTimeout(() => element.classList.remove('bg-blue-50'), 2000);
                            }
                          }, 300);
                        }}
                      >
                        <img src={notif.authorAvatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-bold text-neutral-900">{notif.authorName}</span>
                            <span className="text-[10px] text-neutral-400">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-neutral-600">
                            {notif.type === 'like' ? '赞了你的树洞' : `评论了你：${notif.text}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <p className="text-sm text-neutral-400">暂无消息通知</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 text-center shrink-0">
        <p className="text-[10px] text-neutral-400">在这里，你可以倾诉任何不愿对熟人说的话</p>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end"
            onClick={() => setShowCreatePost(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full bg-white rounded-t-[2rem] p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-neutral-900">发布树洞</h2>
                <button onClick={() => setShowCreatePost(false)} className="p-2 text-neutral-400">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="这一刻的想法..."
                className="w-full h-32 bg-neutral-50 rounded-2xl p-4 text-sm outline-none resize-none mb-4"
                autoFocus
              />
              <button 
                onClick={handleCreatePost}
                disabled={!newPostContent.trim()}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold disabled:opacity-50 transition-opacity"
              >
                发布
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Input Modal */}
      <AnimatePresence>
        {activePostIdForComment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/20 flex items-end"
            onClick={() => setActivePostIdForComment(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full bg-white p-4 flex items-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <input 
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="写下你的评论..."
                className="flex-1 bg-neutral-100 rounded-full px-4 py-2 text-sm outline-none"
                autoFocus
              />
              <button 
                onClick={handleAddComment}
                disabled={!commentText.trim()}
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
              >
                <Send className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Private Chat Overlay */}
      <AnimatePresence>
        {activeChatNpcInfo && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`absolute inset-0 z-50 bg-neutral-50 flex flex-col ${theme.showStatusBar !== false ? 'pt-14' : 'pt-12'}`}
          >
            <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-neutral-100 shrink-0">
              <button onClick={() => setActiveChatNpcInfo(null)} className="p-1 -ml-1">
                <ArrowLeft className="w-6 h-6 text-neutral-800" />
              </button>
              <img src={activeChatNpcInfo.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-neutral-900 truncate">{activeChatNpcInfo.name}</div>
                <div className="text-[10px] text-green-500">在线</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(privateChats[activeChatNpcInfo.id] || []).map((msg, i) => {
                // Check for wxid_ pattern
                const wxidMatch = msg.text.match(/wxid_[a-zA-Z0-9]+/);
                const hasWxid = !!wxidMatch;
                const isRecalled = msg.isRecalled;
                
                return (
                  <div key={msg.id || i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} relative group`}>
                    {isRecalled ? (
                      <div className="flex flex-col items-center w-full my-1 gap-2">
                        <div 
                          className="text-xs text-neutral-400 bg-neutral-100 px-3 py-1 rounded-full cursor-pointer active:opacity-70"
                          onClick={() => {
                            if (msg.id) {
                              if (revealedRecalledIds.includes(msg.id)) {
                                setRevealedRecalledIds(prev => prev.filter(id => id !== msg.id));
                              } else {
                                setRevealedRecalledIds(prev => [...prev, msg.id]);
                              }
                            }
                          }}
                        >
                          {msg.isMe ? '你' : '对方'}撤回了一条消息 (点击{msg.id && revealedRecalledIds.includes(msg.id) ? '隐藏' : '查看'})
                        </div>
                        
                        {/* Revealed Recalled Message Box */}
                        {msg.id && revealedRecalledIds.includes(msg.id) && (
                          <div 
                            className="bg-neutral-100 border border-neutral-200 rounded-xl p-3 max-w-[80%] text-[14px] text-neutral-600 shadow-sm cursor-pointer active:bg-neutral-200 transition-colors"
                            onClick={() => setRevealedRecalledIds(prev => prev.filter(id => id !== msg.id))}
                          >
                            <div className="flex items-center gap-1 mb-1 text-[11px] text-neutral-400 font-medium">
                              <RotateCcw size={12} />
                              已撤回的内容
                            </div>
                            <div className="break-words">
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div 
                          className={`max-w-[75%] relative`}
                          onClick={() => setActiveMessageId(activeMessageId === msg.id ? null : msg.id)}
                        >
                           {/* Reply Context */}
                           {msg.replyTo && (
                             <div className={`text-xs mb-1 px-2 py-1 rounded-lg opacity-70 ${
                               msg.isMe ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-500'
                             }`}>
                               <span className="font-bold">{msg.replyTo.name}:</span> {msg.replyTo.text.substring(0, 20)}{msg.replyTo.text.length > 20 ? '...' : ''}
                             </div>
                           )}

                           {msg.type === 'contact' && msg.contactInfo ? (
                             <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-100 w-64">
                               <div className="p-3 flex gap-3 items-center border-b border-neutral-50">
                                 <img src={msg.contactInfo.avatar} className="w-10 h-10 rounded-full bg-neutral-100 object-cover" alt="" />
                                 <div className="flex-1 min-w-0">
                                   <div className="font-bold text-sm text-neutral-900">{msg.contactInfo.name}</div>
                                   <div className="text-xs text-neutral-500 truncate">{msg.contactInfo.intro}</div>
                                 </div>
                               </div>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   onAddWechat(msg.contactInfo!.id, msg.contactInfo!.name, msg.contactInfo!.avatar, msg.contactInfo!.intro);
                                 }}
                                 className="w-full py-2 text-xs text-blue-500 font-medium hover:bg-neutral-50 transition-colors"
                               >
                                 添加好友
                               </button>
                             </div>
                           ) : (
                             <div className={`p-3 rounded-2xl text-sm break-words relative ${
                               msg.isMe ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white text-neutral-800 rounded-tl-none shadow-sm'
                             } ${msg.isRecalled ? 'opacity-80' : ''}`}>
                               {msg.text}
                               {msg.isRecalled && (
                                 <div className="text-[10px] opacity-50 mt-1 flex items-center gap-1">
                                   <RotateCcw size={10} /> 已撤回的消息
                                 </div>
                               )}
                             </div>
                           )}

                           {/* Context Menu */}
                           {activeMessageId === msg.id && (
                             <div className={`absolute z-10 ${msg.isMe ? 'right-0' : 'left-0'} -bottom-12 flex bg-white shadow-lg rounded-lg overflow-hidden border border-neutral-100 min-w-[120px]`}>
                               <button onClick={(e) => { e.stopPropagation(); handleReplyToMessage(msg); }} className="p-2 hover:bg-neutral-50 text-neutral-600 flex-1 flex justify-center">
                                 <Reply size={16} />
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.text); setActiveMessageId(null); }} className="p-2 hover:bg-neutral-50 text-neutral-600 flex-1 flex justify-center">
                                 <Copy size={16} />
                               </button>
                               <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="p-2 hover:bg-neutral-50 text-red-500 flex-1 flex justify-center">
                                 <Trash2 size={16} />
                               </button>
                               {msg.isMe && (Date.now() - msg.time < 120000) && ( // 2 mins recall limit
                                 <button onClick={(e) => { e.stopPropagation(); handleRecallMessage(msg.id); }} className="p-2 hover:bg-neutral-50 text-neutral-600 flex-1 flex justify-center">
                                   <RotateCcw size={16} />
                                 </button>
                               )}
                             </div>
                           )}
                        </div>
                        {!msg.isMe && hasWxid && (
                          <button 
                            onClick={() => onAddWechat(activeChatNpcInfo.id, activeChatNpcInfo.name, activeChatNpcInfo.avatar)}
                            className="mt-2 bg-green-500 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 active:opacity-80"
                          >
                            <UserPlus size={12} />
                            添加对方微信
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-neutral-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-neutral-100 flex flex-col gap-2">
              {replyToMessage && (
                <div className="flex items-center justify-between bg-neutral-50 p-2 rounded-lg text-xs text-neutral-500">
                  <div className="flex items-center gap-2">
                    <Reply size={14} />
                    <span>回复 {replyToMessage.isMe ? '我' : activeChatNpcInfo.name}: {replyToMessage.text.substring(0, 20)}...</span>
                  </div>
                  <button onClick={() => setReplyToMessage(null)}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="发送私信..."
                  className="flex-1 bg-neutral-100 rounded-full px-4 py-2 text-sm outline-none"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

