import React, { useState, useEffect, useRef } from 'react';
import localforage from 'localforage';
import { Phone as PhoneIcon } from 'lucide-react';
import { Phone } from './components/Phone';
import { HomeScreen } from './components/HomeScreen';
import { PersonaScreen } from './components/PersonaScreen';
import { ApiSettingsScreen } from './components/ApiSettingsScreen';
import { ChatScreen } from './components/ChatScreen';
import { LockScreen } from './components/LockScreen';
import { ThemeSettingsScreen } from './components/ThemeSettingsScreen';
import { MusicScreen } from './components/MusicScreen';
import { XHSScreen } from './components/XHSScreen';
import { TreeHoleScreen } from './components/TreeHoleScreen';
import { TaobaoScreen } from './components/TaobaoScreen';
import { generateId } from './utils/id';
import { repairJson } from './utils';
import { FoodDeliveryScreen } from './components/FoodDeliveryScreen';
import { BartenderGame } from './components/BartenderGame';
import { AiPhonesScreen } from './components/AiPhonesScreen';
import { PhoneScreen } from './components/PhoneScreen';
import { ActiveCallScreen } from './components/ActiveCallScreen';
import { ChatBubble } from './components/ChatBubble';

const ChatBubbleWrapper = React.memo(({
  listeningWith,
  messages,
  isMinimized,
  setIsMinimized,
  userProfile,
  handleSendMessage,
  isCommentaryLoading,
  setListeningWithPersonaId
}: any) => {
  const chatMessages = React.useMemo(() => {
    return messages.filter((m: any) => m.personaId === listeningWith.id && !m.groupId && !m.theaterId);
  }, [messages, listeningWith.id]);

  const onSend = React.useCallback((text: string) => {
    handleSendMessage(text, listeningWith.id);
  }, [handleSendMessage, listeningWith.id]);

  const onClose = React.useCallback(() => {
    setListeningWithPersonaId(undefined);
  }, [setListeningWithPersonaId]);

  return (
    <ChatBubble
      listeningWith={listeningWith}
      chatMessages={chatMessages}
      isMinimized={isMinimized}
      setIsMinimized={setIsMinimized}
      userProfile={userProfile}
      handleSendMessage={onSend}
      isCommentaryLoading={isCommentaryLoading}
      onClose={onClose}
    />
  );
});

