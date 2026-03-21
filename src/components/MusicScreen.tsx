import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward, 
  ListMusic, Plus, Share, MoreHorizontal, Music, Trash2, FolderPlus, Folder, Users, X, Heart,
  Minimize2, Maximize2, Image as ImageIcon, Upload, Edit2, Repeat1, MessageCircle
} from 'lucide-react';
import { Song, Persona, Playlist, Message, ApiSettings, WorldbookSettings, UserProfile, ThemeSettings } from '../types';
import { fetchAiResponse, generateLyrics, transcribeAudio } from '../services/aiService';
import { generateId } from '../utils/id';
import { GoogleGenAI } from '@google/genai';
import * as mm from 'music-metadata-browser';

interface MusicScreenProps {
  onBack: () => void;
  songs: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onSelectSong: (index: number) => void;
  onAddSong: (song: Song, file: File) => void;
  onUpdateSong?: (songId: string, updates: Partial<Song>) => void;
  onDeleteSong?: (songId: string) => void;
  playlists: Playlist[];
  onAddSongToPlaylist: (songId: string, playlistId: string) => void;
  onCreatePlaylist: (name: string) => void;
  listeningWithPersonaId?: string | null;
  listenStartTime?: number | null;
  onStartListeningWith: (personaId: string) => void;
  onStopListeningWith: () => void;
  personas: Persona[];
  userProfile?: UserProfile;
  onShareToChat?: (song: Song, personaId: string) => void;
  onShareLyricsToChat?: (songTitle: string, lyrics: string, personaId: string) => void;
  onShareToMoments?: (song: Song) => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  apiSettings?: ApiSettings;
  worldbook?: WorldbookSettings;
  aiRef?: React.MutableRefObject<GoogleGenAI | null>;
  theme: ThemeSettings;
}

const defaultCover = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=800&q=80';