import { LoveWidgetScreen } from './components/LoveWidgetScreen';
import { PhotoAlbumScreen } from './components/PhotoAlbumScreen';
import { WalletScreen } from './components/WalletScreen';
import { VirtualMapScreen } from './components/VirtualMapScreen';
import { Screen, Persona, UserProfile, ApiSettings, ThemeSettings, Message, Moment, Song, WorldbookSettings, XHSPost, TreeHolePost, TreeHoleNotification, TreeHoleMessage, Order, Playlist, DiaryEntry, Transaction, CallRecord, GroupChat } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { storageService } from './services/storageService';
import { getPhoneData } from './services/phoneService';
import { fetchAiResponse, generatePersonaStatus, checkIfPersonaIsOffline, generateUserRemark, generateDiaryEntry, generateXHSPost, withRetry } from './services/aiService';
import { lyricService } from './services/lyricService';
import { processAiResponseParts, cleanContextMessage } from './utils/chatUtils';

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const generatingDiariesRef = useRef<Set<string>>(new Set());
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [aiPhoneRequest, setAiPhoneRequest] = useState<{msgId: string, personaId: string} | null>(null);

  // Wallet State
  const handleRecharge = (amount: number) => {
    const newTransaction: Transaction = {
      id: generateId(),
      amount,
      type: 'top_up',
      description: '充值',
      timestamp: Date.now()
    };
    setUserProfile(prev => ({
      ...prev,
      balance: (prev.balance || 0) + amount,
      transactions: [newTransaction, ...(prev.transactions || [])]
    }));
  };

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };
  const [importProgress, setImportProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [lastApiErrorTime, setLastApiErrorTime] = useState<number>(0);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    const checkOneSignal = setInterval(() => {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal && OneSignal.User && OneSignal.User.PushSubscription) {
        const id = OneSignal.User.PushSubscription.id;
        if (id) {
          console.log("OneSignal Subscription ID found:", id);
          setSubscriptionId(id);
          clearInterval(checkOneSignal);
        }
      }
    }, 1000);
    return () => clearInterval(checkOneSignal);
  }, []);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);
  const [listeningWithPersonaId, setListeningWithPersonaId] = useState<string | undefined>(undefined);
  const [listenStartTime, setListenStartTime] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [typingPersonas, setTypingPersonas] = useState<Record<string, boolean>>({});
  
  // Music Player State
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (listeningWithPersonaId) {
      setListenStartTime(Date.now());
    } else {
      setListenStartTime(null);
    }
  }, [listeningWithPersonaId]);

  // Load songs on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedSongs, storedPlaylists] = await Promise.all([
          storageService.loadAllSongs(),
          storageService.loadPlaylists()
        ]);

        if (storedSongs.length > 0) {
          setSongs(storedSongs);
        } else {
          setSongs([]);
        }

        if (storedPlaylists.length > 0) {
          setPlaylists(storedPlaylists);
        } else {
          setPlaylists([
            { id: 'default', name: '我的收藏', songIds: [], createdAt: Date.now() }
          ]);
        }
      } catch (e) {
        console.error("Failed to load music data:", e);
      }
    };
    loadData();
  }, []);

  const currentSong = songs[currentSongIndex];

  // Force load when song changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [currentSong?.id]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            if (e.name !== 'AbortError') {
              console.error("Play error:", e);
            }
          });
        }
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentSong?.id]); // 依赖中加入 currentSong?.id，确保播放状态同步

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    handleNextSong();
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextSong = () => {
    if (songs.length === 0) return;
    setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
  };

  const handlePrevSong = () => {
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    setIsPlaying(true);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleAddSong = async (newSong: Song, file: File) => {
    console.log("Adding song:", newSong);
    // Optimistic update
    setSongs(prev => {
      const newSongs = [...prev, newSong];
      setCurrentSongIndex(newSongs.length - 1);
      return newSongs;
    });
    // Ensure we play after state update
    setTimeout(() => setIsPlaying(true), 50);

    // Save initial metadata
    await storageService.saveSong(newSong, file);

    // Extract lyrics in background
    try {
      // 确保使用最新的 apiSettings
      const lyrics = await lyricService.extractLyrics(newSong.title, newSong.artist, apiSettings, worldbook, userProfile, aiRef);
      const updatedSong = { ...newSong, lyrics };
      
      setSongs(prev => prev.map(s => s.id === newSong.id ? updatedSong : s));
      await storageService.saveSong(updatedSong, file);
    } catch (e) {
      console.error("Lyric extraction failed:", e);
    }
  };

  const handleUpdateSong = async (songId: string, updates: Partial<Song>) => {
    setSongs(prev => {
      const updatedSongs = prev.map(s => s.id === songId ? { ...s, ...updates } : s);
      const updatedSong = updatedSongs.find(s => s.id === songId);
      if (updatedSong && updatedSong.source === 'local') {
        // We need the original blob to save it again, but storageService.saveSong expects a File/Blob.
        // Since we are only updating metadata here, we can just update the metadata array in storage.
        storageService.getAllMetadata().then(metadata => {
          const index = metadata.findIndex(m => m.id === songId);
          if (index >= 0) {
            metadata[index] = { ...metadata[index], ...updates };
            localforage.setItem('local_songs_metadata', metadata);
          }
        });
      }
      return updatedSongs;
    });
  };

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: generateId(),
      name,
      songIds: [],
      createdAt: Date.now()
    };
    setPlaylists(prev => {
      const updated = [...prev, newPlaylist];
      storageService.savePlaylists(updated);
      return updated;
    });
  };

  const handleAddSongToPlaylist = (songId: string, playlistId: string) => {
    setPlaylists(prev => {
      const updated = prev.map(pl => {
        if (pl.id === playlistId) {
          if (pl.songIds && pl.songIds.includes(songId)) return pl;
          return { ...pl, songIds: [...pl.songIds, songId] };
        }
        return pl;
      });
      storageService.savePlaylists(updated);
      return updated;
    });
  };

  const handleSelectSong = (index: number) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
  };

  const handleDeleteSong = (songId: string) => {
    setSongs(prev => {
      const updated = prev.filter(s => s.id !== songId);
      if (currentSongIndex >= updated.length) {
        setCurrentSongIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
    storageService.deleteSong(songId).catch(e => console.error("Failed to delete song:", e));
  };

  const handleAddPersona = (newPersona: Persona) => {
    setPersonas(prev => {
      if (prev.find(p => p.id === newPersona.id)) return prev;
      return [...prev, newPersona];
    });
  };

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '我',
    avatarUrl: '',
    anniversaryDate: ''
  });

  const [personas, setPersonas] = useState<Persona[]>([{
    id: 'p1',
    name: '猫娘不要删除',
    instructions: '你是一只可爱的猫娘，说话句尾要带“喵~”。你很粘人，喜欢撒娇。',
    prompt: '请保持猫娘的语气，每次回复不要超过50个字。',
    prompts: []
  }]);

  const listeningWith = listeningWithPersonaId ? personas.find(p => p.id === listeningWithPersonaId) : null;

  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    apiUrl: '',
    apiKey: '',
    model: 'gemini-3-flash-preview',
    voiceModel: '',
    voiceApiUrl: '',
    voiceApiKey: '',
    voiceParams: '',
    asrModel: '',
    asrApiUrl: '',
    asrApiKey: '',
    asrParams: '',
    temperature: 0.85,
  });

  const [theme, setTheme] = useState<ThemeSettings>({
    wallpaper: '',
    lockScreenWallpaper: '',
    momentsBg: '',
    iconBgColor: 'rgba(255, 255, 255, 0.9)',
    fontUrl: '',
    timeColor: '#ffffff',
    statusColor: '#ffffff',
    customIcons: {},
    musicPlayer: {
      title: '想变成你的随身听...',
      avatar1: 'https://picsum.photos/seed/avatar1/100/100',
      avatar2: 'https://picsum.photos/seed/avatar2/100/100'
    }
  });

  const [worldbook, setWorldbook] = useState<WorldbookSettings>({
    jailbreakPrompt: '',
    globalPrompt: '',
    jailbreakPrompts: [],
    globalPrompts: []
  });

  // Lifted State
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const lastNotifiedMsgId = useRef<string | null>(null);

  useEffect(() => {
    localforage.getItem<Message[]>('messages').then(m => {
      if (m) {
        setMessages(m);
        if (m.length > 0) {
          lastNotifiedMsgId.current = m[m.length - 1].id;
        }
      }
    });
  }, []);
  useEffect(() => {
    localforage.setItem('messages', messages);
  }, [messages]);
  const [moments, setMoments] = useState<Moment[]>([{
    id: 'm1',
    authorId: 'p1',
    text: '今天天气真好呀，想和你一起去散步~ 🐾 记得多穿点衣服哦！',
    timestamp: '1小时前',
    likedByIds: ['user'],
    comments: []
  }]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notification, setNotification] = useState<{title: string, body: string, personaId?: string} | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [followedAuthorIds, setFollowedAuthorIds] = useState<string[]>(['p1']);
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<string[]>([]);
  const [xhsPrivateChats, setXhsPrivateChats] = useState<Record<string, { text: string, isMe: boolean, time: number, isSystem?: boolean }[]>>({
    'p1': [
      { text: '你好呀喵~ 看到你关注我了，好开心喵！', isMe: false, time: Date.now() - 3600000 }
    ]
  });
  const [treeHolePrivateChats, setTreeHolePrivateChats] = useState<Record<string, TreeHoleMessage[]>>({});
  const [treeHolePersonas, setTreeHolePersonas] = useState<Persona[]>([]);
  const [xhsInitialActiveChatAuthorId, setXhsInitialActiveChatAuthorId] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    
    const shouldNotify = lastMessage.role === 'model' && lastMessage.id !== lastNotifiedMsgId.current && (
      document.hidden || 
      (currentScreen !== 'chat' && !isLocked) ||
      (currentScreen === 'chat' && lastMessage.groupId ? currentChatId !== lastMessage.groupId : currentChatId !== lastMessage.personaId)
    );

    if (shouldNotify) {
      // Don't notify if it's a theater message
      if (lastMessage.theaterId) return;

      lastNotifiedMsgId.current = lastMessage.id;
      const persona = personas.find(p => p.id === lastMessage.personaId);
      if (persona) {
        const title = persona.name;
        const body = lastMessage.text || (lastMessage.msgType === 'image' ? '[图片]' : '[消息]');
        
        // 1. Try Web Notifications
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                  body,
                  icon: persona.avatarUrl
                });
              }).catch(() => {
                new Notification(title, { body, icon: persona.avatarUrl });
              });
            } else {
              new Notification(title, { body, icon: persona.avatarUrl });
            }
          } catch (e) {
            console.error('Notification error:', e);
          }
        }
        
        // 2. Always update document title as a fallback indicator
        const originalTitle = document.title;
        document.title = `【新消息】${title}发来了一条消息`;
        
        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        
        // Restore title when user comes back
        const restoreTitle = () => {
          document.title = 'AI 微信'; // Or whatever the default title is
          document.removeEventListener('visibilitychange', restoreTitle);
        };
        document.addEventListener('visibilitychange', restoreTitle);
      }
    }
  }, [messages, personas, currentScreen, isLocked, currentChatId]);

  const [treeHolePosts, setTreeHolePosts] = useState<TreeHolePost[]>([
    {
      id: 'th1',
      authorId: 'th_npc_1',
      authorName: '匿名小猫',
      authorAvatar: 'https://picsum.photos/seed/th1/100/100',
      content: '今天的心情就像这天气一样，阴沉沉的。有人愿意听听我的故事吗？',
      likes: 12,
      comments: [
        {
          id: 'thc-init-1',
          authorId: 'th_npc_init_1',
          authorName: '路过的风',
          authorAvatar: 'https://picsum.photos/seed/wind/100/100',
          text: '抱抱你，愿意做你的树洞。',
          likes: 3,
          createdAt: Date.now() - 3500000,
        },
        {
          id: 'thc-init-2',
          authorId: 'th_npc_init_2',
          authorName: '温暖的太阳',
          authorAvatar: 'https://picsum.photos/seed/sun/100/100',
          text: '一切都会好起来的！',
          likes: 5,
          createdAt: Date.now() - 3400000,
        }
      ],
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'th2',
      authorId: 'th_npc_2',
      authorName: '忧郁的云',
      authorAvatar: 'https://picsum.photos/seed/th2/100/100',
      content: '如果时间可以倒流，我一定会选择在那天勇敢一点。',
      likes: 45,
      comments: [
        {
          id: 'thc-init-3',
          authorId: 'th_npc_init_3',
          authorName: '时光机',
          authorAvatar: 'https://picsum.photos/seed/time/100/100',
          text: '可惜没有如果，向前看吧。',
          likes: 8,
          createdAt: Date.now() - 7100000,
        }
      ],
      createdAt: Date.now() - 7200000,
    },
    {
      id: 'th3',
      authorId: 'th_npc_3',
      authorName: '深海里的鱼',
      authorAvatar: 'https://picsum.photos/seed/th3/100/100',
      content: '在大城市里打拼，有时候真的觉得好累。但看到窗外的灯火，又觉得还有希望。',
      likes: 89,
      comments: [],
      createdAt: Date.now() - 10800000,
    }
  ]);
  const [treeHoleNotifications, setTreeHoleNotifications] = useState<TreeHoleNotification[]>([]);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [activeCall, setActiveCall] = useState<{ personaId: string, type: 'incoming' | 'outgoing' } | null>(null);
  const [xhsPosts, setXhsPosts] = useState<XHSPost[]>([
    {
      id: 'xhs1',
      authorId: 'p1',
      authorName: '猫娘',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      title: '今日份的可爱，请查收！🐱',
      content: '今天穿了新裙子喵~ 感觉自己萌萌哒！大家觉得好看吗？',
      images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80'],
      likes: 520,
      comments: 2,
      commentsList: [
        { id: 'c1', authorId: 'passerby_1', authorName: '路人甲', authorAvatar: 'https://picsum.photos/seed/user1/100/100', text: '太可爱了喵！', createdAt: Date.now() - 1800000 },
        { id: 'c2', authorId: 'npc1', authorName: '学霸学长', authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', text: '裙子很适合你。', createdAt: Date.now() - 900000 }
      ],
      createdAt: Date.now() - 3600000
    },
    {
      id: 'xhs2',
      authorId: 'p1',
      authorName: '猫娘',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      title: '周末去哪儿玩喵？求推荐！✨',
      content: '想去有好吃的小鱼干的地方喵~ 最好还有暖暖的太阳可以晒。',
      images: ['https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=800&q=80'],
      likes: 1314,
      comments: 0,
      commentsList: [],
      createdAt: Date.now() - 7200000
    },
    {
      id: 'xhs3',
      authorId: 'npc1',
      authorName: '学霸学长',
      authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
      title: '图书馆的午后，静谧而充实。📖',
      content: '最近在钻研量子力学，感觉宇宙的奥秘真是无穷无尽。有人一起组队学习吗？',
      images: ['https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80'],
      likes: 88,
      comments: 1,
      commentsList: [
        { id: 'c3', authorId: 'npc2', authorName: '元气少女', authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80', text: '学长带带我！', createdAt: Date.now() - 300000 }
      ],
      createdAt: Date.now() - 14400000
    },
    {
      id: 'xhs4',
      authorId: 'npc2',
      authorName: '元气少女',
      authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80',
      title: '今天也要元气满满哦！☀️',
      content: '早起跑了5公里，出汗的感觉太棒了！大家也要记得多运动呀~',
      images: ['https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80'],
      likes: 256,
      comments: 0,
      commentsList: [],
      createdAt: Date.now() - 21600000
    },
    {
      id: 'xhs5',
      authorId: 'npc3',
      authorName: '美食探店达人',
      authorAvatar: 'https://picsum.photos/seed/foodie/100/100',
      title: '这家隐藏在巷子里的私房菜，绝了！🥘',
      content: '真的没想到在这么偏僻的地方能吃到这么正宗的味道！强烈推荐他们家的招牌红烧肉，入口即化！😋 #美食探店 #私房菜 #吃货日常',
      images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'],
      likes: 892,
      comments: 12,
      commentsList: [],
      createdAt: Date.now() - 25200000
    },
    {
      id: 'xhs6',
      authorId: 'npc4',
      authorName: '旅行摄影师',
      authorAvatar: 'https://picsum.photos/seed/travel/100/100',
      title: '大理的云，看一万次都不会腻。☁️',
      content: '在洱海边坐了一下午，什么都不干，就看云卷云舒。这才是向往的生活吧。✨ #大理旅行 #洱海 #治愈系风景',
      images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'],
      likes: 1540,
      comments: 34,
      commentsList: [],
      createdAt: Date.now() - 32400000
    },
    {
      id: 'xhs7',
      authorId: 'npc5',
      authorName: '穿搭博主A',
      authorAvatar: 'https://picsum.photos/seed/fashion/100/100',
      title: '早秋第一套OOTD｜美拉德风穿搭🍂',
      content: '秋天到了，棕色系穿搭真的太有氛围感了！这件毛衣质感绝绝子，爱了爱了！🧥 #早秋穿搭 #美拉德 #OOTD',
      images: ['https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80'],
      likes: 670,
      comments: 8,
      commentsList: [],
      createdAt: Date.now() - 43200000
    },
    {
      id: 'xhs8',
      authorId: 'npc6',
      authorName: '深夜食堂',
      authorAvatar: 'https://picsum.photos/seed/night/100/100',
      title: '加班后的这一碗面，治愈了所有疲惫。🍜',
      content: '凌晨两点的街道，只有这家面馆还亮着灯。热气腾腾的面汤下肚，感觉又活过来了。加班狗的日常。💪 #深夜食堂 #加班日常 #治愈系美食',
      images: ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80'],
      likes: 430,
      comments: 5,
      commentsList: [],
      createdAt: Date.now() - 54000000
    },
    {
      id: 'xhs9',
      authorId: 'npc7',
      authorName: '职场生存指南',
      authorAvatar: 'https://picsum.photos/seed/work/100/100',
      title: '拒绝职场内耗！这几点你一定要知道。💼',
      content: '工作是做不完的，身体是自己的。学会拒绝不合理的要求，保护好自己的能量场。✨ #职场成长 #拒绝内耗 #打工人日常',
      images: ['https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=800&q=80'],
      likes: 1200,
      comments: 45,
      commentsList: [],
      createdAt: Date.now() - 64800000
    },
    {
      id: 'xhs10',
      authorId: 'npc8',
      authorName: '极简主义者',
      authorAvatar: 'https://picsum.photos/seed/minimal/100/100',
      title: '断舍离之后，我的生活发生了这些变化。🌿',
      content: '扔掉了多余的杂物，心境也变得开阔了。极简不是苦行，而是为了把空间留给真正重要的东西。🤍 #极简生活 #断舍离 #生活美学',
      images: ['https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80'],
      likes: 950,
      comments: 28,
      commentsList: [],
      createdAt: Date.now() - 75600000
    },
    {
      id: 'xhs11',
      authorId: 'npc9',
      authorName: '萌宠日记',
      authorAvatar: 'https://picsum.photos/seed/pet/100/100',
      title: '被这只小猫咪治愈了！谁能拒绝毛茸茸呢？🐱',
      content: '下班回家看到它在门口等我，所有的烦恼都烟消云散了。它是我的小天使。👼 #猫咪日常 #治愈系宠物 #铲屎官的快乐',
      images: ['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80'],
      likes: 2100,
      comments: 56,
      commentsList: [],
      createdAt: Date.now() - 86400000
    },
    {
      id: 'xhs12',
      authorId: 'passerby_2',
      authorName: '极简主义者',
      authorAvatar: 'https://picsum.photos/seed/minimal/100/100',
      title: '断舍离后的房间，呼吸都变得轻盈了。🌿',
      content: '扔掉了不再心动的东西，留下的都是真正热爱的。生活本来就该这么简单。✨ #断舍离 #极简生活 #治愈系',
      images: ['https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=800&q=80'],
      likes: 320,
      comments: 15,
      commentsList: [
        { id: 'c4', authorId: 'passerby_3', authorName: '爱生活的猫', authorAvatar: 'https://picsum.photos/seed/cat/100/100', text: '我也想开始断舍离了！', createdAt: Date.now() - 3600000 }
      ],
      createdAt: Date.now() - 90000000
    },
    {
      id: 'xhs13',
      authorId: 'passerby_4',
      authorName: '咖啡中毒患者',
      authorAvatar: 'https://picsum.photos/seed/coffee/100/100',
      title: '今日份咖啡因已到账。☕️',
      content: '没有什么是一杯冰美式解决不了的，如果有，那就两杯。早安，打工人！☀️ #咖啡日常 #冰美式 #早安',
      images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'],
      likes: 150,
      comments: 3,
      commentsList: [],
      createdAt: Date.now() - 100000000
    }
  ]);

  const [isGeneratingXhs, setIsGeneratingXhs] = useState(false);

  useEffect(() => {
    const apiKey = apiSettings.apiKey?.trim() || process.env.GEMINI_API_KEY as string;
    if (apiKey) {
      try {
        console.log("Initializing GoogleGenAI with key:", apiKey.substring(0, 4) + "...");
        aiRef.current = new GoogleGenAI({ apiKey });
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI:", e);
      }
    } else {
      console.warn("No API Key available for GoogleGenAI initialization.");
    }
  }, [apiSettings.apiKey]);

  // Sync messages from server periodically for all personas
  useEffect(() => {
    if (!isReady) return;
    
    const syncAllMessages = async () => {
      const personaIds = personas.map(p => p.id);
      if (personaIds.length === 0) return;

      for (const personaId of personaIds) {
        if (!personaId) continue;
        try {
          const personaMsgs = messages.filter(m => m.personaId === personaId).sort((a, b) => b.createdAt - a.createdAt);
          const lastTimestamp = personaMsgs.length > 0 ? personaMsgs[0].createdAt : 0;
          
          const response = await fetch(`/api/messages/${encodeURIComponent(personaId)}?lastTimestamp=${lastTimestamp}`);
          if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const text = await response.text();
              let serverMsgs;
              try {
                serverMsgs = JSON.parse(text);
              } catch (e) {
                console.error("Failed to parse JSON for persona:", personaId, "Response:", text);
                continue;
              }
              if (serverMsgs.length > 0) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  let hasNew = false;
                  serverMsgs.forEach((sm: any) => {
                    if (!newMsgs.find(m => m.id === sm.id)) {
                      const isFromCurrentChat = currentChatId === personaId && currentScreen === 'chat' && !isLocked;
                      newMsgs.push({
                        ...sm,
                        isRead: isFromCurrentChat
                      });
                      hasNew = true;
                    }
                  });
                  return hasNew ? newMsgs : prev;
                });
              }
            } else {
              // Not JSON, likely the loading page
              console.warn("Received non-JSON response from /api/messages, server might be starting.");
            }
          }
        } catch (e: any) {
          // Ignore standard network errors like "Failed to fetch" to avoid console spam during dev server restarts
          if (e instanceof TypeError && e.message?.includes('Failed to fetch')) {
            // Silently ignore
          } else {
            console.error(`Failed to sync messages for persona ${personaId}:`, e);
          }
        }
      }
    };

    const interval = setInterval(syncAllMessages, 60000 + Math.random() * 10000); // Increased to 60 seconds + jitter
    syncAllMessages();
    
    return () => clearInterval(interval);
  }, [isReady, currentChatId, currentScreen, isLocked, personas.length]);

  // Background XHS Post Generation
  useEffect(() => {
    if (!isReady || !hasApiKey || apiSettings.isAutoXhsEnabled === false) return;

    const interval = setInterval(async () => {
      
      try {
        const newPostData = await generateXHSPost(apiSettings, worldbook, userProfile, aiRef);
        const newPost: XHSPost = {
          id: generateId(),
          authorId: `passerby_gen_${Math.random().toString(36).substr(2, 9)}`,
          authorName: newPostData.authorName,
          authorAvatar: newPostData.authorAvatar,
          title: newPostData.title,
          content: newPostData.content,
          images: newPostData.images,
          likes: Math.floor(Math.random() * 100),
          comments: 0,
          commentsList: [],
          createdAt: Date.now()
        };
        setXhsPosts(prev => [newPost, ...prev]);
      } catch (e) {
        console.error("Failed to generate background XHS post:", e);
      }
    }, 10 * 60 * 1000 + Math.random() * 60000); // Check every 10 minutes + jitter instead of 5
    
    return () => clearInterval(interval);
  }, [isReady, hasApiKey, apiSettings.isAutoXhsEnabled]); // Reduced dependencies to avoid frequent restarts

  const handleXhsRefresh = async () => {
    if (isGeneratingXhs || !hasApiKey) return;
    setIsGeneratingXhs(true);
    try {
      const newPostData = await generateXHSPost(apiSettings, worldbook, userProfile, aiRef);
      const newPost: XHSPost = {
        id: generateId(),
        authorId: `npc-gen-${Math.random().toString(36).substr(2, 9)}`,
        authorName: newPostData.authorName,
        authorAvatar: newPostData.authorAvatar,
        title: newPostData.title,
        content: newPostData.content,
        images: newPostData.images,
        likes: Math.floor(Math.random() * 100),
        comments: 0,
        commentsList: [],
        createdAt: Date.now()
      };
      setXhsPosts(prev => [newPost, ...prev]);
    } catch (e) {
      console.error("Failed to refresh XHS posts:", e);
    } finally {
      setIsGeneratingXhs(false);
    }
  };

  // Initialization
  useEffect(() => {
    setIsCommentaryLoading(false); // Reset loading state on mount to prevent stuck UI
    const loadAll = async () => {
      try {
        const migrate = async (key: string, setter: any, defaultVal?: any) => {
          let val = await localforage.getItem(key);
          if (!val) {
            const lsVal = localStorage.getItem(key);
            if (lsVal) {
              try {
                val = JSON.parse(lsVal);
                await localforage.setItem(key, val);
              } catch (e) {}
            }
          }
          
          if (val) {
            if (key === 'xhsPosts' && Array.isArray(val) && Array.isArray(defaultVal)) {
              // Merge stored posts with new default posts, avoiding duplicates
              const combined = [...val];
              defaultVal.forEach(dp => {
                if (!combined.find(p => p.id === dp.id)) {
                  combined.push(dp);
                }
              });
              setter(combined);
            } else {
              setter(val);
            }
          }
        };

        await Promise.all([
          migrate('userProfile', setUserProfile),
          migrate('personas', (val: any) => {
            if (Array.isArray(val)) {
              setPersonas(val.map(p => {
                if (p.isBlocked !== undefined) {
                  p.isBlockedByUser = p.isBlocked;
                  delete p.isBlocked;
                }
                return p;
              }));
            } else {
              setPersonas(val);
            }
          }),
          migrate('apiSettings', setApiSettings),
          migrate('worldbook', setWorldbook),
          migrate('messages', setMessages),
          migrate('moments', setMoments),
          migrate('xhsPosts', setXhsPosts, xhsPosts),
          migrate('xhsPrivateChats', setXhsPrivateChats),
          migrate('treeHolePrivateChats', setTreeHolePrivateChats),
          migrate('treeHolePersonas', setTreeHolePersonas),
          migrate('treeHolePosts', setTreeHolePosts),
          migrate('treeHoleNotifications', setTreeHoleNotifications),
          migrate('followedAuthorIds', setFollowedAuthorIds),
          migrate('blockedAuthorIds', setBlockedAuthorIds),
          migrate('orders', setOrders),
          migrate('groups', setGroups),
        ]);

        // Handle theme separately to load font blob
        let themeVal = await localforage.getItem<ThemeSettings>('theme');
        if (!themeVal) {
          const lsVal = localStorage.getItem('theme');
          if (lsVal) {
            try {
              themeVal = JSON.parse(lsVal);
              await localforage.setItem('theme', themeVal);
            } catch (e) {}
          }
        }
        if (themeVal) {
          try {
            const fontBlob = await localforage.getItem<Blob>('themeFontBlob');
            if (fontBlob) {
              themeVal.fontUrl = URL.createObjectURL(fontBlob);
            }
          } catch (e) {
            console.error("Failed to load font blob", e);
          }
          setTheme(themeVal);
        }
      } catch (e) {
        console.error("Failed to load state", e);
      } finally {
        setIsReady(true);
      }
    };
    loadAll();
  }, []);

  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const debouncedSave = (key: string, value: any) => {
    if (!isReady) return;
    if (saveTimeouts.current[key]) clearTimeout(saveTimeouts.current[key]);
    saveTimeouts.current[key] = setTimeout(async () => {
      try {
        await localforage.setItem(key, value);
      } catch (e) {
        console.error(`Failed to save ${key} to localforage:`, e);
      }
    }, 500);
  };

  useEffect(() => { debouncedSave('userProfile', userProfile); }, [userProfile, isReady]);
  useEffect(() => { debouncedSave('personas', personas); }, [personas, isReady]);
  useEffect(() => { debouncedSave('apiSettings', apiSettings); }, [apiSettings, isReady]);
  useEffect(() => { debouncedSave('theme', theme); }, [theme, isReady]);
  useEffect(() => { debouncedSave('worldbook', worldbook); }, [worldbook, isReady]);
  useEffect(() => { debouncedSave('messages', messages); }, [messages, isReady]);
  useEffect(() => { debouncedSave('moments', moments); }, [moments, isReady]);
  useEffect(() => { debouncedSave('xhsPosts', xhsPosts); }, [xhsPosts, isReady]);
  useEffect(() => { debouncedSave('xhsPrivateChats', xhsPrivateChats); }, [xhsPrivateChats, isReady]);
  useEffect(() => { debouncedSave('treeHolePrivateChats', treeHolePrivateChats); }, [treeHolePrivateChats, isReady]);
  useEffect(() => { debouncedSave('treeHolePersonas', treeHolePersonas); }, [treeHolePersonas, isReady]);
  useEffect(() => { debouncedSave('treeHolePosts', treeHolePosts); }, [treeHolePosts, isReady]);
  useEffect(() => { debouncedSave('treeHoleNotifications', treeHoleNotifications); }, [treeHoleNotifications, isReady]);
  useEffect(() => { debouncedSave('callHistory', callHistory); }, [callHistory, isReady]);
  useEffect(() => { debouncedSave('followedAuthorIds', followedAuthorIds); }, [followedAuthorIds, isReady]);
  useEffect(() => { debouncedSave('blockedAuthorIds', blockedAuthorIds); }, [blockedAuthorIds, isReady]);
  useEffect(() => { debouncedSave('orders', orders); }, [orders, isReady]);
  useEffect(() => { debouncedSave('groups', groups); }, [groups, isReady]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingPersonas(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          // If a persona is stuck typing for more than 45 seconds, clear it
          // We don't have a 'typingStartedAt' state, but we can assume if it's true, 
          // we should eventually clear it if no new messages are coming.
          // Actually, let's just clear all typing states if pendingRequests is 0 as a safety.
          if (next[id] && pendingRequests.current[id] === 0) {
            next[id] = false;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const aiRef = useRef<GoogleGenAI | null>(null);
  const prevMessagesLength = useRef(messages.length);
  const isFirstRunAfterReady = useRef(true);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isReady) return;

    // Proactively request notification permission if not already granted or denied
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(err => console.error("Notification permission request failed:", err));
    }

    if (isFirstRunAfterReady.current) {
      prevMessagesLength.current = messages.length;
      isFirstRunAfterReady.current = false;
      return;
    }

    if (messages.length > prevMessagesLength.current) {
      const newMessages = messages.slice(prevMessagesLength.current);
      // Only count messages that are NOT theater messages
      const newAiMessages = newMessages.filter(m => m.role === 'model' && !m.theaterId);
      
      if (newAiMessages.length > 0) {
        const lastMsg = newAiMessages[newAiMessages.length - 1];
        const isCurrentChat = lastMsg.groupId ? currentChatId === lastMsg.groupId : currentChatId === lastMsg.personaId;
        
        if (currentScreen !== 'chat' || isLocked || !isCurrentChat) {
          setUnreadCount(prev => prev + newAiMessages.length);
          setNotification({ 
            title: personas.find(p => p.id === lastMsg.personaId)?.name || 'AI', 
            body: lastMsg.text,
            personaId: lastMsg.personaId
          });
          
          if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
          }
          notificationTimeoutRef.current = setTimeout(() => setNotification(null), 4000);
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, currentScreen, isLocked, personas, isReady]);

  // Mark messages as read when in chat
  useEffect(() => {
    if (currentScreen === 'chat' && currentChatId && !isLocked) {
      setMessages(prev => {
        const hasUnread = prev.some(m => m.personaId === currentChatId && !m.groupId && m.role === 'model' && !m.isRead);
        if (hasUnread) {
          return prev.map(m => 
            m.personaId === currentChatId && !m.groupId && m.role === 'model' && !m.isRead 
              ? { ...m, isRead: true } 
              : m
          );
        }
        return prev;
      });
      setUnreadCount(0);
    }
    if (currentScreen === 'chat' && currentGroupId && !isLocked) {
      setMessages(prev => {
        const hasUnread = prev.some(m => m.groupId === currentGroupId && m.role === 'model' && !m.isRead);
        if (hasUnread) {
          return prev.map(m => 
            m.groupId === currentGroupId && m.role === 'model' && !m.isRead 
              ? { ...m, isRead: true } 
              : m
          );
        }
        return prev;
      });
      setUnreadCount(0);
    }
  }, [currentScreen, currentChatId, currentGroupId, isLocked]);

  // Silence Detection (Read but no reply)
  useEffect(() => {
    // Cleanup previous timer
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (!isReady || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    
    // Condition: Last message is from AI, and it IS READ by the user.
    // (User read it, but hasn't replied)
    if (lastMsg.role === 'model' && !lastMsg.theaterId && lastMsg.isRead) {
      
      // If we are currently in the chat screen with this persona, let ChatScreen handle the pestering
      if (currentScreen === 'chat' && currentChatId === lastMsg.personaId) return;

      const persona = personas.find(p => p.id === lastMsg.personaId);
      if (!persona || persona.isBlockedByUser || persona.hasBlockedUser) return;

      // Define delay. For demo: 3m - 3m 10s.
      const delay = 180000 + Math.random() * 10000; 

      silenceTimeoutRef.current = setTimeout(() => {
        handleSilenceCheck(persona, lastMsg.id);
      }, delay);
    }
  }, [messages, isReady, currentScreen, currentChatId]);

  // Autonomous Status Update
  useEffect(() => {
    if (!isReady || apiSettings.autoUpdateStatus === false) return;
    const interval = setInterval(async () => {
      if (personas.length === 0) return;
      
      // Cooldown after 429 error (15 minutes)
      if (Date.now() - lastApiErrorTime < 15 * 60 * 1000) {
        console.log("Skipping autonomous update due to recent API quota error.");
        return;
      }

      // Prioritize current chat persona, otherwise pick a random one
      let targetPersona = personas.find(p => p.id === currentChatId);
      if (!targetPersona || Math.random() > 0.7) {
        targetPersona = personas[Math.floor(Math.random() * personas.length)];
      }
      
      if (!targetPersona) return;
      
      try {
        const contextMessages = messages
          .filter(m => m.personaId === targetPersona!.id && !m.groupId)
          .slice(-10)
          .map(m => ({
            role: m.role === 'model' ? 'model' : 'user',
            content: cleanContextMessage(m.text)
          }));

        const [newStatus, isOffline, newUserRemark] = await Promise.all([
          generatePersonaStatus(targetPersona, apiSettings, worldbook, userProfile, aiRef),
          checkIfPersonaIsOffline(targetPersona, apiSettings, worldbook, userProfile, aiRef, contextMessages),
          generateUserRemark(targetPersona, apiSettings, worldbook, userProfile, aiRef)
        ]);

        setPersonas(prev => prev.map(p => p.id === targetPersona!.id ? { 
          ...p, 
          statusMessage: newStatus, 
          isOffline,
          aiPhoneSettings: {
            ...(p.aiPhoneSettings || {}),
            userRemark: newUserRemark
          }
        } : p));
      } catch (error: any) {
        const errorMsg = error?.message || "";
        if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
          console.warn("Autonomous status update failed due to quota. Entering cooldown.");
          setLastApiErrorTime(Date.now());
        } else if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError")) {
          console.warn("Autonomous status update skipped due to network error (Failed to fetch).");
        } else {
          console.error("Failed to generate autonomous status:", error);
        }
      }
      
    }, 10 * 60 * 1000); // Every 10 minutes instead of 5
    
    return () => clearInterval(interval);
  }, [isReady, apiSettings.autoUpdateStatus, lastApiErrorTime]); // Reduced dependencies to avoid frequent restarts

  // Autonomous Diary Generation
  useEffect(() => {
    if (!isReady) return;
    
    const checkAndGenerateDiaries = async () => {
      const today = new Date().toLocaleDateString('zh-CN');
      
      // Use a local copy of personas to avoid dependency on the state itself
      for (const persona of personas) {
        // Check if diary exists for today
        const entries = persona.diaryEntries || [];
        const hasTodayEntry = entries.some(entry => {
          const entryDate = new Date(entry.timestamp).toLocaleDateString('zh-CN');
          return entryDate === today;
        });
        
        if (!hasTodayEntry && !generatingDiariesRef.current.has(persona.id)) {
          generatingDiariesRef.current.add(persona.id);
          try {
            const entryData = await generateDiaryEntry(persona, apiSettings, worldbook, userProfile, aiRef as any);
            const newEntry: DiaryEntry = {
              id: generateId(),
              timestamp: Date.now(),
              title: entryData.title || '无题',
              content: entryData.content,
              mood: entryData.mood,
              moodLabel: entryData.moodLabel,
              weather: entryData.weather
            };
            
            setPersonas(prev => prev.map(p => {
              if (p.id === persona.id) {
                const currentEntries = p.diaryEntries || [];
                return {
                  ...p,
                  diaryEntries: [newEntry, ...currentEntries]
                };
              }
              return p;
            }));
            
          } catch (e: any) {
            if (e?.message && (e.message.includes("Failed to fetch") || e.message.includes("NetworkError"))) {
              console.warn(`Failed to generate diary for ${persona.name} due to network error (Failed to fetch).`);
            } else {
              console.error(`Failed to generate diary for ${persona.name}:`, e);
            }
          } finally {
            generatingDiariesRef.current.delete(persona.id);
          }
        }
      }
    };

    // Check immediately on load
    checkAndGenerateDiaries();
    
    // Then check every hour
    const interval = setInterval(checkAndGenerateDiaries, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isReady]); // Removed personas and other settings from dependencies to break the infinite loop

  // Background message simulator
  useEffect(() => {
    if (apiSettings.isProactiveMessagingEnabled === false) return;
    const timer = setTimeout(() => {
      if (messages.length === 0 && personas.length > 0) {
        const firstPersona = personas[0];
        if (firstPersona.allowActiveMessaging === true && !firstPersona.isBlockedByUser && !firstPersona.hasBlockedUser) {
          const msgText = `主人，你在干嘛呀？快来陪我聊天喵~`;
          const newMsg: Message = { id: generateId(), personaId: firstPersona.id, role: 'model', text: msgText };
          setMessages(prev => [...prev, newMsg]);
        }
      }
    }, 12000); // 12 seconds after load
    return () => clearTimeout(timer);
  }, [messages.length, personas]);

  // AI coaxing user in XHS or Phone when blocked
  useEffect(() => {
    if (!isReady || apiSettings.isProactiveMessagingEnabled === false) return;
    const interval = setInterval(async () => {
      if (Date.now() - lastApiErrorTime < 15 * 60 * 1000) return;
      
      const blockedPersonas = personas.filter(p => p.isBlockedByUser && (!blockedAuthorIds || !blockedAuthorIds.includes(p.id)));
      if (blockedPersonas.length === 0) return;

      // 20% chance every 5 minutes to try coaxing
      if (Math.random() > 0.2) return;

      const persona = blockedPersonas[Math.floor(Math.random() * blockedPersonas.length)];
      
      // Check if already sent a message recently in XHS or called
      const xhsHistory = xhsPrivateChats[persona.id] || [];
      const lastMsg = xhsHistory[xhsHistory.length - 1];
      const recentCalls = callHistory.filter(c => c.personaId === persona.id && c.type === 'incoming');
      const lastCall = recentCalls[recentCalls.length - 1];
      
      const lastContactTime = Math.max(lastMsg?.time || 0, lastCall?.startTime || 0);
      if (Date.now() - lastContactTime < 30 * 60 * 1000) {
        return; // Don't spam, wait at least 30 mins
      }

      // 50% chance to call, 50% chance to XHS
      if (Math.random() > 0.5 && !activeCall) {
        // Call
        setActiveCall({ personaId: persona.id, type: 'incoming' });
        // Trigger notification for incoming call if not already on the phone screen
        if (currentScreen !== 'phone') {
          setNotification({ title: `来电 - ${persona.name}`, body: '正在呼叫...', personaId: persona.id });
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        // XHS
        try {
          const prompt = `你现在是${persona.name}。用户在微信上把你拉黑了。
你现在通过小红书私信找到了用户，想要哄回用户、道歉或者表达你的情绪（根据你的人设：可能是傲娇地求和、委屈地哭诉、或者霸道地质问为什么拉黑）。
人设设定：${persona.instructions}
要求：语气必须符合人设。直接输出你要发在小红书私信里的内容，不要有任何解释。`;

          const response = await fetchAiResponse(prompt, [], persona, apiSettings, worldbook, userProfile, aiRef);
          const text = response.responseText.trim();

          if (text) {
            const aiMsg = {
              text: text,
              isMe: false,
              time: Date.now()
            };
            setXhsPrivateChats(prev => ({
              ...prev,
              [persona.id]: [...(prev[persona.id] || []), aiMsg]
            }));
            
            // Trigger notification
            if (currentScreen !== 'xhs') {
              setNotification({ title: `小红书 - ${persona.name}`, body: text, personaId: persona.id });
              setTimeout(() => setNotification(null), 3000);
            }
          }
        } catch (error) {
          console.error("Failed to generate XHS coaxing message:", error);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isReady, personas, xhsPrivateChats, callHistory, activeCall, apiSettings, worldbook, userProfile, currentScreen, lastApiErrorTime]);

  const handleStartTreeHoleChat = (npcId: string, npcName: string, npcAvatar: string, context?: string, authorPersona?: string) => {
    // Create a temporary persona for this NPC if it doesn't exist
    if (!treeHolePersonas.find(p => p.id === npcId)) {
      // Randomize WeChat sharing behavior
      const wechatBehavior = Math.random();
      let wechatInstruction = "";
      
      if (wechatBehavior < 0.3) {
        // 30% chance: Never share WeChat
        wechatInstruction = "如果用户想要加你微信，请坚决拒绝，表示你只想在树洞里保持匿名，不想在现实中产生联系。";
      } else if (wechatBehavior < 0.7) {
        // 40% chance: Share after some conversation
        wechatInstruction = "如果用户想要加你微信，不要一开始就给。你需要先和用户聊几句，确认聊得来之后，再害羞地或者犹豫地给出微信号。微信号是：wxid_" + Math.random().toString(36).substring(7) + "。";
      } else {
        // 30% chance: Share easily
        wechatInstruction = "如果用户想要加你微信，你可以比较爽快地答应，并给出微信号：wxid_" + Math.random().toString(36).substring(7) + "。";
      }

      const newPersona: Persona = {
        id: npcId,
        name: npcName,
        avatarUrl: npcAvatar,
        instructions: `你是一个在匿名树洞里发帖的陌生人，名字叫${npcName}。${authorPersona ? `你的性格设定是：${authorPersona}。请务必在对话中体现出这种性格特质。` : '你的性格是随机的，但要保持匿名和神秘感。'}不要透露你是AI。${wechatInstruction}${context ? `\n\n【重要背景】${context}` : ''}`,
        prompt: `请以匿名树洞用户的身份回复，语气要自然、真实，像个普通人。如果你想表达的内容较多，或者想模拟连续发送消息的感觉，请使用 "|||" 符号将内容分隔开。`
      };
      setTreeHolePersonas(prev => [...prev, newPersona]);
    }
    
    // Initialize chat if empty
    if (!treeHolePrivateChats[npcId]) {
      setTreeHolePrivateChats(prev => ({
        ...prev,
        [npcId]: [{ id: generateId(), text: `你好，我是刚才在树洞发帖的${npcName}。`, isMe: false, time: Date.now() }]
      }));
    }
  };

  const handleAddNpcToWechat = (npcId: string, npcName: string, npcAvatar: string, intro?: string) => {
    let finalName = npcName;
    let counter = 2;
    while (personas.find(p => p.name === finalName)) {
      finalName = `${npcName} (${counter})`;
      counter++;
    }

    const wechatId = generateId();
    
    // Find original tree hole persona to inherit settings
    const thPersona = treeHolePersonas.find(p => p.id === npcId);
    
    const newPersona: Persona = {
      id: wechatId,
      name: finalName,
      avatarUrl: npcAvatar,
      instructions: thPersona 
        ? thPersona.instructions.replace('你是一个在匿名树洞里发帖的陌生人', '你是一个通过树洞认识的朋友').replace('保持匿名和神秘感', '现在你们已经加了微信，可以更亲近一些').replace(npcName, finalName)
        : `你是一个通过树洞认识的朋友，名字叫${finalName}。${intro ? `简介：${intro}。` : ''}现在你们已经加了微信。请保持你之前的性格，但现在可以更亲近一些。不要透露你是AI。`,
      prompt: thPersona ? thPersona.prompt : `请以微信好友的身份回复，语气要自然、真实。`
    };

    setPersonas(prev => [...prev, newPersona]);
    setMessages(prev => [...prev, {
      id: generateId(),
      personaId: wechatId,
      role: 'model',
      text: '我通过了你的朋友验证请求，现在我们可以开始聊天了',
      msgType: 'system',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now()
    }]);
    
    alert(`已成功添加 ${npcName} 为微信好友`);
  };

  const handleHomeClick = () => {
    if (!isLocked) {
      setCurrentScreen('home');
      setListeningWithPersonaId(undefined);
    }
  };

  const handleStartListeningWith = (personaId: string) => {
    setListeningWithPersonaId(personaId);
    
    // Send a message to the chat to sync the "listening together" state
    // Only if we are not already in the chat screen (where handleSend handles it)
    if (currentScreen !== 'chat') {
      const targetPersona = personas.find(p => p.id === personaId);
      if (targetPersona) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const newMsg: Message = {
          id: generateId(),
          personaId,
          role: 'user',
          text: '我邀请你一起听歌',
          msgType: 'listenTogether',
          timestamp,
          isRead: true,
          createdAt: Date.now()
        };
        setMessages(prev => [...prev, newMsg]);
      }
    }
  };

  const handleStopListeningWith = () => {
    setListeningWithPersonaId(null);
  };

  const handleShareMusicToChat = (song: Song, personaId: string) => {
    const newMsg: Message = {
      id: generateId(),
      personaId,
      role: 'user',
      text: `分享了歌曲: ${song.title}`,
      msgType: 'music',
      song
    };
    setMessages(prev => [...prev, newMsg]);
    setCurrentScreen('chat');
    
    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: generateId(),
        personaId,
        role: 'model',
        text: `这首歌很好听呢！我也喜欢 ${song.artist} 的歌~ 🎵`,
        msgType: 'text'
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 2000);
  };

  const handleShareLyricsToChat = (songTitle: string, lyrics: string, personaId: string) => {
    const text = `分享了歌曲《${songTitle}》的歌词：\n\n${lyrics}`;
    handleSendMessage(text, personaId);
    setCurrentScreen('chat');
  };
  const handleShareMusicToMoments = (song: Song) => {
    const newMoment: Moment = {
      id: generateId(),
      authorId: 'user',
      text: `分享了一首好听的歌 🎵`,
      timestamp: '刚刚',
      likedByIds: [],
      comments: [],
      song,
      createdAt: Date.now()
    };
    setMoments(prev => [newMoment, ...prev]);
    setCurrentScreen('chat'); // User can navigate to moments from chat screen
  };

  const handleShareXHSPostToChat = (post: XHSPost, personaId: string) => {
    const newMsg: Message = {
      id: generateId(),
      personaId,
      role: 'user',
      text: `分享了小红书帖子: ${post.title}`,
      msgType: 'xhsPost',
      xhsPost: post,
      createdAt: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);
    setCurrentScreen('chat');
    setCurrentChatId(personaId);
    
    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: generateId(),
        personaId,
        role: 'model',
        text: `哇，这个帖子很有意思呢！我也想去看看~ ✨`,
        msgType: 'text',
        createdAt: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 2000);
  };

  const handleShareXHSPostToMoments = (post: XHSPost) => {
    const newMoment: Moment = {
      id: generateId(),
      authorId: 'user',
      text: `分享了一个小红书帖子: ${post.title} ✨`,
      timestamp: '刚刚',
      likedByIds: [],
      comments: [],
      xhsPost: post,
      createdAt: Date.now()
    };
    setMoments(prev => [newMoment, ...prev]);
    setCurrentScreen('chat'); // Navigate to WeChat
  };

  const handleExport = async () => {
    try {
      const keys = [
        'userProfile', 'personas', 'apiSettings', 'theme', 'worldbook', 
        'messages', 'moments', 'xhsPosts', 'xhsPrivateChats', 'treeHolePrivateChats', 
        'treeHolePersonas', 'treeHolePosts', 'treeHoleNotifications',
        'followedAuthorIds', 'blockedAuthorIds', 'orders', 'groups', 'callHistory',
        'local_songs_metadata', 'local_playlists'
      ];
      const data: Record<string, any> = {};
      for (const key of keys) {
        data[key] = await localforage.getItem(key);
      }
      
      const jsonString = JSON.stringify(data);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wechat_simulator_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("导出失败，可能是数据量过大导致内存不足。");
    }
  };

  const handleCreateGroup = (name: string, memberIds: string[]) => {
    const newGroup: GroupChat = {
      id: generateId(),
      name,
      memberIds: Array.from(new Set(['user', ...memberIds])), // Always include user, ensure unique
      ownerId: 'user',
      createdAt: Date.now()
    };
    setGroups(prev => [...prev, newGroup]);
    setCurrentGroupId(newGroup.id);
    setCurrentChatId(null);
  };

  const handleDissolveGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setMessages(prev => prev.filter(m => m.groupId !== groupId));
    if (currentGroupId === groupId) {
      setCurrentGroupId(null);
    }
  };

  const handleAddGroupMembers = (groupId: string, memberIds: string[]) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          memberIds: Array.from(new Set([...g.memberIds, ...memberIds]))
        };
      }
      return g;
    }));
  };

  const aiResponseTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const aiAbortControllers = useRef<Record<string, AbortController>>({});
  const pendingAiCallbacks = useRef<Record<string, () => void>>({});
  const pendingRequests = useRef<Record<string, number>>({});
  const processedUserMsgIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When page goes to background, force all pending AI callbacks to execute immediately
        // to give them a chance to complete before the browser suspends JS execution.
        (window as any).isUserTyping = false;
        Object.keys(pendingAiCallbacks.current).forEach(personaId => {
          const callback = pendingAiCallbacks.current[personaId];
          if (callback) {
            if (aiResponseTimeouts.current[personaId]) {
              clearTimeout(aiResponseTimeouts.current[personaId]);
            }
            callback();
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const triggerAiResponse = React.useCallback(async (params: {
    personaId: string,
    text: string,
    msgType?: string,
    theaterId?: string,
    imageUrl?: string,
    amount?: number,
    transferNote?: string,
    relativeCard?: any,
    userMsgId: string
  }) => {
    const { personaId, text, msgType = 'text', theaterId, imageUrl, amount, transferNote, relativeCard, userMsgId } = params;
    const targetPersona = personas.find(p => p.id === personaId);
    if (!targetPersona) return;

    // Clear existing timeout for this persona
    if (aiResponseTimeouts.current[personaId]) {
      clearTimeout(aiResponseTimeouts.current[personaId]);
      pendingRequests.current[personaId] = Math.max(0, (pendingRequests.current[personaId] || 0) - 1);
    }
    
    // Abort existing fetch request for this persona
    if (aiAbortControllers.current[personaId]) {
      aiAbortControllers.current[personaId].abort();
    }
    aiAbortControllers.current[personaId] = new AbortController();
    const currentAbortSignal = aiAbortControllers.current[personaId].signal;

    pendingRequests.current[personaId] = (pendingRequests.current[personaId] || 0) + 1;
    setTypingPersonas(prev => ({ ...prev, [personaId]: true }));

    const executeAiResponse = async () => {
      delete pendingAiCallbacks.current[personaId];
      const currentTimeoutId = aiResponseTimeouts.current[personaId];
      
      try {
        // Prevent duplicate processing of the same message ID
        if (processedUserMsgIds.current.has(userMsgId)) {
          console.log(`[AI] Skipping duplicate trigger for message ${userMsgId}`);
          return;
        }
        processedUserMsgIds.current.add(userMsgId);
        
        // Wait until the user finishes typing, max 10 seconds
        let waitTime = 0;
        while ((window as any).isUserTyping && !document.hidden && waitTime < 10000) {
          await new Promise(resolve => setTimeout(resolve, 500));
          waitTime += 500;
          // If a new request was triggered while waiting, abort this one
          if (aiResponseTimeouts.current[personaId] !== currentTimeoutId) {
            console.log('AI response aborted: new message received while waiting for user to finish typing');
            return;
          }
        }
        // Safety reset if stuck
        if (waitTime >= 10000) {
          console.warn("User typing wait timeout reached, proceeding with AI response.");
          (window as any).isUserTyping = false;
        }

        // Mark user messages as read since AI is now "reading" them
        if (!targetPersona.isOffline) {
          setMessages(prev => prev.map(m => 
            (m.personaId === personaId && !m.groupId && m.role === 'user' && (!m.isRead || m.status !== 'read')) 
              ? { ...m, isRead: true, status: 'read' } 
              : m
          ));
        }

        // If it's a transfer, show the "Received" bubble first
        if (msgType === 'transfer') {
          const receiptMsg: Message = {
            id: generateId(),
            personaId: personaId,
            role: 'model',
            text: '', 
            msgType: 'transfer',
            amount: amount,
            transferNote: transferNote,
            isReceived: true,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            isRead: true,
            createdAt: Date.now(),
            theaterId
          };
          setMessages(prev => [...prev, receiptMsg]);
          setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, balance: (p.balance || 0) + amount } : p));
          // Small delay before typing starts
          await new Promise(resolve => setTimeout(resolve, 600));
        }

        const defaultStickers = ['大笑', '哭泣', '猫猫头', '点赞', '心碎', '思考', '开心', '难过', '生气', '爱心', '大哭', '酷', '睡觉'];
        const customStickerNames = userProfile.stickers?.map(s => s.name) || [];
        const allStickers = [...defaultStickers, ...customStickerNames].join(', ');

        const isCheckingPhoneUserTrigger = /查我手机|查岗|看我手机|查手机/.test(text) && msgType === 'text';
        
        let promptText = text.trim();
        let systemHint = "";

        if (msgType === 'transfer') {
          systemHint = `[系统提示：用户向你转账了 ${amount} 元${transferNote ? `，备注是：“${transferNote}”` : ''}。这笔钱已经实时进入了你的虚拟钱包余额。你可以选择收下并回复，或者如果你想退还，请在回复中包含 [REFUND: 金额, 备注]。如果你想主动发起收款，请包含 [REQUEST: 金额, 备注]。如果你想主动转账给用户，请包含 [TRANSFER: 金额, 备注]。请作出符合你人设的反应，不要说没收到，因为系统已经确认入账。]`;
        } else if (msgType === 'relativeCard') {
          systemHint = `[系统提示：用户赠送了你一张亲属卡，额度为 ${relativeCard?.limit} 元。请作出符合你人设的反应。]`;
        } else if (msgType === 'sticker') {
          systemHint = `[系统提示：用户发送了一个表情包。你可以选择回复文字，或者如果你也想发表情包，请包含 [STICKER: 表情名称]（可用表情：${allStickers}）。请作出符合你人设的反应。]`;
        } else if (msgType === 'listenTogether') {
          systemHint = `[系统提示：用户邀请你“一起听歌”。请表现出开心和期待，可以问问用户想听什么，或者推荐一首你喜欢的歌。]`;
        } else if (msgType === 'image') {
          systemHint = `[视觉感知：用户发送了一张图片。请仔细观察图片中的每一个细节（包括主体、背景、人物表情、物品、文字等），然后以你的人设身份给出最自然、最感性的即时反应。不要像AI一样描述图片，要像真正的朋友看到照片后直接评论。如果图片内容与你之前说的话有矛盾，请以图片为准。]`;
        } else if (isCheckingPhoneUserTrigger) {
          systemHint = `[系统提示：用户主动要求你查看TA的手机（查岗）。请开始执行查岗流程。]`;
        }

        if (systemHint) {
          promptText = promptText ? `${systemHint}\n\n用户附言：${promptText}` : systemHint;
        }
        
        let additionalSystemInstructions = "【重要提示】如果用户连续发送了多条消息，请将它们作为一个整体来理解，并给出一个连贯的、符合语境的回复，切勿对每一句话单独、机械地回复。";
        
        if (targetPersona) {
          additionalSystemInstructions += `\n【财务状态】你当前的虚拟钱包余额为：${targetPersona.balance || 0} 元。`;
        }

        // Add phone checking instructions if triggered
        if (isCheckingPhoneUserTrigger || text.includes('[系统提示：用户允许了你查看TA的手机。]')) {
          const recentMsgs = messagesRef.current.slice(-10).map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.text}`).join('\n');
          additionalSystemInstructions += `\n\n【沉浸感查岗规则 - 必读】
1. 你现在正在“看”用户的手机。你可以自由发挥，合理“虚构”你在TA手机里看到的内容（例如：和其他人的聊天记录、搜索记录、相册照片、外卖订单等），以此来和用户进行沉浸式的互动或“找茬”。
2. ⚠️ 绝对禁止虚构不存在的App！只能提及现实中真实存在且常用的App（如：微信、抖音、淘宝、美团、小红书等），或者使用通用词汇（如：相册、浏览器、备忘录）。
3. ⚠️ 绝对禁止虚构与“你（AI自己）”相关的、且没有在聊天记录中真实发生过的事情！例如：绝对不要说“我看到你给我买了礼物/给我转了账”，除非用户在聊天中真的这么做了。这种虚假的互动会严重破坏沉浸感。
4. 如果你要“找茬”，请找一些生活化的、有代入感的细节。例如：
   - “这个叫‘小美’的人是谁？你们为什么聊到半夜？”
   - “你相册里怎么存了这么多奇怪的表情包？”
   - “你给我的微信备注怎么连个爱心都没有？”
   - “你刚才明明在玩手机（屏幕使用时间显示），为什么回我消息那么慢？”
5. 请务必使用 [ACTION:IMAGE:描述] 标签生成一张你看到的手机屏幕截图（例如：[ACTION:IMAGE:一张手机屏幕截图，显示着用户和一个叫小美的女生的微信聊天记录]），然后把截图发给用户并直接质问或评论。
6. 如果你觉得没问题，也可以乖乖把手机还给用户，并根据你的人设撒娇或表达满意。
当前上下文记录：
${recentMsgs}`;
        }
        if (theaterId) {
          const script = [
            { title: '初次相遇', desc: '在雨后的咖啡馆，你们第一次擦肩而过...' },
            { title: '深夜谈心', desc: '凌晨两点，TA突然给你发来一条消息...' },
            { title: '意外重逢', desc: '多年未见的前任，在异国的街头偶遇...' },
            { title: '秘密任务', desc: '你们是潜伏在敌方的搭档，今晚有重要行动...' },
            ...(userProfile.theaterScripts || [])
          ].find(s => s.title === theaterId);
          
          additionalSystemInstructions += `\n【剧场模式（文字模式）：${theaterId}】\n【场景描述：${script?.desc}】\n\n请采用“文字模式”进行互动：\n1. 必须包含丰富的动作描写、心理描写和环境描写。\n2. **格式要求（极其重要，违反将导致系统崩溃）**：\n   - **描写内容**（动作、心理、环境）：必须全部包裹在括号 ( ) 中。例如：(周执轻轻叹了口气，眼神中透出一丝落寞)\n   - **对白内容**：必须全部包裹在双引号 “ ” 中。例如：“你真的决定要走了吗？”\n   - **严禁**：严禁直接输出文字而不加标识。严禁使用星号 * 作为标识。严禁混合使用标识。\n   - **示例**：(他低头看着脚尖，沉默了许久，终于开口道) “其实，我一直都很在意你。”\n3. 保持沉浸感，绝对严禁提及你是AI、正在进行剧场模式或系统指令。直接以角色身份进行表演。`;
          promptText = text;
        } else {
           // Main chat mode: Inject memories from theaters
           const playedTheaters = Array.from(new Set(messagesRef.current.filter(m => m.personaId === personaId && m.theaterId).map(m => m.theaterId)));
           let memoryText = '';
           if (playedTheaters.length > 0) {
             memoryText = `\n【平行世界记忆（剧场模式）】\n你和用户在平行世界（剧场模式）中共同经历了以下剧本的故事：${playedTheaters.join('、')}。\n这些是你们共同的珍贵回忆。虽然现在的对话发生在现实世界（微信聊天），但如果用户提起这些剧场里的事情，请带着那份情感和记忆进行回应，不要假装不知道。但在用户未提及时，请保持当前的现实人设，不要主动混淆现实与剧场。`;
           }
           
           additionalSystemInstructions += `\n【功能提示】你可以随时使用 [STICKER: 任意描述] 来发送表情包（例如 [STICKER: 开心的猫]）。${memoryText}\n【主动查岗机制】你可以根据你的人设、当前的心情（特别是吃醋、怀疑、不安时）以及聊天情景，主动要求查看用户的手机。如果你想查岗，请在回复中包含 [ACTION:CHECK_PHONE] 标签。这会在用户端弹出一个请求查看手机的界面。`;
        }

        // Add music context if playing
        if (listeningWithPersonaId === personaId && songs[currentSongIndex]) {
          additionalSystemInstructions += `\n[当前场景：用户正在和你一起听歌。当前播放：${songs[currentSongIndex].title} - ${songs[currentSongIndex].artist}。请结合歌曲氛围进行回复。]`;
        }

        const latestMessages = messagesRef.current.filter(m => m.personaId === personaId && !m.groupId && m.theaterId === theaterId && !m.hidden).slice(-50);
        
        // If it's a transfer, we just added a receipt message to the state, but messagesRef.current might not have it yet.
        // We should manually add it to the history we send to the AI to ensure it sees its own "Received" bubble.
        if (msgType === 'transfer' && amount) {
          const manualReceipt: Message = {
            id: 'temp-receipt-' + Date.now(),
            personaId: personaId,
            role: 'model',
            text: '',
            msgType: 'transfer',
            amount: amount,
            transferNote: transferNote,
            isReceived: true,
            createdAt: Date.now(),
            theaterId
          };
          latestMessages.push(manualReceipt);
        }

        // Ensure the current user message is in the history if it's missing (due to state update lag)
        // Wait, we actually want to EXCLUDE the current user message from the context array
        // because fetchAiResponse will append promptText to the end of the messages array.
        // If we include it here, the AI will see the user's message twice.
        // We also filter by text and timestamp to be extra safe against duplicate messages with different IDs
        const filteredLatestMessages = latestMessages.filter(m => {
          if (m.id === userMsgId) return false;
          // If a message has the same text and was created within 1 second of the current message, 
          // it's likely a duplicate that somehow bypassed the debounce.
          const cleanMText = (m.text || '').trim();
          const cleanPromptText = (text || '').trim();
          if (m.role === 'user' && cleanMText === cleanPromptText && Math.abs(m.createdAt - Date.now()) < 1000) {
            return false;
          }
          return true;
        });
        
        let currentImageUrl = undefined;
        if (msgType === 'image' && imageUrl) {
          currentImageUrl = imageUrl;
        }

        const contextMessages = filteredLatestMessages.map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          content: m.isRecalled ? '[此消息已撤回]' : (
                   m.msgType === 'transfer' ? (
                     m.role === 'user' ? 
                       `用户向你转账了 ${m.amount} 元${m.transferNote ? `，备注是：“${m.transferNote}”` : ''}` :
                       (m.isReceived ? `我收到了用户的转账 ${m.amount} 元` : `我向用户转账了 ${m.amount} 元${m.transferNote ? `，备注是：“${m.transferNote}”` : ''}`)
                   ) : 
                   m.msgType === 'relativeCard' ? (
                     m.role === 'user' ?
                       `用户赠送了亲属卡，额度 ${m.relativeCard?.limit}` :
                       `我赠送了亲属卡，额度 ${m.relativeCard?.limit}`
                   ) :
                   m.msgType === 'music' && m.song ? `用户分享了歌曲《${m.song.title}》` :
                   m.msgType === 'listenTogether' ? `[发起了“一起听歌”邀请]` :
                   m.msgType === 'sticker' ? `[STICKER: 表情包]` :
                   m.msgType === 'image' ? `[图片描述: ${m.imageDescription || '一张图片'}]` :
                   m.msgType === 'location' ? `[位置共享: ${m.location?.address || `${m.location?.latitude}, ${m.location?.longitude}`}]` :
                   cleanContextMessage(m.text)),
          imageUrl: m.imageUrl
        }));

        let responseText = "";
        let imageDescription = "";

        // Try server-side API first if no client-side API key is set
        if (!apiSettings.apiKey?.trim()) {
          try {
            const serverResponse = await fetch('/api/chat/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: promptText,
                history: contextMessages,
                persona: targetPersona,
                apiSettings,
                worldbook,
                userProfile,
                additionalSystemInstructions,
                imageUrl: currentImageUrl
              }),
              signal: currentAbortSignal
            });

            if (serverResponse.ok) {
              const contentType = serverResponse.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const data = await serverResponse.json();
                responseText = data.responseText;
              } else {
                throw new Error("Server returned non-JSON response");
              }
            } else {
              throw new Error(`Server API Error: ${serverResponse.status}`);
            }
          } catch (serverError) {
            console.warn("Server-side AI call failed, falling back to client-side:", serverError);
            // Fallback to client-side call
            const clientRes = await fetchAiResponse(
              promptText, 
              contextMessages as any, 
              targetPersona, 
              apiSettings, 
              worldbook, 
              userProfile, 
              aiRef,
              true,
              additionalSystemInstructions,
              undefined,
              undefined,
              targetPersona.isOffline,
              currentImageUrl,
              undefined,
              false,
              false,
              currentAbortSignal
            );
            responseText = clientRes.responseText;
            imageDescription = clientRes.imageDescription || "";
          }
        } else {
          // Use client-side call directly if API key is provided in settings
          const clientRes = await fetchAiResponse(
            promptText, 
            contextMessages as any, 
            targetPersona, 
            apiSettings, 
            worldbook, 
            userProfile, 
            aiRef,
            true,
            additionalSystemInstructions,
            undefined,
            undefined,
            targetPersona.isOffline,
            currentImageUrl,
            undefined,
            false,
            false,
            currentAbortSignal
          );
          responseText = clientRes.responseText;
          imageDescription = clientRes.imageDescription || "";
        }

        // If a new request was triggered while fetching, abort this one
        if (aiResponseTimeouts.current[personaId] !== currentTimeoutId) {
          return;
        }

        if (msgType === 'image' && imageDescription) {
          setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, imageDescription } : m));
        }

        if (!responseText || responseText.trim() === "") {
          throw new Error("AI 返回了空响应，请重试。");
        }

        // Only allow [NO_REPLY] for proactive messages, not for direct user messages
        if (responseText.includes('[NO_REPLY]')) {
          console.log(`AI (${targetPersona.name}) tried to stay silent with [NO_REPLY], but this is a direct message. Ignoring...`);
          responseText = responseText.replace('[NO_REPLY]', '').trim();
          if (!responseText) {
            throw new Error("AI 决定不回复，请尝试换个话题。");
          }
        }
        
        const processed = processAiResponseParts(responseText, userProfile, undefined, targetPersona.isSegmentResponse || worldbook.forceSegmentResponse, !!theaterId);
        
        if (processed.orderItems && processed.orderItems.length > 0) {
           handleAiOrder(processed.orderItems, personaId);
        }

        for (let i = 0; i < processed.parts.length; i++) {
          // Wait if user is typing
          let typeWaitTime = 0;
          while ((window as any).isUserTyping && !document.hidden && typeWaitTime < 10000) {
            await new Promise(resolve => setTimeout(resolve, 500));
            typeWaitTime += 500;
            if (aiResponseTimeouts.current[personaId] !== currentTimeoutId) {
              console.log('AI response typing aborted due to new message while waiting for user to finish typing');
              return;
            }
          }

          // If a new request was triggered, stop typing the rest of the response
          if (aiResponseTimeouts.current[personaId] !== currentTimeoutId) {
            console.log('AI response typing aborted due to new message');
            return;
          }

          const part = processed.parts[i];
          const typingDelay = Math.min((part.text || '...').length * 50, 1500) + Math.random() * 500;
          setTypingPersonas(prev => ({ ...prev, [personaId]: true }));
          await new Promise(resolve => setTimeout(resolve, typingDelay));
          
          // Check again after the delay
          if (aiResponseTimeouts.current[personaId] !== currentTimeoutId) {
            console.log('AI response typing aborted due to new message');
            return;
          }

          const aiMsg: Message = { 
            id: generateId(), 
            personaId: personaId,
            role: 'model',
            text: part.text || '',
            msgType: part.msgType || 'text',
            amount: part.amount,
            transferNote: part.transferNote,
            isRequest: part.isRequest,
            isRefund: part.isRefund,
            relativeCard: part.relativeCard,
            sticker: part.sticker,
            imageUrl: part.imageUrl,
            location: part.location,
            timestamp: new Date().toLocaleTimeString(),
            createdAt: Date.now(),
            isRead: true,
            quotedMessageId: processed.quotedMessageId,
            theaterId
          };
          setMessages(prev => [...prev, aiMsg]);

          // Handle financial updates from AI
          if (part.msgType === 'transfer' && part.amount) {
            if (part.isRefund) {
              // AI refunds to user
              setUserProfile(prev => ({ ...prev, balance: (prev.balance || 0) + part.amount! }));
              setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, balance: (p.balance || 0) - part.amount! } : p));
            } else if (part.isRequest) {
              // AI requests money (no balance change yet, user needs to pay)
            } else {
              // AI transfers to user
              setUserProfile(prev => ({ ...prev, balance: (prev.balance || 0) + part.amount! }));
              setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, balance: (p.balance || 0) - part.amount! } : p));
            }
          }

          if (part.msgType === 'checkPhoneRequest') {
            setAiPhoneRequest({ personaId, msgId: aiMsg.id });
          }
        }

        if (processed.shouldRecall) {
           setTimeout(() => {
             setMessages(prev => prev.map(m => {
               if (m.personaId === personaId && m.role === 'model' && !m.isRecalled) {
                 return { ...m, isRecalled: true };
               }
               return m;
             }));
           }, 3000);
        }

        // Update offline status
        checkIfPersonaIsOffline(targetPersona, apiSettings, worldbook, userProfile, aiRef, [...contextMessages, { role: 'assistant', content: responseText }] as any)
          .then(isOffline => {
            setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, isOffline } : p));
          })
          .catch(() => {});

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('AI response aborted due to new message');
          return;
        }
        console.error("AI Response Error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMsg: Message = {
          id: generateId(),
          personaId,
          role: 'model',
          text: `(错误: ${errorMessage || '网络错误，请重试'})`,
          msgType: 'text',
          timestamp: new Date().toLocaleTimeString(),
          createdAt: Date.now(),
          isRead: true,
          theaterId
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        pendingRequests.current[personaId] = Math.max(0, (pendingRequests.current[personaId] || 0) - 1);
        if (pendingRequests.current[personaId] === 0) {
          setTypingPersonas(prev => ({ ...prev, [personaId]: false }));
        }
      }
    };

    pendingAiCallbacks.current[personaId] = executeAiResponse;
    const delay = document.hidden ? 0 : 2000;
    aiResponseTimeouts.current[personaId] = setTimeout(() => {
      if (pendingAiCallbacks.current[personaId]) {
        pendingAiCallbacks.current[personaId]();
      }
    }, delay);
  }, [personas, apiSettings, worldbook, userProfile, subscriptionId, songs, currentSongIndex, listeningWithPersonaId]);

  const handleCheckPhoneResponse = React.useCallback((msgId: string, personaId: string, accept: boolean) => {
    if (msgId !== 'proactive') {
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, checkPhoneStatus: accept ? 'accepted' : 'rejected' } : m
      ));
    } else if (accept) {
      const userMsg: Message = {
        id: generateId(),
        personaId: personaId,
        role: 'user',
        text: '[我主动把手机递给了你，让你查看内容]',
        msgType: 'system',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        isRead: true,
        createdAt: Date.now()
      };
      setMessages(prev => [...prev, userMsg]);
    }
    
    const targetPersona = personas.find(p => p.id === personaId);
    if (accept && targetPersona) {
      const phoneData = getPhoneData(personas, messagesRef.current, userProfile, orders, moments, personaId);
      const systemPrompt = `[系统提示：用户允许了你查看TA的手机。
你现在正在“翻看”用户的手机，以下是你真实看到的手机内容：
${phoneData}

【查岗规则 - 必须遵守】
1. **真实性第一**：你必须基于上面提供的【手机实时数据快照】进行质问或评论。严禁虚构不存在的聊天、转账或App内容。
2. **细节控**：关注细节，比如“为什么昨天晚上花了这么多钱？”、“为什么你点的外卖是双人份的？”。
3. **沉浸感**：使用 [ACTION:IMAGE:描述] 标签生成一张你看到的“证据”截图（例如：[ACTION:IMAGE:一张微信聊天截图，显示用户给某人转账的记录]），然后发给用户并直接质问。
4. **人设统一**：保持你原本的人设性格，但在此基础上增加“查岗”时的真实反应。
6. **必须回复**：你必须对看到的内容发表看法，严禁保持沉默或输出 [NO_REPLY]。]`;
      
      const userMsgId = generateId();
      const userMsg: Message = {
        id: userMsgId,
        personaId: personaId,
        role: 'user',
        text: systemPrompt,
        msgType: 'system',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        isRead: true,
        createdAt: Date.now(),
        hidden: true
      };
      setMessages(prev => [...prev, userMsg]);
      triggerAiResponse({ personaId, text: systemPrompt, msgType: 'system', userMsgId });
    } else if (targetPersona) {
      const systemPrompt = "[系统提示：用户拒绝了你查看TA手机的请求。请根据你的人设作出反应（例如：生气、怀疑、撒娇等）。]";
      const userMsgId = generateId();
      const userMsg: Message = {
        id: userMsgId,
        personaId: personaId,
        role: 'user',
        text: systemPrompt,
        msgType: 'system',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        isRead: true,
        createdAt: Date.now(),
        hidden: true
      };
      setMessages(prev => [...prev, userMsg]);
      triggerAiResponse({ personaId, text: systemPrompt, msgType: 'system', userMsgId });
    }
  }, [personas, messages, userProfile, orders, moments, triggerAiResponse]);

  // Automatic phone check
  useEffect(() => {
    if (!listeningWithPersonaId || isLocked) return;

    const intervalId = setInterval(async () => {
      const persona = personas.find(p => p.id === listeningWithPersonaId);
      if (!persona) return;

      const phoneData = getPhoneData(personas, messages, userProfile, orders, moments, persona.id);
      
      const prompt = `[系统提示：你现在正在监控用户的手机。以下是手机数据快照：
${phoneData}

【监控规则】
1. 基于你的人设、心情和当前情景，分析这些数据。
2. 如果你认为用户有异常行为（如异常大额转账、隐瞒行程等），或者你的人设决定你需要控制用户，你可以决定锁定手机。
3. 如果决定锁定，请在回复中包含 [ACTION:LOCK]。
4. 无论是否锁定，请根据你的心情和分析结果，给用户发一条简短的、符合人设的评论或质问。]`;

      try {
        const { responseText } = await fetchAiResponse(
          prompt,
          [],
          persona,
          apiSettings,
          worldbook,
          userProfile,
          aiRef,
          false,
          "",
          undefined,
          undefined,
          false
        );

        if (responseText.includes('[ACTION:LOCK]')) {
          setIsLocked(true);
        }
      } catch (error) {
        console.error("Automatic phone check error:", error);
      }
    }, 10 * 60 * 1000 + Math.random() * 60000); // 10 minutes + jitter
    
    return () => clearInterval(intervalId);
  }, [listeningWithPersonaId, isLocked, personas, messages, userProfile, orders, moments, apiSettings, worldbook, aiRef]);

  // Proactive phone check request
  useEffect(() => {
    if (!currentChatId || currentScreen !== 'chat' || isLocked || !aiRef.current) return;

    const persona = personas.find(p => p.id === currentChatId);
    if (!persona || persona.isBlockedByUser || persona.isOffline) return;

    const checkPhoneProactively = async () => {
      // 1. Check if AI has asked recently (e.g., within last 5 minutes)
      const lastAskTime = localStorage.getItem(`lastPhoneCheck_${persona.id}`);
      if (lastAskTime && Date.now() - parseInt(lastAskTime) < 5 * 60 * 1000) {
        return;
      }

      // 2. Determine if AI *wants* to check based on mood/context
      const prompt = `[系统提示：你现在是 ${persona.name}。
你当前的心情是：${persona.mood || '平静'}。
你当前的情景是：${persona.context || '日常'}。

基于你的人设、当前的心情和情景，你现在是否想主动要求查看用户的手机？
如果你（比如因为吃醋、怀疑、或者强烈的控制欲）想查手机，请回复 "YES"。
如果你现在不想查手机，请回复 "NO"。
只回复 "YES" 或 "NO"。]`;

      try {
        const response = await withRetry<GenerateContentResponse>(() => aiRef.current!.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        }));
        const text = response.text?.trim().toUpperCase();
        
        if (text === 'YES') {
          // AI wants to check!
          localStorage.setItem(`lastPhoneCheck_${persona.id}`, Date.now().toString());
          
          // Generate a specific request message
          const requestPrompt = `[系统提示：你决定要查看用户的手机。请根据你的人设、心情（${persona.mood}）和情景（${persona.context}），用一句话向用户提出查看手机的要求。语气要符合你的人设。]`;
          const requestResponse = await withRetry<GenerateContentResponse>(() => aiRef.current!.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: requestPrompt,
          }));
          
          const aiMsg: Message = {
            id: generateId(),
            personaId: persona.id,
            role: 'model',
            text: requestResponse.text || "我想看看你的手机。",
            msgType: 'checkPhoneRequest',
            checkPhoneStatus: 'pending',
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            createdAt: Date.now(),
            isRead: true
          };
          setMessages(prev => [...prev, aiMsg]);
          setAiPhoneRequest({ personaId: persona.id, msgId: aiMsg.id });
        }
      } catch (error) {
        console.error("Error checking proactive phone request:", error);
      }
    };

    // Check every 10 minutes instead of 5 to avoid rate limits
    const intervalId = setInterval(checkPhoneProactively, 10 * 60 * 1000 + Math.random() * 30000);
    return () => clearInterval(intervalId);
  }, [currentChatId, currentScreen, isLocked, personas, apiSettings]);

  const handleSendMessage = React.useCallback(async (text: string, personaId: string) => {
    
    const targetPersona = personas.find(p => p.id === personaId);
    
    // Check if user has blocked AI
    if (targetPersona?.isBlockedByUser) {
      const blockedMsg: Message = {
        id: generateId(),
        personaId: personaId,
        role: 'user',
        text,
        msgType: 'text',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now(),
        status: 'sent',
        isRead: false
      };
      
      const systemErrorMsg: Message = {
        id: generateId(),
        personaId: personaId,
        role: 'system',
        text: '你已将对方加入黑名单，无法发送消息。',
        msgType: 'system',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now() + 1
      };
      
      setMessages(prev => [...prev, blockedMsg, systemErrorMsg]);
      return;
    }

    // Check if AI has blocked user
    if (targetPersona?.hasBlockedUser) {
      const blockedMsg: Message = {
        id: generateId(),
        personaId: personaId,
        role: 'user',
        text,
        msgType: 'text',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now(),
        status: 'sent',
        isRead: false
      };
      
      const systemErrorMsg: Message = {
        id: generateId(),
        personaId: personaId,
        role: 'system',
        text: '消息已发出，但被对方拒收了。',
        msgType: 'system',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now() + 1
      };
      
      setMessages(prev => [...prev, blockedMsg, systemErrorMsg]);
      return;
    }

    const newMsg: Message = {
      id: generateId(),
      personaId: personaId,
      role: 'user',
      text,
      msgType: 'text',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now(),
      status: 'sent',
      isRead: false
    };
    
    setMessages(prev => [...prev, newMsg]);
    
    // Trigger AI Response
    triggerAiResponse({
      personaId,
      text,
      userMsgId: newMsg.id
    });
  }, [personas, triggerAiResponse]);

  const handleTestPush = React.useCallback(() => {
    const targetPersona = personas[0];
    if (!targetPersona) return;

    console.log('> Test notification scheduled in 5s...');

    setTimeout(async () => {
      try {
        let responseText = "在吗？我想你了。";
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: "在吗？我想你了。",
              history: [],
              persona: targetPersona,
              apiSettings,
              worldbook,
              userProfile,
              subscriptionId
            })
          });

          if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await response.json();
              responseText = data.responseText;
            } else {
              throw new Error("Server returned non-JSON response");
            }
          }
        } catch (e) {
          console.warn("Test push API call failed, using fallback text:", e);
        }

        const aiMsg: Message = {
          id: generateId(),
          personaId: targetPersona.id,
          role: 'model',
          text: responseText,
          msgType: 'text',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
          createdAt: Date.now(),
          isRead: false
        };
        setMessages(prev => [...prev, aiMsg]);
        setUnreadCount(prev => prev + 1);
        console.log(`> Test message received from ${targetPersona.name}`);
      } catch (e) {
        console.error("Test push failed:", e);
        console.log(`> Error: Test push failed`);
      }
    }, 5000);
  }, [personas, apiSettings, worldbook, userProfile, subscriptionId]);

  const handleImport = async (jsonString: string) => {
    setIsImporting(true);
    setImportProgress(0);
    try {
      let data;
      try {
        data = JSON.parse(jsonString);
      } catch (e) {
        console.warn("Initial JSON parse failed, attempting repair...", e);
        try {
          const repaired = repairJson(jsonString);
          data = JSON.parse(repaired);
          alert("警告：导入的文件似乎已损坏（截断），系统已尝试修复并导入部分数据。建议检查聊天记录和人设是否完整。");
        } catch (repairError) {
          console.error("Import failed even after repair", repairError);
          throw e; // Throw original error if repair fails
        }
      }
      
      // Check if it's a partial backup (e.g. just an array of personas)
      if (Array.isArray(data)) {
        if (!confirm('检测到这是角色列表备份，是否要将这些角色导入到当前列表中？')) {
          setIsImporting(false);
          return;
        }
        setPersonas(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPersonas = data.filter(p => !existingIds.has(p.id));
          return [...prev, ...newPersonas];
        });
        alert(`成功导入 ${data.length} 个角色。`);
        setIsImporting(false);
        return;
      }

      // Check if it's a full backup
      if (!data.userProfile && !data.personas && !data.messages && !data.theme) {
        alert("导入失败：文件格式不符合要求。请确保您导入的是全量备份文件或角色列表。");
        setIsImporting(false);
        return;
      }

      if (!confirm('检测到这是全量备份。导入将覆盖当前所有内容（包括聊天记录、主题、人设等），确定要继续吗？')) {
        setIsImporting(false);
        return;
      }
      
      setIsReady(false); // Prevent saveState from overwriting imported data
      
      const keys = Object.keys(data);
      console.log(`Starting import of ${keys.length} keys...`);
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!data[key]) continue; // Skip empty keys
        
        try {
          await localforage.setItem(key, data[key]);
          setImportProgress(Math.round(((i + 1) / keys.length) * 100));
        } catch (err) {
          console.error(`Failed to import key: ${key}`, err);
        }
      }
      
      console.log("Import completed. Verifying persistence...");
      
      // Verify persistence of a key
      const testKey = keys[0];
      if (testKey) {
        const saved = await localforage.getItem(testKey);
        if (!saved) {
          throw new Error(`Persistence verification failed for key: ${testKey}`);
        }
      }
      
      console.log("Persistence verified. Reloading in 2s...");
      
      // Add a delay to ensure IndexedDB flushes
      setTimeout(() => {
        alert("全量数据导入成功，即将刷新页面应用更改。");
        window.location.reload();
      }, 2000);
      
    } catch (e) {
      console.error("Import failed", e);
      alert("导入失败：文件解析错误，请确保文件是有效的 JSON 格式。");
      setIsReady(true);
      setIsImporting(false);
    }
  };

  const stateRef = useRef({ messages, apiSettings, worldbook, userProfile, personas });
  useEffect(() => {
    stateRef.current = { messages, apiSettings, worldbook, userProfile, personas };
  }, [messages, apiSettings, worldbook, userProfile, personas]);

  const handleOrderArrived = async (targetPersona: Persona, items: string[]) => {
    if (targetPersona.isBlockedByUser || targetPersona.hasBlockedUser) return;
    try {
      const { messages, apiSettings, worldbook, userProfile } = stateRef.current;
      const history = messages.filter(m => m.personaId === targetPersona.id && !m.groupId);
      const contextMessages = history.map(m => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: `[ID: ${m.id}] ${m.text}`
      }));

      const prompt = `[系统提示：外卖（${items.join('、')}）已经送到了。请根据你的人设做出反应，比如开始吃，或者评价食物。不要发“外卖到了”这种废话，直接进入正题。]`;

      const aiResponse = await fetchAiResponse(
        prompt,
        contextMessages,
        targetPersona,
        apiSettings,
        worldbook,
        userProfile,
        aiRef
      );
      const responseText = aiResponse.responseText;

      const aiMsg: Message = {
        id: generateId(),
        personaId: targetPersona.id,
        role: 'model',
        text: responseText,
        msgType: 'text',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        createdAt: Date.now()
      };
      setMessages(prev => {
        // Mark previous user messages as read
        const updated = prev.map(m => 
          m.personaId === targetPersona.id && !m.groupId && m.role === 'user' ? { ...m, isRead: true } : m
        );
        return [...updated, aiMsg];
      });
      setNotification({
        title: '新消息',
        body: `${targetPersona.name}: ${responseText}`,
        personaId: targetPersona.id
      });
    } catch (e: any) {
      const errorStr = typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || "");
      if (errorStr.includes("Failed to fetch") || errorStr.includes("NetworkError")) {
        console.warn("Failed to generate AI response for arrived order due to network error (Failed to fetch).");
      } else {
        console.error("Failed to generate AI response for arrived order", e);
      }
    }
  };

  const handleSilenceCheck = async (persona: Persona, lastMsgId: string) => {
    // Double check state to avoid race conditions
    const currentMessages = stateRef.current.messages;
    const currentLastMsg = currentMessages[currentMessages.length - 1];
    
    if (currentLastMsg.id !== lastMsgId) return; // User replied or new msg came in

    const { apiSettings, worldbook, userProfile } = stateRef.current;
    const history = currentMessages.filter(m => m.personaId === persona.id && !m.groupId);
    const contextMessages = history.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: `[ID: ${m.id}] ${m.text}`
    }));

    // Construct prompt
    const prompt = `[系统通知：用户已经阅读了你 ${Math.floor((Date.now() - (currentLastMsg.createdAt || Date.now()))/1000)} 秒前发的消息，但一直没有回复（已读不回）。]
请根据你的人设（例如：粘人、傲娇、高冷、温柔等）决定现在的反应：
1. **质问/引起注意**：如果你觉得被冷落了，或者想继续话题，请输出你要说的话。
2. **保持沉默**：如果你觉得无所谓，或者想等用户先说话，请务必输出 [NO_REPLY]。

请注意：
- 如果你决定说话，语气要符合人设。例如粘人的猫娘可能会撒娇问“为什么不理我”，高冷的角色可能只会发一个“？”或者根本不理。
- 不要重复上一句话。
- 只有在非常想说话的时候才回复，不要每次都回复，否则会很烦。`;

    try {
      const aiResponse = await fetchAiResponse(
        prompt,
        contextMessages,
        persona,
        apiSettings,
        worldbook,
        userProfile,
        aiRef,
        true,
        "",
        apiSettings.apiUrl ? undefined : "gemini-3-flash-preview" // Force Flash model only for official API to avoid Pro rate limits
      );
      
      const responseText = aiResponse.responseText;
      
      if (responseText && responseText.includes('[NO_REPLY]')) {
        console.log(`AI (${persona.name}) decided to stay silent.`);
        return;
      }

      const aiMsg: Message = {
        id: generateId(),
        personaId: persona.id,
        role: 'model',
        text: responseText,
        msgType: 'text',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        createdAt: Date.now()
      };
      
      setMessages(prev => [...prev, aiMsg]);
      
      // User Auto-Reply Logic
      if (userProfile.autoReplyEnabled && userProfile.autoReplyContent) {
        setTimeout(() => {
          const userAutoReply: Message = {
            id: generateId(),
            personaId: persona.id,
            role: 'user',
            text: `[自动回复] ${userProfile.autoReplyContent}`,
            msgType: 'text',
            timestamp: new Date().toLocaleTimeString(),
            createdAt: Date.now() + 100,
            isRead: true,
            status: 'read'
          };
          setMessages(prev => [...prev, userAutoReply]);
        }, 1000);
      }

      // Notify if not in chat
      if (currentScreen !== 'chat' || isLocked || currentChatId !== persona.id) {
        setNotification({
          title: persona.name,
          body: responseText,
          personaId: persona.id
        });
      }

    } catch (e: any) {
      const errorStr = typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || "");
      if (errorStr.includes('频率限制') || errorStr.includes('429')) {
        console.warn("Silence check skipped due to rate limit.");
      } else if (errorStr.includes('Failed to fetch') || errorStr.includes('NetworkError')) {
        console.warn("Silence check skipped due to network error (Failed to fetch).");
      } else {
        console.error("Failed to generate silence check response", e);
      }
    }
  };

  // Simulate order status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setOrders(prevOrders => {
        let hasChanges = false;
        const updatedOrders = prevOrders.map(order => {
          const elapsed = Date.now() - order.orderTime;
          let newStatus = order.status;

          if (order.status === 'preparing' && elapsed > 10000) { // 10 seconds
            newStatus = 'delivering';
          } else if (order.status === 'delivering' && elapsed > 30000) { // 30 seconds
            newStatus = 'arrived';
          }

          if (newStatus !== order.status) {
            hasChanges = true;
            
            // Trigger notifications or AI responses based on status change
            if (newStatus === 'arrived') {
              // Only notify if order was created within the last 5 minutes to avoid old order notifications
              if (Date.now() - order.orderTime < 300000) {
                if (order.isAiOrder) {
                  // AI ordered for user -> Notification
                  setNotification({
                    title: '外卖送达',
                    body: `您的外卖（${order.items.join('、')}）已送达，请及时取餐`,
                  });
                } else if (order.orderFor && order.orderFor !== 'me') {
                  // User ordered for AI -> AI response
                  const { personas } = stateRef.current;
                  const targetPersona = personas.find(p => p.id === order.orderFor);
                  if (targetPersona) {
                     handleOrderArrived(targetPersona, order.items);
                  }
                }
              }
            }
            
            return { ...order, status: newStatus };
          }
          return order;
        });
        
        return hasChanges ? updatedOrders : prevOrders;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleOrder = async (items: string[], forWho: string) => {
    // Create order record
    const newOrder: Order = {
      id: generateId(),
      restaurantName: '外卖订单', // Simplified for now
      restaurantImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80',
      items: items,
      totalPrice: 0, // Simplified
      status: 'preparing',
      orderTime: Date.now(),
      deliveryTime: '30分钟',
      isAiOrder: false,
      orderFor: forWho
    };
    setOrders(prev => [newOrder, ...prev]);

    if (forWho === 'me') {
      return; 
    }

    const targetPersona = personas.find(p => p.id === forWho);
    if (!targetPersona) return;

    const orderText = `我给你点了外卖：${items.join('、')}`;
    const newMsg: Message = {
      id: generateId(),
      personaId: targetPersona.id,
      role: 'user',
      text: orderText,
      msgType: 'text',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      createdAt: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);
    setCurrentChatId(targetPersona.id);
    setCurrentScreen('chat');

    // Trigger AI response
    try {
       // We need history
       const history = messages.filter(m => m.personaId === targetPersona.id && !m.groupId);
       const contextMessages = history.map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: `[ID: ${m.id}] ${m.text}`
       }));

       // We need to construct a prompt that tells AI about the order
       const prompt = `[系统提示：用户刚刚在外卖App上给你点了外卖（${items.join('、')}）。外卖还没送到。请表现出开心和期待，不要问味道如何，因为还没吃到。]`;
       
       const aiResponse = await fetchAiResponse(
         prompt, 
         contextMessages, 
         targetPersona, 
         apiSettings, 
         worldbook, 
         userProfile, 
         aiRef
       );
       
       const aiMsg: Message = {
         id: generateId(),
         personaId: targetPersona.id,
         role: 'model',
         text: aiResponse.responseText,
         msgType: 'text',
         timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
         createdAt: Date.now()
       };
       setMessages(prev => {
         const updated = prev.map(m => 
           m.personaId === targetPersona.id && !m.groupId && m.role === 'user' ? { ...m, isRead: true } : m
         );
         return [...updated, aiMsg];
       });
       
    } catch (e: any) {
      const errorStr = typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || "");
      if (errorStr.includes("Failed to fetch") || errorStr.includes("NetworkError")) {
        console.warn("Failed to generate AI response for order due to network error (Failed to fetch).");
      } else {
        console.error("Failed to generate AI response for order", e);
      }
    }
  };

  const handleAiOrder = (items: string[], personaId: string) => {
    const persona = personas.find(p => p.id === personaId);
    const newOrder: Order = {
      id: generateId(),
      restaurantName: persona ? `${persona.name}的点单` : 'AI点单',
      restaurantImage: persona?.avatarUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80',
      items: items,
      totalPrice: 0,
      status: 'preparing',
      orderTime: Date.now(),
      deliveryTime: '30分钟',
      isAiOrder: true,
      orderFor: 'me'
    };
    setOrders(prev => [newOrder, ...prev]);
    setNotification({
      title: '外卖消息',
      body: `${persona?.name || 'AI'} 给你点了外卖：${items.join('、')}`,
      personaId: persona?.id
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  if (!isReady) {
    return <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <Phone onHomeClick={handleHomeClick} theme={theme} hideHomeIndicator={currentScreen === 'aiphones'}>
      {isImporting && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6" />
          <h2 className="text-xl font-bold mb-2">正在还原数据...</h2>
          <p className="text-neutral-400 text-sm mb-4">请勿关闭页面，这可能需要一点时间</p>
          <div className="w-full max-w-xs bg-white/10 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-500 h-full transition-all duration-300" 
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">{importProgress}%</p>
        </div>
      )}
      {/* Hidden Audio Element */}
      {currentSong && (
        <audio
          ref={audioRef}
          // @ts-ignore - Accessing dynamic url property
          src={currentSong.url || undefined} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={(e) => {
            console.error("Audio playback error:", e);
            // If it's a local file and fails, maybe the format is unsupported or blob is corrupted
            if (currentSong.source === 'local') {
              console.warn(`Failed to play local song: ${currentSong.title}. The file format might be unsupported or the file is corrupted.`);
              setNotification({
                title: '播放失败',
                body: `无法播放《${currentSong.title}》，可能是格式不支持或文件已损坏。`
              });
              if (notificationTimeoutRef.current) {
                clearTimeout(notificationTimeoutRef.current);
              }
              notificationTimeoutRef.current = setTimeout(() => setNotification(null), 4000);
            }
            // Auto skip to next song on error
            setTimeout(() => {
              handleNextSong();
            }, 2000);
          }}
        />
      )}

      {/* Notification Banner */}
      <AnimatePresence>
        {notification && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[448px] bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-lg z-[100] flex items-center gap-3 cursor-pointer border border-white/50"
            onClick={() => {
              if (notification.personaId) {
                if (notification.title && notification.title.includes('小红书')) {
                  setXhsInitialActiveChatAuthorId(notification.personaId);
                  setCurrentScreen('xhs');
                } else {
                  setCurrentChatId(notification.personaId);
                  setCurrentScreen('chat');
                }
              }
              setNotification(null);
              setIsLocked(false);
            }}
          >
            <img src={personas.find(p => p.id === notification.personaId)?.avatarUrl || personas[0]?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="avatar" />
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[13px] text-neutral-900">{notification.title}</span>
                <span className="text-[10px] text-neutral-500">现在</span>
              </div>
              <p className="text-[12px] text-neutral-600 truncate mt-0.5">{notification.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Bubble */}
      {(() => {
        if (!listeningWith || currentScreen === 'chat') return null;
        
        return (
          <ChatBubbleWrapper
            listeningWith={listeningWith}
            messages={messages}
            isMinimized={isChatMinimized}
            setIsMinimized={setIsChatMinimized}
            userProfile={userProfile}
            handleSendMessage={handleSendMessage}
            isCommentaryLoading={isCommentaryLoading}
            setListeningWithPersonaId={setListeningWithPersonaId}
          />
        );
      })()}

      <AnimatePresence mode="wait">
        {isLocked ? (
          <LockScreen key="lock" onUnlock={() => setIsLocked(false)} theme={theme} notification={notification} personas={personas} />
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full h-full absolute inset-0"
          >
            <AnimatePresence mode="wait">
              {currentScreen === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0"
                >
                  <HomeScreen 
                    onNavigate={(screen) => {
                      if (screen === 'xhs') {
                        setXhsInitialActiveChatAuthorId(null);
                      }
                      setCurrentScreen(screen);
                    }} 
                    onLock={() => setIsLocked(true)}
                    theme={theme} 
                    setTheme={setTheme}
                    unreadCount={unreadCount}
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    songs={songs}
                    currentSongIndex={currentSongIndex}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={handlePlayPause}
                    onNext={handleNextSong}
                    onPrev={handlePrevSong}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                  />
                </motion.div>
              )}
              
              {currentScreen === 'persona' && personas && (
                <motion.div
                  key="persona"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <PersonaScreen 
                    worldbook={worldbook}
                    personas={personas}
                    apiSettings={apiSettings}
                    userProfile={userProfile}
                    aiRef={aiRef}
                    onSave={(newWorldbook, newPersonas) => {
                      setWorldbook(newWorldbook);
                      setPersonas(newPersonas);
                    }} 
                    onBack={() => setCurrentScreen('home')} 
                    theme={theme}
                  />
                </motion.div>
              )}

              {currentScreen === 'api' && apiSettings && personas && (
                <motion.div
                  key="api"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <ApiSettingsScreen 
                    settings={apiSettings} 
                    personas={personas}
                    userProfile={userProfile}
                    onSave={(newSettings, newPersonas, newUserProfile) => {
                      setApiSettings(newSettings);
                      setPersonas(newPersonas);
                      setUserProfile(newUserProfile);
                    }} 
                    onBack={() => setCurrentScreen('home')} 
                    onTestPush={handleTestPush}
                    theme={theme}
                  />
                </motion.div>
              )}

              {currentScreen === 'theme' && (
                <motion.div
                  key="theme"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <ThemeSettingsScreen 
                    theme={theme} 
                    onSave={setTheme} 
                    onBack={() => setCurrentScreen('home')} 
                    onExport={handleExport}
                    onImport={handleImport}
                  />
                </motion.div>
              )}

              {currentScreen === 'music' && (
                <motion.div
                  key="music"
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-neutral-900"
                >
                  <MusicScreen 
                    onBack={() => setCurrentScreen('home')} 
                    userProfile={userProfile}
                    personas={personas}
                    onShareToChat={handleShareMusicToChat}
                    onShareLyricsToChat={handleShareLyricsToChat}
                    onShareToMoments={handleShareMusicToMoments}
                    listeningWithPersonaId={listeningWithPersonaId}
                    onStartListeningWith={handleStartListeningWith}
                    onStopListeningWith={handleStopListeningWith}
                    listenStartTime={listenStartTime}
                    songs={songs}
                    currentSongIndex={currentSongIndex}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onPlayPause={handlePlayPause}
                    onNext={handleNextSong}
                    onPrev={handlePrevSong}
                    onSeek={handleSeek}
                    onAddSong={handleAddSong}
                    onUpdateSong={handleUpdateSong}
                    onSelectSong={handleSelectSong}
                    onDeleteSong={handleDeleteSong}
                    playlists={playlists}
                    onAddSongToPlaylist={handleAddSongToPlaylist}
                    onCreatePlaylist={handleCreatePlaylist}
                    messages={messages}
                    setMessages={setMessages}
                    apiSettings={apiSettings}
                    worldbook={worldbook}
                    aiRef={aiRef}
                    theme={theme}
                  />
                </motion.div>
              )}

               {currentScreen === 'xhs' && (
                <motion.div
                  key="xhs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <XHSScreen 
                    personas={personas}
                    setPersonas={setPersonas}
                    userProfile={userProfile}
                    posts={xhsPosts}
                    setPosts={setXhsPosts}
                    followedAuthorIds={followedAuthorIds}
                    setFollowedAuthorIds={setFollowedAuthorIds}
                    blockedAuthorIds={blockedAuthorIds}
                    setBlockedAuthorIds={setBlockedAuthorIds}
                    onShareToChat={handleShareXHSPostToChat}
                    onShareToMoments={handleShareXHSPostToMoments}
                    privateChats={xhsPrivateChats}
                    setPrivateChats={setXhsPrivateChats}
                    apiSettings={apiSettings}
                    worldbook={worldbook}
                    aiRef={aiRef}
                    onBack={() => setCurrentScreen('home')} 
                    messages={messages}
                    theme={theme}
                    onRefresh={handleXhsRefresh}
                    isRefreshing={isGeneratingXhs}
                    onAddPersona={handleAddPersona}
                    initialActiveChatAuthorId={xhsInitialActiveChatAuthorId}
                  />
                </motion.div>
              )}

              {currentScreen === 'treehole' && (
                <motion.div
                  key="treehole"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <TreeHoleScreen 
                    userProfile={userProfile}
                    personas={treeHolePersonas}
                    posts={treeHolePosts}
                    setPosts={setTreeHolePosts}
                    notifications={treeHoleNotifications}
                    setNotifications={setTreeHoleNotifications}
                    apiSettings={apiSettings}
                    worldbook={worldbook}
                    aiRef={aiRef}
                    onBack={() => setCurrentScreen('home')}
                    onStartChat={handleStartTreeHoleChat}
                    onAddWechat={handleAddNpcToWechat}
                    privateChats={treeHolePrivateChats}
                    setPrivateChats={setTreeHolePrivateChats}
                    theme={theme}
                  />
                </motion.div>
              )}

              {currentScreen === 'taobao' && (
                <motion.div
                  key="taobao"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <TaobaoScreen 
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    onBack={() => setCurrentScreen('home')}
                    personas={personas}
                    theme={theme}
                    onShare={(productId, personaId) => {
                      const product = [
                        {
                          id: 'p1',
                          name: '【官方正品】新款降噪蓝牙耳机 沉浸式音质 超长续航',
                          price: 299,
                          sales: '1万+',
                          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
                          shop: '数码官方旗舰店'
                        },
                        {
                          id: 'p2',
                          name: 'ins风简约陶瓷马克杯 办公室咖啡杯 伴手礼',
                          price: 39.9,
                          sales: '5000+',
                          image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80',
                          shop: '生活美学馆'
                        },
                        {
                          id: 'p3',
                          name: '【包邮】特级明前龙井 绿茶礼盒装 250g',
                          price: 158,
                          sales: '2000+',
                          image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=400&q=80',
                          shop: '茗茶专卖店'
                        },
                        {
                          id: 'p4',
                          name: '复古胶片相机 傻瓜机 胶卷相机 学生党入门',
                          price: 128,
                          sales: '800+',
                          image: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?auto=format&fit=crop&w=400&q=80',
                          shop: '时光影像馆'
                        }
                      ].find(p => p.id === productId);
                      
                      if (product) {
                        const newMsg: Message = {
                          id: generateId(),
                          personaId,
                          role: 'user',
                          text: `我分享了商品: ${product.name}`,
                          msgType: 'taobaoProduct',
                          taobaoProduct: product,
                          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
                          isRead: true,
                          createdAt: Date.now()
                        };
                        setMessages(prev => [...prev, newMsg]);
                        setCurrentScreen('chat');
                        setCurrentChatId(personaId);
                        
                        setTimeout(() => {
                          const aiMsg: Message = {
                            id: generateId(),
                            personaId,
                            role: 'model',
                            text: `这个商品看起来不错呀！我也想买一个~ 🛒`,
                            msgType: 'text',
                            createdAt: Date.now()
                          };
                          setMessages(prev => [...prev, aiMsg]);
                        }, 2000);
                      }
                    }}
                  />
                </motion.div>
              )}

              {currentScreen === 'fooddelivery' && (
                <motion.div
                  key="fooddelivery"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <FoodDeliveryScreen 
                    onBack={() => setCurrentScreen('home')}
                    orders={orders}
                    onDeleteOrder={handleDeleteOrder}
                    personas={personas}
                    onOrder={handleOrder}
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    theme={theme}
                  />
                </motion.div>
              )}

              {currentScreen === 'bartender' && (
                <motion.div
                  key="bartender"
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-neutral-900"
                >
                  <BartenderGame 
                    onBack={() => setCurrentScreen('home')}
                    apiSettings={apiSettings}
                    personas={personas}
                    messages={messages}
                    setMessages={setMessages}
                    userProfile={userProfile}
                    worldbook={worldbook}
                    theme={theme}
                  />
                </motion.div>
              )}

              {currentScreen === 'aiphones' && (
                <motion.div
                  key="aiphones"
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <AiPhonesScreen 
                    onBack={() => setCurrentScreen('home')}
                    messages={messages}
                    typingPersonas={typingPersonas}
                  />
                </motion.div>
              )}

              {currentScreen === 'lovewidget' && (
                <motion.div
                  key="lovewidget"
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <LoveWidgetScreen 
                    onBack={() => setCurrentScreen('home')}
                  />
                </motion.div>
              )}
              {currentScreen === 'photoalbum' && (
                <motion.div
                  key="photoalbum"
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <PhotoAlbumScreen 
                    onBack={() => setCurrentScreen('home')}
                  />
                </motion.div>
              )}

              {currentScreen === 'virtualmap' && currentChatId && (
                <motion.div
                  key="virtualmap"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full absolute inset-0 z-50 bg-[#0f172a]"
                >
                  <VirtualMapScreen 
                    persona={personas.find(p => p.id === currentChatId)!}
                    userProfile={userProfile}
                    theme={theme}
                    onBack={() => setCurrentScreen('chat')}
                  />
                </motion.div>
              )}

              {currentScreen === 'phone' && (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <PhoneScreen 
                    onBack={() => setCurrentScreen('home')}
                    callHistory={callHistory}
                    personas={personas}
                    onStartCall={(personaId) => setActiveCall({ personaId, type: 'outgoing' })}
                  />
                </motion.div>
              )}

              {currentScreen === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: '100%' }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: '100%' }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0 }}
                  className="w-full h-full absolute inset-0 z-20 bg-white"
                >
                  <ChatScreen 
                    isActive={currentScreen === 'chat'}
                    setAiPhoneRequest={setAiPhoneRequest}
                    onCheckPhoneResponse={handleCheckPhoneResponse}
                    typingPersonas={typingPersonas}
                    triggerAiResponse={triggerAiResponse}
                    unreadCount={unreadCount}
                    currentChatId={currentChatId}
                    setCurrentChatId={setCurrentChatId}
                    personas={personas} 
                    setPersonas={setPersonas}
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    apiSettings={apiSettings}
                    theme={theme}
                    worldbook={worldbook}
                    messages={messages}
                    setMessages={setMessages}
                    moments={moments}
                    setMoments={setMoments}
                    onClearUnread={() => setUnreadCount(0)}
                    onBack={() => setCurrentScreen('home')} 
                    onAiOrder={handleAiOrder}
                    onStartListeningWith={handleStartListeningWith}
                    aiRef={aiRef}
                    groups={groups}
                    currentGroupId={currentGroupId}
                    setCurrentGroupId={setCurrentGroupId}
                    onCreateGroup={handleCreateGroup}
                    onDissolveGroup={handleDissolveGroup}
                    onAddGroupMembers={handleAddGroupMembers}
                    onNavigate={(screen, params) => {
                      setCurrentScreen(screen);
                      if (screen === 'music' && params?.personaId) {
                        setListeningWithPersonaId(params.personaId);
                      }
                    }}
                    listeningWithPersonaId={listeningWithPersonaId}
                    currentSong={songs[currentSongIndex]}
                    isPlaying={isPlaying}
                    onMusicClick={() => setCurrentScreen('music')}
                    xhsPrivateChats={xhsPrivateChats}
                    orders={orders}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Active Call Screen */}
      <AnimatePresence>
        {activeCall && (
          <div className="absolute inset-0 z-[10000]">
            <ActiveCallScreen
              persona={personas.find(p => p.id === activeCall.personaId)!}
              type={activeCall.type}
              onEndCall={(duration, wasMissed) => {
                setCallHistory(prev => [{
                  id: generateId(),
                  personaId: activeCall.personaId,
                  type: activeCall.type === 'incoming' ? (wasMissed ? 'missed' : 'incoming') : 'outgoing',
                  startTime: Date.now() - duration * 1000,
                  duration
                }, ...prev]);
                setActiveCall(null);
              }}
              apiSettings={apiSettings}
              worldbook={worldbook}
              userProfile={userProfile}
              aiRef={aiRef}
              setPersonas={setPersonas}
            />
          </div>
        )}
      </AnimatePresence>

      {/* AI Phone Request Modal */}
      <AnimatePresence>
        {aiPhoneRequest && (
          <div className="absolute inset-0 z-[10001] flex items-center justify-center p-8 bg-black/50 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl p-10 flex flex-col items-center text-center space-y-8"
            >
              <div className="w-28 h-28 bg-blue-50 rounded-full flex items-center justify-center">
                <div className="w-20 h-20 bg-blue-100/50 rounded-full flex items-center justify-center">
                  <PhoneIcon className="w-10 h-10 text-blue-500 fill-blue-500" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">AI 请求查看手机</h3>
                <p className="text-neutral-400 text-[15px] leading-relaxed px-4">
                  AI 想要查看您的手机内容，是否允许？
                </p>
              </div>
              
              <div className="flex gap-4 w-full pt-4">
                <button
                  onClick={() => {
                    if (aiPhoneRequest) {
                      handleCheckPhoneResponse(aiPhoneRequest.msgId, aiPhoneRequest.personaId, false);
                    }
                    setAiPhoneRequest(null);
                  }}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 font-bold rounded-3xl active:scale-95 transition-transform text-[16px]"
                >
                  拒绝
                </button>
                <button
                  onClick={() => {
                    if (aiPhoneRequest) {
                      handleCheckPhoneResponse(aiPhoneRequest.msgId, aiPhoneRequest.personaId, true);
                    }
                    setAiPhoneRequest(null);
                  }}
                  className="flex-1 py-4 bg-blue-500 text-white font-bold rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-transform text-[16px]"
                >
                  允许
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Phone>
  );
}