export function MusicScreen({
  onBack,
  songs,
  currentSongIndex,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onSelectSong,
  onAddSong,
  onUpdateSong,
  onDeleteSong,
  playlists,
  onAddSongToPlaylist,
  onCreatePlaylist,
  listeningWithPersonaId,
  listenStartTime,
  onStartListeningWith,
  onStopListeningWith,
  personas,
  userProfile,
  onShareToChat,
  onShareLyricsToChat,
  onShareToMoments,
  messages = [],
  setMessages,
  apiSettings,
  worldbook,
  aiRef,
  theme
}: MusicScreenProps) {
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'songs' | 'playlists'>('songs');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showPlaylistSelectorForSong, setShowPlaylistSelectorForSong] = useState<string | null>(null);
  const [isCommentaryLoading, setIsCommentaryLoading] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  
  const [isSelectingLyrics, setIsSelectingLyrics] = useState(false);
  const [selectedLyricIndices, setSelectedLyricIndices] = useState<number[]>([]);
  const [pendingShareLyrics, setPendingShareLyrics] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lyricsFileInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  
  const handleUploadAudioForLyrics = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !apiSettings || !aiRef) return;

    setIsCommentaryLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const mimeType = file.type;
          const lyrics = await transcribeAudio(base64.split(',')[1], mimeType, apiSettings, aiRef);
          if (onUpdateSong && currentSong) {
            onUpdateSong(currentSong.id, { lyrics });
          }
        } catch (err) {
          console.error("Failed to transcribe audio inside reader:", err);
          alert("提取歌词失败，请检查 API 密钥或网络连接。");
        } finally {
          setIsCommentaryLoading(false);
          if (lyricsFileInputRef.current) {
            lyricsFileInputRef.current.value = '';
          }
        }
      };
      reader.onerror = () => {
        console.error("Failed to read file");
        setIsCommentaryLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to transcribe audio:", error);
      setIsCommentaryLoading(false);
    }
  };

  const currentSong = songs[currentSongIndex];
  const listeningWith = listeningWithPersonaId ? personas.find(p => p.id === listeningWithPersonaId) : null;
  const [listenDuration, setListenDuration] = useState('00:00');

  const [showChatMenu, setShowChatMenu] = useState(false);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Filter messages for the current listening session (exclude theater messages to match main chat)
  // Memoize to prevent re-calculation on every render (e.g. time updates)
  const chatMessages = React.useMemo(() => {
    return listeningWith ? messages.filter(m => m.personaId === listeningWith.id && !m.groupId && !m.theaterId) : [];
  }, [messages, listeningWith?.id]);

  const [hasCheckedAiSkip, setHasCheckedAiSkip] = useState(false);

  // Reset skip check when song changes
  useEffect(() => {
    setHasCheckedAiSkip(false);
  }, [currentSong?.id]);

  // AI Auto-Skip Logic
  useEffect(() => {
    if (listeningWith && currentSong && isPlaying && currentTime > 10 && !hasCheckedAiSkip && setMessages && apiSettings && worldbook && aiRef && userProfile) {
      const checkAiSkip = async () => {
        setHasCheckedAiSkip(true); // Mark as checked immediately to prevent double calls
        
        // 10% chance to skip to make it less annoying, or higher if persona is picky?
        // Let's let the AI decide based on persona, but maybe throttle it?
        // Actually, let's just ask the AI.
        
        try {
          const prompt = `[系统提示：当前正在播放歌曲：${currentSong.title} - ${currentSong.artist}。你已经听了10秒。根据你的人设（${listeningWith.description}），你喜欢这首歌吗？你想切歌吗？
          如果非常不喜欢，或者觉得无聊，或者想捣乱，可以选择切歌。
          请务必只返回JSON格式，不要包含Markdown标记。格式：{"skip": boolean, "reason": "切歌理由/评价"}。
          切歌理由要符合你的人设口吻。如果不切歌，reason可以是简短的评价。]`;

          const { responseText } = await fetchAiResponse(
            prompt,
            [], 
            listeningWith,
            apiSettings,
            worldbook,
            userProfile,
            aiRef,
            false,
            "请务必只输出合法的JSON格式，不要包含Markdown代码块标记。",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            true
          );

          let result;
          try {
             const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
             result = JSON.parse(jsonStr);
          } catch (e) {
             console.error("Failed to parse AI skip response", responseText);
             return;
          }

          if (result && result.skip) {
            // AI wants to skip
            onNext();
            
            // Send message explaining why
            const newMsg: Message = {
              id: generateId(),
              personaId: listeningWith.id,
              role: 'model',
              text: `(切歌) ${result.reason}`,
              msgType: 'text',
              timestamp: new Date().toLocaleTimeString(),
              createdAt: Date.now()
            };
            setMessages(prev => [...prev, newMsg]);
          } else if (result && result.reason && Math.random() > 0.7) {
            // 30% chance to just comment if not skipping
             const newMsg: Message = {
              id: generateId(),
              personaId: listeningWith.id,
              role: 'model',
              text: result.reason,
              msgType: 'text',
              timestamp: new Date().toLocaleTimeString(),
              createdAt: Date.now()
            };
            setMessages(prev => [...prev, newMsg]);
          }

        } catch (error) {
          console.error("AI Auto-skip check failed:", error);
        }
      };

      checkAiSkip();
    }
  }, [currentTime, listeningWith?.id, currentSong?.id, isPlaying]);

  // Auto-scroll chat
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  useEffect(() => {
    if (chatContainerRef.current && isNearBottomRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages.length, listeningWithPersonaId]);

  // Generate AI greeting when starting to listen together
  useEffect(() => {
    if (listeningWith && currentSong && setMessages && apiSettings && worldbook && aiRef && userProfile) {
      const sendGreeting = async () => {
        // Check if we already have messages in this session to avoid greeting again
        if (chatMessages.length > 0) return;

        setIsCommentaryLoading(true);
        try {
          const prompt = `[系统提示：用户刚刚邀请你一起听歌。当前播放的歌曲是：${currentSong.title} - ${currentSong.artist}。请根据你的人设（${listeningWith.description}），用你的口吻和性格，对用户说一句开场白。比如表达开心、对这首歌的看法，或者邀请用户一起享受音乐。保持简短自然，像微信聊天一样。]`;
          
          const { responseText } = await fetchAiResponse(
            prompt,
            [], // No context for greeting
            listeningWith,
            apiSettings,
            worldbook,
            userProfile,
            aiRef
          );

          const newMsg: Message = {
            id: generateId(),
            personaId: listeningWith.id,
            role: 'model',
            text: responseText,
            msgType: 'text',
            timestamp: new Date().toLocaleTimeString(),
            createdAt: Date.now()
          };
          
          setMessages(prev => [...prev, newMsg]);
        } catch (error) {
          console.error("Failed to generate greeting:", error);
        } finally {
          setIsCommentaryLoading(false);
        }
      };
      
      sendGreeting();
    }
  }, [listeningWith?.id]); // Only trigger when persona changes (starts listening)

  // Generate AI commentary when song changes
  useEffect(() => {
    if (listeningWith && currentSong && isPlaying && setMessages && apiSettings && worldbook && aiRef && userProfile) {
      const generateCommentary = async () => {
        // Check if we already have a commentary for this song recently to avoid spam
        const lastMsg = chatMessages[chatMessages.length - 1];
        // Don't generate commentary if the last message was just sent (e.g. the greeting)
        if (lastMsg && (Date.now() - (lastMsg.createdAt || 0) < 10000)) {
          return;
        }
        
        if (lastMsg && lastMsg.role === 'model' && lastMsg.text && lastMsg.text.includes(currentSong.title) && (Date.now() - (lastMsg.createdAt || 0) < 60000)) {
          return;
        }

        setIsCommentaryLoading(true);
        
        try {
          const prompt = `[系统提示：歌曲切换了。当前播放：${currentSong.title} - ${currentSong.artist}。请根据你的人设，发表一句简短评价或发起话题。]`;
          
          // Prepare context messages
          const contextMessages = chatMessages
            .slice(-10)
            .filter(m => m.text && m.text.trim() !== '') // Filter empty messages
            .map(m => ({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: cleanContextMessage(m.text)
            }));

          const { responseText } = await fetchAiResponse(
            prompt,
            contextMessages,
            listeningWith,
            apiSettings,
            worldbook,
            userProfile,
            aiRef
          );

          const newMsg: Message = {
            id: generateId(),
            personaId: listeningWith.id,
            role: 'model',
            text: responseText,
            msgType: 'text',
            timestamp: new Date().toLocaleTimeString(),
            createdAt: Date.now()
          };
          
          setMessages(prev => [...prev, newMsg]);
        } catch (error) {
          console.error("Failed to generate commentary:", error);
        } finally {
          setIsCommentaryLoading(false);
        }
      };
      
      // Delay commentary to avoid conflict with greeting
      const timer = setTimeout(generateCommentary, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSong?.id, listeningWith?.id]);

  useEffect(() => {
    if (!listenStartTime || !listeningWithPersonaId) {
      setListenDuration('00:00');
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - listenStartTime) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setListenDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [listenStartTime, listeningWithPersonaId]);

  const filteredSongs = selectedPlaylistId 
    ? songs.filter(s => playlists.find(pl => pl.id === selectedPlaylistId)?.songIds.includes(s.id))
    : songs;

  const [parsedLyrics, setParsedLyrics] = useState<{time: number, text: string}[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [lyricOffset, setLyricOffset] = useState(0);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedArtist, setEditedArtist] = useState('');
  const [editedLyrics, setEditedLyrics] = useState('');
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);

  // Parse lyrics when song changes
  useEffect(() => {
    setLyricOffset(0); // Reset offset when song changes
    setEditedLyrics(currentSong?.lyrics || '');
  }, [currentSong?.id, currentSong?.lyrics]);

  useEffect(() => {
    if (currentSong?.lyrics) {
      const parsed = currentSong.lyrics.split('\n').map(line => {
        const match = line.match(/\[(\d+):(\d+(\.\d+)?)\](.*)/);
        if (match) {
          const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
          return {
            time: time,
            text: match[4].trim()
          };
        }
        return null;
      }).filter((item): item is {time: number, text: string} => item !== null && item.text !== '');
      
      if (parsed.length > 0) {
        setParsedLyrics(parsed.sort((a, b) => a.time - b.time));
      } else if (duration > 0) {
        // Fallback for plain text lyrics: approximate scrolling
        const lines = currentSong.lyrics.split('\n').map(l => l.trim()).filter(l => l !== '');
        const startTime = duration * 0.1; // Start scrolling at 10% of the song
        const endTime = duration * 0.9;   // End scrolling at 90% of the song
        const timePerLine = (endTime - startTime) / Math.max(lines.length, 1);
        
        const fakeParsed = lines.map((text, i) => ({
          time: startTime + i * timePerLine,
          text
        }));
        setParsedLyrics(fakeParsed);
      } else {
        setParsedLyrics([]);
      }
    } else {
      setParsedLyrics([]);
    }
  }, [currentSong?.id, currentSong?.lyrics, duration]);

  // Update active lyric index
  useEffect(() => {
    if (parsedLyrics.length === 0) return;
    
    const index = parsedLyrics.findIndex((lyric, i) => {
      const nextLyric = parsedLyrics[i + 1];
      return (currentTime + lyricOffset) >= lyric.time && (!nextLyric || (currentTime + lyricOffset) < nextLyric.time);
    });

    setActiveLyricIndex(prev => {
      if (prev !== index) return index;
      return prev;
    });
  }, [currentTime, lyricOffset, parsedLyrics]);

  // Auto-scroll lyrics
  useEffect(() => {
    if (showLyrics && lyricsContainerRef.current && activeLyricIndex !== -1) {
      const container = lyricsContainerRef.current;
      const activeElement = container.querySelector('.active-lyric') as HTMLElement;
      
      if (activeElement) {
        // Calculate the scroll position to center the active element
        const containerHeight = container.clientHeight;
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.clientHeight;
        
        const scrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);
        
        // Use 'auto' behavior if the scroll distance is large (e.g. after a seek)
        // to avoid long smooth scroll animations
        const currentScroll = container.scrollTop;
        const distance = Math.abs(currentScroll - scrollPos);
        
        container.scrollTo({
          top: scrollPos,
          behavior: distance > 200 ? 'auto' : 'smooth'
        });
      }
    }
  }, [activeLyricIndex, showLyrics, parsedLyrics.length]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const url = URL.createObjectURL(file);
      
      let title = file.name.replace(/\.[^/.]+$/, "");
      let artist = "未知艺术家";
      
      try {
        // Try to extract metadata from the file
        const metadata = await mm.parseBlob(file);
        if (metadata.common.title) {
          title = metadata.common.title;
        }
        if (metadata.common.artist) {
          artist = metadata.common.artist;
        } else if (metadata.common.artists && metadata.common.artists.length > 0) {
          artist = metadata.common.artists[0];
        }
        
        // If we still have generic metadata, try filename parsing
        if (artist === "未知艺术家" && title === file.name.replace(/\.[^/.]+$/, "")) {
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }
        }
      } catch (error) {
        console.error("Metadata extraction failed, falling back to filename:", error);
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }
      }

      const newSong: Song = {
        id: `local-${generateId()}`,
        title,
        artist,
        cover: 'https://picsum.photos/seed/music/400/400', // Default cover
        lyrics: '[00:00.00] 正在提取歌词中...\n[00:05.00] 点击封面可返回封面视图',
        url,
        source: 'local'
      };
      
      // Use await to process sequentially and avoid hitting rate limits
      await onAddSong(newSong, file);
      
      // Add a small delay between uploads if there are multiple files
      if (i < fileList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreatePlaylist(false);
    }
  };

  const handleShare = () => {
    if (!currentSong) return;
    if (listeningWith && onShareToChat) {
      onShareToChat(currentSong, listeningWith.id);
    } else if (onShareToMoments) {
      onShareToMoments(currentSong);
    }
  };

  // Helper to clean messages for AI context (remove base64 images to save tokens)
  const cleanContextMessage = (text: string) => {
    // Replace [STICKER: data:...] with [STICKER: image]
    return text.replace(/\[STICKER:\s*data:[^\]]+\]/g, '[STICKER: image]');
  };

  const handleSendMessage = async (text: string) => {
    if (!listeningWith || !setMessages || !apiSettings || !worldbook || !aiRef || !userProfile) return;
    
    const newMsg: Message = {
      id: generateId(),
      personaId: listeningWith.id,
      role: 'user',
      text,
      msgType: 'text',
      timestamp: new Date().toLocaleTimeString(),
      createdAt: Date.now(),
      status: 'sent',
      isRead: false
    };
    
    setMessages(prev => [...prev, newMsg]);
    setIsCommentaryLoading(true);

    try {
      // Prepare context messages (excluding the current one, as fetchAiResponse adds it)
      const contextMessages = chatMessages
        .slice(-10)
        .filter(m => m.text && m.text.trim() !== '')
        .map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: cleanContextMessage(m.text)
        }));

      // Add song context to system prompt implicitly via the prompt text if needed, 
      // or just rely on previous context. 
      // Better to reinforce the context:
      const prompt = text; 
      
      const additionalSystemInstructions = `[当前场景：用户正在和你一起听歌。当前播放：${currentSong.title} - ${currentSong.artist}。请结合歌曲氛围进行回复。]`;

      const { responseText } = await fetchAiResponse(
        prompt,
        contextMessages,
        listeningWith,
        apiSettings,
        worldbook,
        userProfile,
        aiRef,
        true,
        additionalSystemInstructions
      );

      // Mark user message as read
      setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, isRead: true, status: 'read' } : m));

      const aiMsg: Message = {
        id: generateId(),
        personaId: listeningWith.id,
        role: 'model',
        text: responseText,
        msgType: 'text',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now(),
        isRead: true
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Failed to generate reply:", error);
      const errorMsg: Message = {
        id: generateId(),
        personaId: listeningWith.id,
        role: 'model',
        text: "(网络错误，请重试)",
        msgType: 'text',
        timestamp: new Date().toLocaleTimeString(),
        createdAt: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsCommentaryLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white font-sans relative overflow-hidden">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 z-0 opacity-30 blur-2xl"
        style={{
          backgroundImage: `url(${customBg || currentSong?.cover || defaultCover})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-[#0a0a0a]/80 to-[#0a0a0a]" />

      {/* Header */}
      <div 
        className={`relative z-10 flex items-center justify-between px-6 pb-2 shrink-0`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tracking-widest uppercase text-white/50">
              {listeningWith ? `一起听 ${listeningWith.name}` : '正在播放'}
            </span>
            {listeningWith && (
              <button 
                onClick={onStopListeningWith}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                title="退出一起听"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {selectedPlaylistId && (
            <span className="text-[10px] text-white/30 mt-0.5">
              播放列表: {playlists.find(p => p.id === selectedPlaylistId)?.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowPersonaSelector(true)}
            className={`p-2 rounded-full transition-colors ${listeningWith ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/10 text-white'}`}
            title="选择AI一起听"
          >
            <Users className="w-6 h-6" />
          </button>
          <button 
            onClick={() => bgInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="自定义背景"
          >
            <ImageIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors"
            title="上传音乐"
          >
            <Upload size={20} />
          </button>
        <input 
          type="file" 
          ref={bgInputRef} 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setCustomBg(URL.createObjectURL(file));
          }}
          accept="image/*"
          className="hidden"
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange}
          accept="audio/*" 
          multiple
          className="hidden" 
        />
      </div>
    </div>

      {/* Main Content */}
      <div ref={constraintsRef} className="relative z-10 flex-1 flex flex-col items-center min-h-0 w-full overflow-hidden">
        {currentSong ? (
          <>
            {/* Listening Together Visualization (Heart & Red Lines) - Fixed at top */}
            {listeningWith && (
              <div className="w-full flex flex-col items-center py-2 shrink-0 bg-black/20 backdrop-blur-md z-20">
                <div className="relative flex items-center justify-center w-full max-w-[280px] h-16">
                  {/* Red Heart Rate Line with Animation */}
                  <div className="absolute top-1/2 left-[55px] right-[55px] h-16 -translate-y-1/2 z-0 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
                      <motion.path 
                        d="M 0 20 L 70 20 L 75 10 L 80 30 L 85 5 L 90 20 L 110 20 L 115 5 L 120 35 L 125 0 L 130 20 L 200 20" 
                        stroke="rgba(239, 68, 68, 0.8)" 
                        strokeWidth="1.8" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animate={{ 
                          d: isPlaying 
                            ? [
                                "M 0 20 L 70 20 L 75 10 L 80 30 L 85 5 L 90 20 L 110 20 L 115 5 L 120 35 L 125 0 L 130 20 L 200 20",
                                "M 0 20 L 70 20 L 75 12 L 80 28 L 85 8 L 90 20 L 110 20 L 115 8 L 120 32 L 125 3 L 130 20 L 200 20",
                                "M 0 20 L 70 20 L 75 10 L 80 30 L 85 5 L 90 20 L 110 20 L 115 5 L 120 35 L 125 0 L 130 20 L 200 20"
                              ]
                            : "M 0 20 L 200 20"
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 0.8,
                          ease: "easeInOut"
                        }}
                      />
                    </svg>
                  </div>

                  <div className="flex items-center justify-between w-full px-8 relative z-10">
                    {/* User Avatar */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-2 border-white/80 p-0.5 shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-black/40 relative z-10 bg-[#1a1a1a]">
                        <img 
                          src={userProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'User'}`} 
                          alt="Me" 
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isPlaying && (
                          <div className="absolute -inset-1.5 rounded-full border border-white/30 animate-ping opacity-20" />
                        )}
                      </div>
                    </div>

                    {/* Beating Heart on the Line */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <motion.div
                        animate={{ 
                          scale: isPlaying ? [1, 1.2, 1] : 1,
                        }}
                        transition={{ 
                          repeat: Infinity, 
                          duration: 0.8,
                          ease: "easeInOut"
                        }}
                        className="bg-[#0a0a0a] rounded-full p-1"
                      >
                        <Heart className="w-4 h-4 text-red-500 fill-current" />
                      </motion.div>
                    </div>

                    {/* AI Avatar */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-2 border-white/80 p-0.5 shadow-[0_0_15px_rgba(255,255,255,0.15)] bg-black/40 relative z-10 bg-[#1a1a1a]">
                        <img 
                          src={listeningWith?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${listeningWith?.name || 'AI'}`} 
                          alt={listeningWith?.name || 'AI'} 
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isPlaying && (
                          <div className="absolute -inset-1.5 rounded-full border border-white/30 animate-ping opacity-20" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Duration Text */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-1"
                >
                  <p className="text-[10px] font-medium text-white/60 tracking-widest uppercase font-mono">
                    一起听了 {listenDuration}
                  </p>
                </motion.div>
              </div>
            )}

            {/* Scrollable Content Wrapper */}
            <div className="flex-1 w-full overflow-y-auto scrollbar-hide flex flex-col items-center py-8">

              {/* Album Art with Vinyl Effect */}
              <div className={`relative aspect-square group transition-all duration-500 shrink-0 ${listeningWith && !showLyrics ? 'w-48 mb-4' : 'w-full max-w-[320px] mb-8'} ${showLyrics ? 'h-[400px] max-w-none w-[90%]' : ''}`}>
                {/* Vinyl Record */}
                {!showLyrics && (
                  <div 
                    className={`absolute top-0 right-[-15%] w-full h-full rounded-full bg-[#111] shadow-2xl border-[6px] border-black/40 flex items-center justify-center overflow-hidden animate-[spin_10s_linear_infinite]`}
                    style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                  >
                    <div className="w-full h-full opacity-30 bg-[repeating-radial-gradient(circle,transparent,transparent_2px,rgba(255,255,255,0.05)_3px)]" />
                    <div className="absolute w-12 h-12 rounded-full bg-black/80 border border-white/10" />
                  </div>
                )}

                {/* Cover Art */}
                <div 
                  className={`relative z-10 w-full h-full rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer transition-all duration-500 ${showLyrics ? 'bg-black/40 backdrop-blur-2xl border border-white/10' : ''}`}
                  onClick={() => setShowLyrics(!showLyrics)}
                >
                  <AnimatePresence mode="wait">
                    {!showLyrics ? (
                      <motion.img 
                        key="artwork"
                        src={currentSong.cover || defaultCover} 
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <motion.div 
                        key="lyrics"
                        className="w-full h-full p-6 flex flex-col items-center justify-center text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div ref={lyricsContainerRef} className="w-full h-full overflow-y-auto scrollbar-hide py-32 relative">
                          <div className="absolute top-4 right-4 flex flex-wrap items-center justify-end gap-2 z-10">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 border border-white/10">
                              <button 
                                onClick={() => setLyricOffset(prev => prev - 0.5)} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full text-xs"
                                title="提前0.5秒"
                              >
                                -0.5s
                              </button>
                              <span className="text-[10px] font-mono w-10 text-center text-blue-400">{lyricOffset > 0 ? '+' : ''}{lyricOffset.toFixed(1)}s</span>
                              <button 
                                onClick={() => setLyricOffset(prev => prev + 0.5)} 
                                className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full text-xs"
                                title="延后0.5秒"
                              >
                                +0.5s
                              </button>
                              {lyricOffset !== 0 && (
                                <button 
                                  onClick={() => setLyricOffset(0)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full text-[10px] text-white/40"
                                  title="重置偏移"
                                >
                                  重置
                                </button>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-1 py-1 border border-white/10">
                              <button onClick={() => {
                                if (isEditingLyrics) {
                                  onUpdateSong(currentSong.id, { lyrics: editedLyrics });
                                }
                                setIsEditingLyrics(!isEditingLyrics);
                              }} className="px-3 py-1 hover:bg-white/10 rounded-full text-xs font-medium">
                                {isEditingLyrics ? '保存' : '编辑'}
                              </button>
                              
                              {!isEditingLyrics && (
                                <button 
                                  onClick={async () => {
                                    if (!apiSettings || !worldbook || !userProfile || !aiRef) return;
                                    setIsEditingLyrics(true);
                                    const lyrics = await generateLyrics(currentSong.title, currentSong.artist, apiSettings, worldbook, userProfile, aiRef, "gemini-3-flash-preview");
                                    setEditedLyrics(lyrics);
                                    onUpdateSong?.(currentSong.id, { lyrics });
                                    setIsEditingLyrics(false);
                                  }} 
                                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-full text-blue-400 text-xs font-medium flex items-center gap-1"
                                  title="重新从云端提取精准歌词"
                                >
                                  <Edit2 size={12} />
                                  <span>重新提取</span>
                                </button>
                              )}
                              
                              {!isEditingLyrics && (
                                <button
                                  onClick={() => lyricsFileInputRef.current?.click()}
                                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-full text-purple-400 text-xs font-medium flex items-center gap-1"
                                  title="上传音频文件提取歌词"
                                  disabled={isCommentaryLoading}
                                >
                                  {isCommentaryLoading ? (
                                    <span className="animate-pulse">提取中...</span>
                                  ) : (
                                    <>
                                      <Upload size={12} />
                                      <span>MP3提取</span>
                                    </>
                                  )}
                                </button>
                              )}
                              
                              <input
                                type="file"
                                ref={lyricsFileInputRef}
                                onChange={handleUploadAudioForLyrics}
                                accept="audio/*"
                                className="hidden"
                              />
                            </div>

                            {isEditingLyrics && (
                              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-1 py-1 border border-white/10">
                                <button onClick={async () => {
                                  if (!apiSettings || !worldbook || !userProfile || !aiRef) return;
                                  const lyrics = await generateLyrics(currentSong.title, currentSong.artist, apiSettings, worldbook, userProfile, aiRef);
                                  setEditedLyrics(lyrics);
                                }} className="px-3 py-1 hover:bg-white/10 rounded-full text-xs">
                                  获取
                                </button>
                                <button onClick={() => {
                                  setEditedLyrics(currentSong?.lyrics || '');
                                  setIsEditingLyrics(false);
                                }} className="px-3 py-1 hover:bg-white/10 rounded-full text-xs text-white/40">
                                  取消
                                </button>
                              </div>
                            )}
                          </div>
                          {isEditingLyrics ? (
                            <textarea
                              value={editedLyrics}
                              onChange={(e) => setEditedLyrics(e.target.value)}
                              className="w-full h-full bg-black/60 text-white p-4 rounded-xl text-sm font-mono"
                            />
                          ) : parsedLyrics.length > 0 ? (
                            parsedLyrics.map((line, i) => {
                              const isActive = i === activeLyricIndex;
                              const isSelected = selectedLyricIndices.includes(i);
                              return (
                                <div key={i} className={`mb-6 flex justify-center ${isActive ? 'active-lyric' : ''}`}>
                                  <div className="relative inline-flex items-center">
                                    <p 
                                      onClick={() => {
                                        if (isSelectingLyrics) {
                                          setSelectedLyricIndices(prev => 
                                            prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                                          );
                                        } else {
                                          onSeek(line.time);
                                        }
                                      }}
                                      className={`text-sm transition-all duration-300 cursor-pointer ${
                                        isSelectingLyrics 
                                          ? (isSelected ? 'text-white font-bold scale-110 bg-white/20 rounded-lg py-2 px-4 inline-block' : 'text-white/40 hover:text-white/60')
                                          : (isActive ? 'text-white font-bold scale-125' : 'text-white/20 hover:text-white/40')
                                      }`}
                                    >
                                      {line.text}
                                    </p>
                                    {!isSelectingLyrics && isActive && onShareLyricsToChat && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (listeningWith) {
                                            onShareLyricsToChat(currentSong.title, line.text, listeningWith.id);
                                          } else {
                                            setPendingShareLyrics(line.text);
                                            setShowPersonaSelector(true);
                                          }
                                        }}
                                        className="absolute left-full ml-2 p-1.5 text-white/40 hover:text-white transition-colors rounded-full hover:bg-white/10"
                                        title="分享这句歌词"
                                      >
                                        <Share className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : currentSong?.lyrics ? (
                            <div className="text-white/80 text-sm whitespace-pre-wrap text-center leading-loose pb-8">
                              {currentSong.lyrics}
                            </div>
                          ) : <p className="text-white/40 italic text-sm">暂无歌词</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Lyrics Selection Floating Action Bar */}
                  <AnimatePresence>
                    {isSelectingLyrics && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-4 left-0 right-0 flex justify-center z-50 pointer-events-none"
                      >
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full p-2 flex items-center gap-2 pointer-events-auto shadow-2xl">
                          <button
                            onClick={() => {
                              setIsSelectingLyrics(false);
                              setSelectedLyricIndices([]);
                            }}
                            className="px-4 py-2 rounded-full text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => {
                              if (selectedLyricIndices.length === 0) return;
                              const selectedText = selectedLyricIndices.sort((a, b) => a - b).map(i => parsedLyrics[i].text).join('\n');
                              if (listeningWith && onShareLyricsToChat) {
                                onShareLyricsToChat(currentSong.title, selectedText, listeningWith.id);
                                setIsSelectingLyrics(false);
                                setSelectedLyricIndices([]);
                              } else {
                                setPendingShareLyrics(selectedText);
                                setShowPersonaSelector(true);
                              }
                            }}
                            disabled={selectedLyricIndices.length === 0}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedLyricIndices.length > 0 
                                ? 'bg-white text-black hover:scale-105 shadow-lg shadow-white/20' 
                                : 'bg-white/20 text-white/40 cursor-not-allowed'
                            }`}
                          >
                            分享给 AI {selectedLyricIndices.length > 0 ? `(${selectedLyricIndices.length}句)` : ''}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>


            </div>

            {/* Music Card (Immersive Dark/Glassy Style) - Fixed at bottom */}
            <div className="w-full bg-black/40 backdrop-blur-3xl rounded-t-[40px] p-6 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] border-t border-white/10 shrink-0 relative z-30">
              {/* Song Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1 min-w-0 pr-4">
                  {isEditingMetadata ? (
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text" 
                        value={editedTitle} 
                        onChange={e => setEditedTitle(e.target.value)} 
                        className="text-xl font-bold text-white leading-tight bg-white/10 rounded px-3 py-2 outline-none border border-white/20"
                        placeholder="歌曲名"
                      />
                      <input 
                        type="text" 
                        value={editedArtist} 
                        onChange={e => setEditedArtist(e.target.value)} 
                        className="text-base text-white/70 font-medium mt-1 bg-white/10 rounded px-3 py-2 outline-none border border-white/20"
                        placeholder="歌手名"
                      />
                      <textarea 
                        value={editedLyrics} 
                        onChange={e => setEditedLyrics(e.target.value)} 
                        className="text-sm text-white/80 font-mono mt-2 bg-white/10 rounded px-3 py-2 outline-none border border-white/20 h-32 resize-none"
                        placeholder="在此处手动粘贴或编辑 LRC 歌词"
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => {
                          if (onUpdateSong) {
                            onUpdateSong(currentSong.id, { title: editedTitle, artist: editedArtist, lyrics: editedLyrics });
                          }
                          setIsEditingMetadata(false);
                        }} className="text-sm bg-white text-black px-4 py-2 rounded-full font-bold">保存</button>
                        <button onClick={() => setIsEditingMetadata(false)} className="text-sm bg-white/20 text-white px-4 py-2 rounded-full font-bold">取消</button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative pr-6">
                      <h2 className="text-2xl font-bold text-white truncate leading-tight tracking-tight">{currentSong.title}</h2>
                      <p className="text-base text-white/60 font-medium truncate mt-1">{currentSong.artist}</p>
                      {currentSong.source === 'local' && (
                        <button 
                          onClick={() => {
                            setEditedTitle(currentSong.title);
                            setEditedArtist(currentSong.artist);
                            setEditedLyrics(currentSong.lyrics);
                            setIsEditingMetadata(true);
                          }}
                          className="absolute top-1 right-0 p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 rounded-full"
                        >
                          <Edit2 className="w-4 h-4 text-white/80" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowPlaylistSelectorForSong(currentSong.id)} className="p-2.5 text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full">
                    <FolderPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar (Draggable) */}
              <div className="w-full mb-6">
                <div className="relative w-full h-6 flex items-center group">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="absolute z-20 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden relative z-0">
                    <div 
                      className="absolute top-0 left-0 h-full bg-white rounded-full pointer-events-none"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div 
                    className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100"
                    style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 7px)` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[11px] font-medium text-white/50 font-mono tracking-wider">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Centered Controls */}
              <div className="relative flex items-center justify-between w-full px-2">
                {/* Left Button */}
                <button 
                  onClick={() => setShowPlaylist(true)} 
                  className="p-3 text-white/60 hover:text-white transition-colors"
                >
                  <ListMusic className="w-6 h-6" />
                </button>

                {/* Center Group */}
                <div className="flex items-center gap-6">
                  <button onClick={onPrev} className="p-3 text-white/80 hover:text-white transition-transform active:scale-90">
                    <SkipBack className="w-8 h-8 fill-current" />
                  </button>
                  
                  <button 
                    onClick={onPlayPause}
                    className="w-20 h-20 flex items-center justify-center bg-white text-black rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all z-30"
                  >
                    {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1.5" />}
                  </button>
                  
                  <button onClick={onNext} className="p-3 text-white/80 hover:text-white transition-transform active:scale-90">
                    <SkipForward className="w-8 h-8 fill-current" />
                  </button>
                </div>

                {/* Right Button */}
                <button className="p-3 text-white/60 hover:text-white transition-colors">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-white/40 h-full">
            <Music className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无歌曲</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition-colors"
            >
              导入本地音乐
            </button>
          </div>
        )}
      </div>

      {/* Playlist Drawer */}
      <AnimatePresence>
        {showPlaylist && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlaylist(false)}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="absolute bottom-0 left-0 right-0 z-50 h-[75vh] bg-[#121212] rounded-t-3xl flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="p-6 pb-2 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">音乐库</h3>
                  <button 
                    onClick={() => setShowPlaylist(false)}
                    className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDrawerTab('songs')}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${drawerTab === 'songs' ? 'text-white border-white' : 'text-white/40 border-transparent'}`}
                  >
                    所有歌曲
                  </button>
                  <button 
                    onClick={() => setDrawerTab('playlists')}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 ${drawerTab === 'playlists' ? 'text-white border-white' : 'text-white/40 border-transparent'}`}
                  >
                    歌单
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {drawerTab === 'songs' ? (
                  <div className="space-y-2">
                    {filteredSongs.length === 0 ? (
                      <div className="text-center py-10 text-white/40">
                        {selectedPlaylistId ? "歌单为空" : "未找到歌曲"}
                      </div>
                    ) : (
                      filteredSongs.map((song, index) => {
                        const originalIndex = songs.findIndex(s => s.id === song.id);
                        return (
                          <div 
                            key={song.id}
                            onClick={() => {
                              onSelectSong(originalIndex);
                              setShowPlaylist(false);
                            }}
                            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                              originalIndex === currentSongIndex ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <img 
                              src={song.cover || defaultCover} 
                              alt={song.title} 
                              className="w-12 h-12 rounded-lg object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-base font-medium truncate ${originalIndex === currentSongIndex ? 'text-white' : 'text-white/90'}`}>
                                {song.title}
                              </h4>
                              <p className="text-sm text-white/50 truncate">{song.artist}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {song.source === 'local' && onUpdateSong && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (ev: any) => {
                                      const file = ev.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          const base64String = reader.result as string;
                                          onUpdateSong(song.id, { cover: base64String });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    };
                                    input.click();
                                  }}
                                  className="p-2 text-white/20 hover:text-white transition-colors"
                                  title="修改封面"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPlaylistSelectorForSong(song.id);
                                }}
                                className="p-2 text-white/20 hover:text-white transition-colors"
                              >
                                <FolderPlus className="w-4 h-4" />
                              </button>
                              {originalIndex === currentSongIndex && isPlaying ? (
                                <div className="flex gap-1 items-end h-4 px-2">
                                  <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-white rounded-full" />
                                  <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-white rounded-full" />
                                  <motion.div animate={{ height: [6, 14, 6] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-white rounded-full" />
                                </div>
                              ) : (
                                onDeleteSong && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteSong(song.id);
                                    }}
                                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setShowCreatePlaylist(true)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-dashed border-white/10"
                    >
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white/40" />
                      </div>
                      <span className="font-medium">新建歌单</span>
                    </button>

                    <div 
                      onClick={() => {
                        setSelectedPlaylistId(null);
                        setDrawerTab('songs');
                      }}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${!selectedPlaylistId ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Music className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">所有歌曲</h4>
                        <p className="text-sm text-white/40">{songs.length} 首歌曲</p>
                      </div>
                    </div>

                    {playlists.map(pl => (
                      <div 
                        key={pl.id}
                        onClick={() => {
                          setSelectedPlaylistId(pl.id);
                          setDrawerTab('songs');
                        }}
                        className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${selectedPlaylistId === pl.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <Folder className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{pl.name}</h4>
                          <p className="text-sm text-white/40">{pl.songIds.length} 首歌曲</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Playlist Dialog */}
      <AnimatePresence>
        {showCreatePlaylist && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowCreatePlaylist(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#1a1a1a] rounded-3xl p-6 shadow-2xl border border-white/10"
            >
              <h3 className="text-xl font-semibold mb-4">新建歌单</h3>
              <input 
                autoFocus
                type="text"
                placeholder="歌单名称"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-white/20"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCreatePlaylist(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleCreatePlaylist}
                  className="flex-1 py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
                >
                  创建
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add to Playlist Selector */}
      <AnimatePresence>
        {showPlaylistSelectorForSong && (
          <div className="absolute inset-0 z-[100] flex items-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setShowPlaylistSelectorForSong(null)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full bg-[#1a1a1a] rounded-t-3xl p-6 shadow-2xl border-t border-white/10 max-h-[60vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">添加到歌单</h3>
                <button onClick={() => setShowPlaylistSelectorForSong(null)}>
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>
              <div 
                className="flex-1 overflow-y-auto space-y-2"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                {playlists.map(pl => (
                  <button 
                    key={pl.id}
                    onClick={() => {
                      onAddSongToPlaylist(showPlaylistSelectorForSong, pl.id);
                      setShowPlaylistSelectorForSong(null);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Folder className="w-5 h-5 text-white/40" />
                    <span className="font-medium">{pl.name}</span>
                  </button>
                ))}
                <button 
                  onClick={() => {
                    setShowPlaylistSelectorForSong(null);
                    setShowCreatePlaylist(true);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-dashed border-white/10"
                >
                  <Plus className="w-5 h-5 text-white/40" />
                  <span className="font-medium">新建歌单</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Persona Selector for Listen Together */}
      <AnimatePresence>
        {showPersonaSelector && (
          <div className="absolute inset-0 z-[110] flex items-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => {
                setShowPersonaSelector(false);
                if (pendingShareLyrics) setPendingShareLyrics(null);
              }}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full bg-[#1a1a1a] rounded-t-3xl p-6 shadow-2xl border-t border-white/10 max-h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">{pendingShareLyrics ? '分享给 AI' : '选择 AI 一起听'}</h3>
                <button onClick={() => {
                  setShowPersonaSelector(false);
                  if (pendingShareLyrics) {
                    setPendingShareLyrics(null);
                  }
                }}>
                  <ChevronDown className="w-6 h-6" />
                </button>
              </div>
              <div 
                className="flex-1 overflow-y-auto space-y-3"
                style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              >
                {personas.map(persona => (
                  <button 
                    key={persona.id}
                    onClick={() => {
                      if (pendingShareLyrics && onShareLyricsToChat) {
                        onShareLyricsToChat(currentSong.title, pendingShareLyrics, persona.id);
                        setPendingShareLyrics(null);
                        setIsSelectingLyrics(false);
                        setSelectedLyricIndices([]);
                      } else {
                        onStartListeningWith(persona.id);
                      }
                      setShowPersonaSelector(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      listeningWithPersonaId === persona.id 
                        ? 'bg-indigo-500/20 border border-indigo-500/30' 
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <img 
                      src={persona.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${persona.name}`} 
                      alt={persona.name}
                      className="w-12 h-12 rounded-full object-cover bg-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold text-white">{persona.name}</h4>
                      <p className="text-xs text-white/40 line-clamp-1">{persona.instructions.substring(0, 50)}...</p>
                    </div>
                    {listeningWithPersonaId === persona.id && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
              {listeningWithPersonaId && (
                <button 
                  onClick={() => {
                    onStopListeningWith();
                    setShowPersonaSelector(false);
                  }}
                  className="w-full py-4 mt-2 rounded-2xl bg-red-500/10 text-red-500 font-semibold hover:bg-red-500/20 transition-colors"
                >
                  停止一起听
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
