import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Book, Music, Hash, HeartPulse, Sprout, Truck, MoreHorizontal, Settings, Lock, Palette, Mic, Image as ImageIcon, PlusCircle, Smile, CloudSun, Heart, Sun, ShoppingBag, Cloud, CloudRain, CloudLightning, CloudSnow, CloudDrizzle, CloudFog, RefreshCw, Utensils, Smartphone, Minus, Plus, LayoutGrid, X, Upload, Type, RefreshCcw, Download, Calendar as CalendarIcon, FileText, Camera as CameraIcon, Wallet, Phone } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { motion, AnimatePresence } from 'motion/react';
import { ThemeSettings, UserProfile, Song, Screen } from '../types';
import { generateId } from '../utils/id';

const ResponsiveGridLayoutComponent = WidthProvider(Responsive);

import { MusicPlayerWidget } from './MusicPlayerWidget';
import { ProfileCardWidget } from './ProfileCardWidget';
import { DynamicStatusWidget } from './DynamicStatusWidget';
import { LoveWidget } from './LoveWidget';
import { AcrylicStandWidget } from './AcrylicStandWidget';

interface Props {
  onNavigate: (screen: Screen) => void;
  onLock: () => void;
  theme: ThemeSettings;
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  unreadCount: number;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  // Music props
  songs: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

interface WeatherData {
  temp: number;
  condition: string;
  city: string;
  high: number;
  low: number;
  code: number;
  forecast: Array<{
    day: string;
    code: number;
    temp: number;
  }>;
}

function AppIcon({ id, icon: Icon, label, onClick, onLongPress, onEditIcon, isEditingLayout, theme, badge }: { id: string, icon: any, label: string, onClick?: () => void, onLongPress?: () => void, onEditIcon?: () => void, isEditingLayout?: boolean, theme: ThemeSettings, badge?: number }) {
  const customImage = theme.customIcons?.[id];
  const touchStartTime = useRef<number>(0);
  const touchStartPos = useRef<{x: number, y: number}>({x: 0, y: 0});
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  return (
    <button 
      className={`flex flex-col items-center gap-1.5 group relative w-full h-full touch-manipulation ${isEditingLayout ? 'animate-pulse' : ''}`}
      onPointerDown={(e) => {
        touchStartTime.current = Date.now();
        touchStartPos.current = { x: e.clientX, y: e.clientY };
        if (onLongPress) {
          longPressTimer.current = setTimeout(() => {
            onLongPress();
          }, 600); // Slightly longer for safety
        }
      }}
      onPointerUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onPointerCancel={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Only trigger if it wasn't a long press (approx)
        if (Date.now() - touchStartTime.current < 500) {
          if (!isEditingLayout) {
            onClick?.();
          }
        }
      }}
    >
      <div 
        className="w-[52px] h-[52px] backdrop-blur-md rounded-[1.2rem] flex items-center justify-center shadow-sm group-active:scale-95 transition-transform overflow-hidden relative"
        style={{ backgroundColor: customImage ? 'transparent' : theme.iconBgColor }}
      >
        {customImage ? (
          <img src={customImage} alt={label} className="w-full h-full object-cover" />
        ) : (
          <Icon size={26} className="text-neutral-700" strokeWidth={2} />
        )}
        {isEditingLayout && (
          <div 
            className="absolute inset-0 bg-black/20 flex items-center justify-center cancel-drag cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onEditIcon) onEditIcon();
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Upload size={20} className="text-white drop-shadow-md" />
          </div>
        )}
      </div>
      {badge && badge > 0 ? (
        <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white z-10 shadow-sm">
          {badge}
        </div>
      ) : null}
      <span className="text-[11px] font-medium text-neutral-800 drop-shadow-sm">{label}</span>
    </button>
  );
}

const getWeatherIcon = (code: number, size: number = 24, className: string = "") => {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return <Sun size={size} className={className} />;
  if (code === 1 || code === 2 || code === 3) return <CloudSun size={size} className={className} />;
  if (code === 45 || code === 48) return <CloudFog size={size} className={className} />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className={className} />;
  if (code >= 61 && code <= 67) return <CloudRain size={size} className={className} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className={className} />;
  if (code >= 80 && code <= 82) return <CloudRain size={size} className={className} />;
  if (code >= 95 && code <= 99) return <CloudLightning size={size} className={className} />;
  return <CloudSun size={size} className={className} />;
};

const getWeatherDescription = (code: number) => {
  if (code === 0) return "晴";
  if (code === 1 || code === 2 || code === 3) return "多云";
  if (code === 45 || code === 48) return "雾";
  if (code >= 51 && code <= 55) return "毛毛雨";
  if (code >= 61 && code <= 67) return "雨";
  if (code >= 71 && code <= 77) return "雪";
  if (code >= 80 && code <= 82) return "阵雨";
  if (code >= 95 && code <= 99) return "雷雨";
  return "多云";
};

export function HomeScreen({ onNavigate, onLock, theme, setTheme, unreadCount, userProfile, setUserProfile, songs, currentSongIndex, isPlaying, currentTime, duration, onPlayPause, onNext, onPrev, currentPage, setCurrentPage }: Props) {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<'anniversary' | 'image' | 'signature' | 'couple-sign' | 'memo' | 'music-player' | 'profile-card' | 'dynamic-status' | 'love-widget' | null>(null);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [anniversaryTitleInput, setAnniversaryTitleInput] = useState('');
  const [anniversaryDateInput, setAnniversaryDateInput] = useState('');
  const [signatureInput, setSignatureInput] = useState('');
  const [coupleSignInput, setCoupleSignInput] = useState({ text1: '', text2: '', color: '' });
  const [memoInput, setMemoInput] = useState({ content: '', color: '' });
  const [musicPlayerInput, setMusicPlayerInput] = useState({ title: '', avatar1: '', avatar2: '' });
  const [profileCardInput, setProfileCardInput] = useState({ name: '', signature: '', avatar: '', bgImage: '', date: '' });
  const [dynamicStatusBgInput, setDynamicStatusBgInput] = useState('');
  const [loveWidgetInput, setLoveWidgetInput] = useState({ avatar1: '', avatar2: '', bgImage: '', name1: '', name2: '', bottomMessage: '', startDate: '' });
  const [activeIconId, setActiveIconId] = useState<string | null>(null);
  const [showIconEditModal, setShowIconEditModal] = useState(false);
  const [foodRoulette, setFoodRoulette] = useState<{spinning: boolean, result: string | null}>({spinning: false, result: null});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isRestoringScroll = useRef<boolean>(true);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const FOOD_OPTIONS = ['火锅', '烧烤', '麻辣烫', '汉堡', '披萨', '日料', '韩餐', '轻食', '面条', '米线', '饺子', '炒菜', '烤肉', '炸鸡', '螺蛳粉'];

  const spinFoodRoulette = () => {
    if (foodRoulette.spinning) return;
    setFoodRoulette({ spinning: true, result: null });
    
    let spins = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      setFoodRoulette({ 
        spinning: true, 
        result: FOOD_OPTIONS[Math.floor(Math.random() * FOOD_OPTIONS.length)] 
      });
      spins++;
      if (spins >= maxSpins) {
        clearInterval(interval);
        setFoodRoulette({ 
          spinning: false, 
          result: FOOD_OPTIONS[Math.floor(Math.random() * FOOD_OPTIONS.length)] 
        });
      }
    }, 100);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeIconId) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTheme(prev => ({
            ...prev,
            customIcons: {
              ...(prev.customIcons || {}),
              [activeIconId]: event.target?.result as string
            }
          }));
          setShowIconEditModal(false);
          setActiveIconId(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestoreDefaultIcon = () => {
    if (activeIconId) {
      setTheme(prev => {
        const newIcons = { ...(prev.customIcons || {}) };
        delete newIcons[activeIconId];
        return { ...prev, customIcons: newIcons };
      });
      setShowIconEditModal(false);
      setActiveIconId(null);
    }
  };

  const availableWidgets = [
    { type: 'weather', label: '天气', w: 4, h: 2, icon: CloudSun },
    { type: 'anniversary', label: '纪念日', w: 2, h: 1, icon: Heart },
    { type: 'image', label: '照片', w: 2, h: 1, icon: ImageIcon },
    { type: 'signature', label: '个性签名', w: 4, h: 1, icon: Type },
    { type: 'food-roulette', label: '今天吃啥', w: 2, h: 2, icon: Utensils },
    { type: 'couple-sign', label: '情侣签', w: 2, h: 2, icon: Heart },
    { type: 'memo', label: '备忘录', w: 2, h: 2, icon: Book },
    { type: 'music-player', label: '随身听', w: 4, h: 2, icon: Music },
    { type: 'profile-card', label: '名片', w: 2, h: 2, icon: Smartphone },
    { type: 'dynamic-status', label: '动态状态', w: 4, h: 2, icon: LayoutGrid },
    { type: 'app-chat', label: '微信', w: 1, h: 1, icon: MessageCircle },
    { type: 'app-persona', label: '世界书', w: 1, h: 1, icon: Book },
    { type: 'app-music', label: '音乐', w: 1, h: 1, icon: Music },
    { type: 'app-xhs', label: '小红书', w: 1, h: 1, icon: Hash },
    { type: 'app-treehole', label: '树洞', w: 1, h: 1, icon: Smile },
    { type: 'app-taobao', label: '淘宝', w: 1, h: 1, icon: ShoppingBag },
    { type: 'app-fooddelivery', label: '外卖', w: 1, h: 1, icon: Utensils },
    { type: 'app-bartender', label: '调酒师', w: 1, h: 1, icon: Heart },
    { type: 'app-aiphones', label: 'AI分身', w: 1, h: 1, icon: Smartphone },
    { type: 'app-photoalbum', label: '相册', w: 1, h: 1, icon: ImageIcon },
    { type: 'app-phone', label: '电话', w: 1, h: 1, icon: Phone },
    { type: 'love-widget', label: '恋爱组件', w: 4, h: 2, icon: Heart },
    { type: 'acrylic-stand', label: '立牌组件', w: 4, h: 2, icon: ImageIcon },
  ];

  const addWidget = (widgetTemplate: any) => {
    const newWidget = {
      id: generateId(),
      type: widgetTemplate.type,
      x: 0,
      y: 99, // puts it at the bottom
      w: widgetTemplate.w,
      h: widgetTemplate.h
    };
    
    const newPages = [...(theme.layout?.pages || [])];
    if (!newPages[currentPage]) {
      newPages[currentPage] = { id: `page-${currentPage}`, widgets: [] };
    }
    newPages[currentPage] = {
      ...newPages[currentPage],
      widgets: [...newPages[currentPage].widgets, newWidget]
    };
    setTheme(prev => ({ ...prev, layout: { ...prev.layout, pages: newPages } }));
    setShowAddWidgetModal(false);
  };

  const removeWidget = (pageIndex: number, widgetId: string) => {
    const newPages = [...(theme.layout?.pages || [])];
    newPages[pageIndex] = {
      ...newPages[pageIndex],
      widgets: newPages[pageIndex].widgets.filter(w => w.id !== widgetId)
    };
    setTheme(prev => ({ ...prev, layout: { ...prev.layout, pages: newPages } }));
  };

  useEffect(() => {
    if (!theme.layout) {
      setTheme(prev => ({
        ...prev,
        layout: {
          pages: [
            {
              id: 'page-0',
              widgets: [
                { id: 'time', type: 'weather', x: 0, y: 0, w: 4, h: 2 }, // Simplified for now
                { id: 'anniversary', type: 'anniversary', x: 0, y: 2, w: 2, h: 1 },
                { id: 'image', type: 'image', x: 2, y: 2, w: 2, h: 1 },
                { id: 'app-chat', type: 'app-chat', x: 0, y: 3, w: 1, h: 1 },
                { id: 'app-persona', type: 'app-persona', x: 1, y: 3, w: 1, h: 1 },
                { id: 'app-music', type: 'app-music', x: 2, y: 3, w: 1, h: 1 },
                { id: 'app-xhs', type: 'app-xhs', x: 3, y: 3, w: 1, h: 1 },
                { id: 'music-player', type: 'music-player', x: 0, y: 4, w: 4, h: 2 },
                { id: 'weather', type: 'weather', x: 0, y: 6, w: 4, h: 2 },
              ]
            },
            {
              id: 'page-1',
              widgets: [
                { id: 'app-treehole', type: 'app-treehole', x: 0, y: 0, w: 1, h: 1 },
                { id: 'app-taobao', type: 'app-taobao', x: 1, y: 0, w: 1, h: 1 },
                { id: 'app-fooddelivery', type: 'app-fooddelivery', x: 2, y: 0, w: 1, h: 1 },
                { id: 'app-bartender', type: 'app-bartender', x: 3, y: 0, w: 1, h: 1 },
                { id: 'app-aiphones', type: 'app-aiphones', x: 0, y: 1, w: 1, h: 1 },
                { id: 'app-photoalbum', type: 'app-photoalbum', x: 1, y: 1, w: 1, h: 1 },
                { id: 'app-weather', type: 'app-weather', x: 2, y: 1, w: 1, h: 1 },
                { id: 'app-calendar', type: 'app-calendar', x: 3, y: 1, w: 1, h: 1 },
                { id: 'app-notes', type: 'app-notes', x: 0, y: 2, w: 1, h: 1 },
                { id: 'app-wallet', type: 'app-wallet', x: 1, y: 2, w: 1, h: 1 },
                { id: 'app-calculator', type: 'app-calculator', x: 2, y: 2, w: 1, h: 1 },
                { id: 'app-camera', type: 'app-camera', x: 3, y: 2, w: 1, h: 1 },
                { id: 'acrylic-stand-default', type: 'acrylic-stand', x: 0, y: 3, w: 4, h: 2 },
              ]
            }
          ]
        }
      }));
    } else {
      let migrated = false;
      const newPages = theme.layout.pages.map(page => {
        const newWidgets: any[] = [];
        page.widgets.forEach(w => {
          if (w.type === 'app') {
            migrated = true;
            if (w.id === 'apps1') {
              newWidgets.push({ id: 'app-chat', type: 'app-chat', x: w.x, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-persona', type: 'app-persona', x: w.x + 1, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-music', type: 'app-music', x: w.x + 2, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-xhs', type: 'app-xhs', x: w.x + 3, y: w.y, w: 1, h: 1 });
            } else if (w.id === 'apps2') {
              newWidgets.push({ id: 'app-treehole', type: 'app-treehole', x: w.x, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-taobao', type: 'app-taobao', x: w.x + 1, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-fooddelivery', type: 'app-fooddelivery', x: w.x + 2, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-bartender', type: 'app-bartender', x: w.x + 3, y: w.y, w: 1, h: 1 });
              newWidgets.push({ id: 'app-aiphones', type: 'app-aiphones', x: w.x, y: w.y + 1, w: 1, h: 1 });
              newWidgets.push({ id: 'app-photoalbum', type: 'app-photoalbum', x: w.x + 1, y: w.y + 1, w: 1, h: 1 });
            }
          } else {
            newWidgets.push(w);
          }
        });
        return { ...page, widgets: newWidgets };
      });
      if (migrated) {
        setTheme(prev => ({ ...prev, layout: { pages: newPages } }));
      }
    }
  }, [theme.layout, setTheme]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useLayoutEffect(() => {
    // Restore scroll position synchronously before paint
    if (scrollContainerRef.current && currentPage > 0) {
      const width = scrollContainerRef.current.clientWidth;
      if (width > 0) {
        scrollContainerRef.current.scrollLeft = currentPage * width;
        isRestoringScroll.current = false;
      } else {
        // Fallback if width is 0 during layout effect
        const timer = setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = currentPage * scrollContainerRef.current.clientWidth;
          }
          isRestoringScroll.current = false;
        }, 50);
        return () => clearTimeout(timer);
      }
    } else {
      isRestoringScroll.current = false;
    }
  }, []); // Run once on mount

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    let isMounted = true;

    // Function to fetch weather data
    const fetchWeather = async (latitude: number, longitude: number, cityName?: string) => {
      if (!isFinite(latitude) || !isFinite(longitude)) {
        console.error("Invalid coordinates:", latitude, longitude);
        handleFallback("无效坐标");
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        // 1. Fetch Weather Data
        let weatherData;
        try {
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`,
            { 
              signal: controller.signal,
              mode: 'cors',
              referrerPolicy: 'no-referrer'
            }
          );
          clearTimeout(timeoutId);

          if (!weatherRes.ok) throw new Error(`Weather API failed: ${weatherRes.status}`);
          weatherData = await weatherRes.json();
        } catch (fetchError) {
          console.warn("Weather API unreachable, using mock data:", fetchError);
          // Fallback to mock data if API fails
          weatherData = {
            current: { temperature_2m: 25, weather_code: 0 },
            daily: {
              time: [new Date().toISOString(), new Date(Date.now() + 86400000).toISOString(), new Date(Date.now() + 172800000).toISOString(), new Date(Date.now() + 259200000).toISOString(), new Date(Date.now() + 345600000).toISOString()],
              weather_code: [0, 1, 2, 3, 0],
              temperature_2m_max: [28, 27, 26, 25, 28],
              temperature_2m_min: [18, 19, 18, 17, 18]
            }
          };
          // We still want to try reverse geocoding if possible, or default to "模拟位置"
          if (!cityName) cityName = "模拟位置";
        }

        if (!isMounted) return;

        // 2. Determine City Name
        let finalCityName = cityName;
        if (!finalCityName) {
          try {
            // Reverse Geocoding if city name not provided
            const cityRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`,
              { referrerPolicy: 'no-referrer' }
            );
            if (cityRes.ok) {
              const cityData = await cityRes.json();
              finalCityName = cityData.city || cityData.locality || cityData.principalSubdivision || "未知城市";
            } else {
              finalCityName = "未知城市";
            }
          } catch (e) {
            console.error("Reverse geocoding failed", e);
            finalCityName = "未知城市";
          }
        }
        
        // Simplify city name
        finalCityName = finalCityName?.replace(/市$/, '') || "未知城市";

        // Process Forecast
        const daily = weatherData.daily;
        const forecast = [];
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        // Get next 4 days (skipping today which is index 0)
        for (let i = 1; i <= 4; i++) {
          const date = new Date(daily.time[i]);
          forecast.push({
            day: days[date.getDay()],
            code: daily.weather_code[i],
            temp: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2)
          });
        }

        setWeather({
          temp: Math.round(weatherData.current.temperature_2m),
          condition: getWeatherDescription(weatherData.current.weather_code),
          city: finalCityName,
          high: Math.round(daily.temperature_2m_max[0]),
          low: Math.round(daily.temperature_2m_min[0]),
          code: weatherData.current.weather_code,
          forecast: forecast
        });
        setLoading(false);

      } catch (error) {
        console.error("Failed to fetch weather:", error);
        if (!isMounted) return;
        setErrorMsg("获取失败");
        setLoading(false);
      }
    };

    const handleFallback = (msg: string) => {
       if (!isMounted) return;
       console.warn("Weather fallback triggered:", msg);
       // Default to Beijing if location fails
       if (msg === "定位失败" || msg === "无定位权限" || msg === "无效坐标") {
         fetchWeather(39.9042, 116.4074, "北京");
       } else {
         setErrorMsg(msg);
         setLoading(false);
       }
    };

    // Check for custom location override
    if (theme.weatherLocation && theme.weatherLocation.trim() !== '') {
      const locationQuery = theme.weatherLocation.trim();
      // Geocode the custom location
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationQuery)}&count=1&language=zh&format=json`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (data.results && data.results.length > 0) {
            const { latitude, longitude } = data.results[0];
            fetchWeather(latitude, longitude, locationQuery); 
          } else {
            handleFallback("未找到该城市");
          }
        })
        .catch(err => {
          console.error("Geocoding failed:", err);
          handleFallback("搜索失败");
        });
    } else {
      handleFallback("请在设置中输入城市");
    }

    return () => {
      isMounted = false;
    };
  }, [theme.weatherLocation]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]); // Re-run when location setting changes

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
  };

  const getDaysTogether = () => {
    if (!userProfile.anniversaryDate) return 0;
    const start = new Date(userProfile.anniversaryDate).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setTheme(prev => ({
          ...prev,
          widgetImages: { ...prev.widgetImages, bottomLeft: base64 }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderWidget = (widget: any) => {
    switch (widget.type) {
      case 'anniversary':
        return (
          <div className="w-full h-full relative group">
            <div 
              className="absolute inset-0 bg-white/60 backdrop-blur-xl rounded-[1.5rem] p-4 flex flex-col justify-center shadow-sm border border-white/50 overflow-hidden cursor-pointer active:scale-95 transition-transform"
              onClick={() => {
                setAnniversaryTitleInput(userProfile.anniversaryTitle || '相恋');
                setAnniversaryDateInput(userProfile.anniversaryDate || '');
                setEditingWidget('anniversary');
              }}
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-pink-300/20 rounded-full blur-xl"></div>
              <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-blue-300/20 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="fill-pink-400 text-pink-400 animate-pulse" />
                  <span className="text-[13px] text-neutral-600 font-medium">{userProfile.anniversaryTitle || '相恋'}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-neutral-800 tracking-tight">{getDaysTogether()}</span>
                  <span className="text-[14px] text-neutral-500 font-medium">天</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-2">
                  {userProfile.anniversaryDate ? `起始日: ${userProfile.anniversaryDate}` : '点击设置纪念日'}
                </div>
              </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="w-full h-full relative group">
            <div 
              className="absolute inset-0 rounded-[1.5rem] overflow-hidden shadow-sm border border-white/40 cursor-pointer active:scale-95 transition-transform"
              onClick={() => imageInputRef.current?.click()}
            >
              <img 
                src={theme.widgetImages?.bottomLeft || "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80"} 
                className="w-full h-full object-cover"
                alt="Portrait 2"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageIcon size={24} className="text-white" />
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={imageInputRef}
                onChange={handleImageUpload}
              />
            </div>
          </div>
        );
      case 'weather':
        return (
          <div className="w-full h-full relative group shrink-0">
            <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-lg border border-white/20">
              {/* Background */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={theme.weatherWidgetBg || "https://images.unsplash.com/photo-1595835018635-43d94615d5d7?auto=format&fit=crop&w=800&q=80"} 
                  className="w-full h-full object-cover"
                  alt="Weather Background"
                />
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
              
              {/* Content */}
              <div className="relative z-10 w-full h-full p-5 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {weather ? getWeatherIcon(weather.code, 24, "text-white drop-shadow-md") : <CloudSun size={24} className="text-white drop-shadow-md" />}
                      <span className="text-lg font-medium drop-shadow-md">{weather?.condition || (loading ? "加载中..." : (errorMsg || "无数据"))}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 opacity-90">
                      <span className="text-xs drop-shadow-md">
                        {errorMsg ? errorMsg : (weather?.city || (theme.weatherLocation ? "搜索中..." : "定位中..."))}
                      </span>
                      <button 
                        onClick={() => loadWeather()} 
                        className={`ml-1 p-1 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors ${loading ? 'animate-spin' : ''}`}
                      >
                        <RefreshCw size={10} className="text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="text-6xl font-light tracking-tighter drop-shadow-md">
                    {weather?.temp ?? "--"}°
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex gap-4 text-xs font-medium">
                    {weather?.forecast ? (
                      weather.forecast.map((day, index) => (
                        <div key={index} className="flex flex-col items-center gap-1">
                          <span className="opacity-80">{day.day}</span>
                          {getWeatherIcon(day.code, 14)}
                          <span>{day.temp}°</span>
                        </div>
                      ))
                    ) : (
                      // Skeleton / Loading state
                      [1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-1 opacity-50">
                          <span className="w-6 h-3 bg-white/30 rounded"></span>
                          <div className="w-3 h-3 bg-white/30 rounded-full"></div>
                          <span className="w-4 h-3 bg-white/30 rounded"></span>
                        </div>
                      ))
                    )}
                  </div>
                <div className="flex flex-col items-end text-xs font-medium opacity-90">
                  <span>最高: {weather?.high ?? "--"}°</span>
                  <span>最低: {weather?.low ?? "--"}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
      case 'signature':
        return (
          <div className="w-full h-full relative group">
            <button 
              className="absolute inset-0 bg-white/60 backdrop-blur-xl rounded-[1.5rem] p-4 flex flex-col justify-center shadow-sm border border-white/50 overflow-hidden cursor-pointer active:scale-95 transition-transform text-left"
              onPointerDown={(e) => {
                touchStartTime.current = Date.now();
                longPressTimer.current = setTimeout(() => setIsEditingLayout(true), 600);
              }}
              onPointerUp={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onPointerCancel={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - touchStartTime.current < 500) {
                  setSignatureInput(userProfile.signature || '今天也要开心呀~');
                  setEditingWidget('signature');
                }
              }}
            >
              {theme.signature?.bgImage && (
                <img src={theme.signature.bgImage} alt="background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-40" />
              )}
              
              {!theme.signature?.bgImage && (
                <>
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-300/20 rounded-full blur-xl"></div>
                  <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-orange-300/20 rounded-full blur-xl"></div>
                </>
              )}
              
              <div className="relative z-10 flex items-center gap-3 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  {theme.signature?.avatar ? (
                    <img src={theme.signature.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Type size={20} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] text-neutral-800 font-medium leading-tight line-clamp-2">
                    {userProfile.signature || '今天也要开心呀~'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        );
      case 'food-roulette':
        return (
          <div className="w-full h-full relative group">
            <button 
              className="absolute inset-0 bg-white/60 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col items-center justify-center shadow-sm border border-white/50 overflow-hidden cursor-pointer active:scale-95 transition-transform"
              onPointerDown={(e) => {
                touchStartTime.current = Date.now();
                longPressTimer.current = setTimeout(() => setIsEditingLayout(true), 600);
              }}
              onPointerUp={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onPointerCancel={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - touchStartTime.current < 500) {
                  spinFoodRoulette();
                }
              }}
            >
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-red-300/20 rounded-full blur-xl"></div>
              <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-orange-300/20 rounded-full blur-xl"></div>
              
              <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center shadow-md text-white ${foodRoulette.spinning ? 'animate-spin' : ''}`}>
                  <Utensils size={32} />
                </div>
                <div className="text-center mt-2">
                  <p className="text-[12px] text-neutral-500 font-medium mb-1">今天吃啥？</p>
                  <p className="text-xl font-bold text-neutral-800 tracking-tight h-7">
                    {foodRoulette.result || '点击抽取'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        );
      case 'couple-sign': {
        const baseColor = theme.coupleSign?.color?.startsWith('#') 
          ? theme.coupleSign.color 
          : ({ rose: '#f43f5e', blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', purple: '#a855f7' }[theme.coupleSign?.color || 'rose'] || '#f43f5e');

        return (
          <div className="w-full h-full relative group">
            <button 
              className="absolute inset-0 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col justify-end shadow-sm border overflow-hidden cursor-pointer active:scale-95 transition-transform text-left"
              style={{
                background: `linear-gradient(to bottom right, ${baseColor}22, ${baseColor}44)`,
                borderColor: `${baseColor}66`
              }}
              onPointerDown={(e) => {
                touchStartTime.current = Date.now();
                longPressTimer.current = setTimeout(() => setIsEditingLayout(true), 600);
              }}
              onPointerUp={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onPointerCancel={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - touchStartTime.current < 500) {
                  setCoupleSignInput({
                    text1: theme.coupleSign?.text1 || 'love over rules',
                    text2: theme.coupleSign?.text2 || 'To meet is to sig on',
                    color: baseColor
                  });
                  setEditingWidget('couple-sign');
                }
              }}
            >
              {theme.coupleSign?.bgImage && (
                <img src={theme.coupleSign.bgImage} alt="background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-40" />
              )}
              <div className="flex flex-col gap-2 mt-2 relative z-10 pointer-events-none w-full">
                {/* Middle row */}
                <div 
                  className="rounded-full p-1 pr-4 flex items-center justify-between shadow-sm"
                  style={{ backgroundColor: baseColor }}
                >
                  <div 
                    className="w-9 h-9 rounded-full bg-white overflow-hidden shrink-0 border-2"
                    style={{ borderColor: baseColor }}
                  >
                    <img src={theme.coupleSign?.avatar1 || "https://picsum.photos/seed/boy/100/100"} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white text-[10px] font-bold tracking-wide">{theme.coupleSign?.text1 || 'love over rules'}</span>
                </div>

                {/* Bottom row */}
                <div 
                  className="bg-white rounded-full p-1 pl-4 flex items-center justify-between shadow-sm border"
                  style={{ borderColor: `${baseColor}33` }}
                >
                  <span className="text-[10px] font-bold tracking-wide" style={{ color: baseColor }}>{theme.coupleSign?.text2 || 'To meet is to sig on'}</span>
                  <div 
                    className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-white"
                    style={{ backgroundColor: `${baseColor}22` }}
                  >
                    <img src={theme.coupleSign?.avatar2 || "https://picsum.photos/seed/girl/100/100"} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </button>
          </div>
        );
      }
      case 'memo': {
        const baseColor = theme.memo?.color?.startsWith('#') 
          ? theme.memo.color 
          : ({ yellow: '#facc15', blue: '#60a5fa', green: '#4ade80', pink: '#f472b6', purple: '#c084fc' }[theme.memo?.color || 'yellow'] || '#facc15');

        return (
          <div className="w-full h-full relative group">
            <button 
              className="absolute inset-0 backdrop-blur-xl rounded-[2rem] p-4 flex flex-col shadow-sm border overflow-hidden cursor-pointer active:scale-95 transition-transform text-left"
              style={{
                backgroundColor: `${baseColor}22`,
                borderColor: `${baseColor}66`
              }}
              onPointerDown={(e) => {
                touchStartTime.current = Date.now();
                longPressTimer.current = setTimeout(() => setIsEditingLayout(true), 600);
              }}
              onPointerUp={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onPointerCancel={() => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - touchStartTime.current < 500) {
                  setMemoInput({
                    content: theme.memo?.content || '点击编辑备忘录...',
                    color: baseColor
                  });
                  setEditingWidget('memo');
                }
              }}
            >
              <div className="flex items-center gap-2 mb-2 opacity-80 pointer-events-none" style={{ color: baseColor }}>
                <Book size={14} />
                <span className="text-xs font-bold">备忘录</span>
              </div>
              <div className="flex-1 overflow-y-auto text-sm font-medium whitespace-pre-wrap leading-relaxed custom-scrollbar text-neutral-800 pointer-events-none">
                {theme.memo?.content || '点击编辑备忘录...'}
              </div>
            </button>
          </div>
        );
      }
      case 'music-player':
        return (
          <MusicPlayerWidget 
            theme={theme}
            currentSong={songs[currentSongIndex]}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={onPlayPause}
            onNext={onNext}
            onPrev={onPrev}
            onLongPress={() => setIsEditingLayout(true)}
            onNavigate={() => {
              setMusicPlayerInput({
                title: theme.musicPlayer?.title || '想变成你的随身听...',
                avatar1: theme.musicPlayer?.avatar1 || '',
                avatar2: theme.musicPlayer?.avatar2 || ''
              });
              setEditingWidget('music-player');
            }}
          />
        );
      case 'profile-card':
        return (
          <ProfileCardWidget 
            theme={theme}
            onLongPress={() => setIsEditingLayout(true)}
            onEdit={() => {
              setProfileCardInput({
                name: theme.profileCard?.name || '小兔叽萌',
                signature: theme.profileCard?.signature || '天生我萌必有用·ฅ^•ﻌ•^ฅ·',
                avatar: theme.profileCard?.avatar || '',
                bgImage: theme.profileCard?.bgImage || '',
                date: theme.profileCard?.date || '02-27'
              });
              setEditingWidget('profile-card');
            }}
          />
        );
      case 'dynamic-status':
        return (
          <DynamicStatusWidget 
            onLongPress={() => setIsEditingLayout(true)} 
            bgImage={theme.dynamicStatusBg}
            onClick={() => {
              setDynamicStatusBgInput(theme.dynamicStatusBg || '');
              setEditingWidget('dynamic-status');
            }}
          />
        );
      case 'love-widget':
        return (
          <div className="w-full h-full cursor-pointer" onClick={() => {
            setLoveWidgetInput({
              avatar1: theme.loveWidget?.avatar1 || 'https://picsum.photos/seed/avatar1/100/100',
              avatar2: theme.loveWidget?.avatar2 || 'https://picsum.photos/seed/avatar2/100/100',
              bgImage: theme.loveWidget?.bgImage || 'https://picsum.photos/seed/bg/800/600?blur=4',
              name1: theme.loveWidget?.name1 || '小乖',
              name2: theme.loveWidget?.name2 || '小宝',
              bottomMessage: theme.loveWidget?.bottomMessage || '请靠近我和我的心',
              startDate: theme.loveWidget?.startDate || new Date().toISOString().split('T')[0]
            });
            setEditingWidget('love-widget');
          }}>
            <LoveWidget 
              avatar1={theme.loveWidget?.avatar1 || 'https://picsum.photos/seed/avatar1/100/100'}
              avatar2={theme.loveWidget?.avatar2 || 'https://picsum.photos/seed/avatar2/100/100'}
              backgroundImage={theme.loveWidget?.bgImage || 'https://picsum.photos/seed/bg/800/600?blur=4'}
              name1={theme.loveWidget?.name1 || '小乖'}
              name2={theme.loveWidget?.name2 || '小宝'}
              startDate={theme.loveWidget?.startDate || new Date().toISOString().split('T')[0]}
              bottomMessage={theme.loveWidget?.bottomMessage || '请靠近我和我的心'}
            />
          </div>
        );
      case 'acrylic-stand':
        return (
          <div className="w-full h-full">
            <AcrylicStandWidget 
              leftImage={theme.acrylicStand?.leftImage}
              centerImage={theme.acrylicStand?.centerImage}
              rightImage={theme.acrylicStand?.rightImage}
              bgImage={theme.acrylicStand?.bgImage}
              isEditing={isEditingLayout}
              onUpdate={(updates) => {
                setTheme(prev => ({
                  ...prev,
                  acrylicStand: {
                    ...(prev.acrylicStand || {}),
                    ...updates
                  }
                }));
              }}
            />
          </div>
        );
      case 'app-chat':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="chat" icon={MessageCircle} label="微信" onClick={() => onNavigate('chat')} theme={theme} badge={unreadCount} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('chat'); setShowIconEditModal(true); }} /></div>;
      case 'app-persona':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="persona" icon={Book} label="世界书" onClick={() => onNavigate('persona')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('persona'); setShowIconEditModal(true); }} /></div>;
      case 'app-music':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="music" icon={Music} label="音乐" onClick={() => onNavigate('music')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('music'); setShowIconEditModal(true); }} /></div>;
      case 'app-xhs':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="xhs" icon={Hash} label="小红书" onClick={() => onNavigate('xhs')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('xhs'); setShowIconEditModal(true); }} /></div>;
      case 'app-treehole':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="treehole" icon={Smile} label="树洞" onClick={() => onNavigate('treehole')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('treehole'); setShowIconEditModal(true); }} /></div>;
      case 'app-taobao':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="taobao" icon={ShoppingBag} label="淘宝" onClick={() => onNavigate('taobao')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('taobao'); setShowIconEditModal(true); }} /></div>;
      case 'app-fooddelivery':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="fooddelivery" icon={Utensils} label="外卖" onClick={() => onNavigate('fooddelivery')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('fooddelivery'); setShowIconEditModal(true); }} /></div>;
      case 'app-bartender':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="bartender" icon={Heart} label="调酒师" onClick={() => onNavigate('bartender')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('bartender'); setShowIconEditModal(true); }} /></div>;
      case 'app-aiphones':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="aiphones" icon={Smartphone} label="AI分身" onClick={() => onNavigate('aiphones')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('aiphones'); setShowIconEditModal(true); }} /></div>;
      case 'app-photoalbum':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="photoalbum" icon={ImageIcon} label="相册" onClick={() => onNavigate('photoalbum')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('photoalbum'); setShowIconEditModal(true); }} /></div>;
      case 'app-phone':
        return <div className="w-full h-full flex items-center justify-center"><AppIcon id="phone" icon={Phone} label="电话" onClick={() => onNavigate('phone')} theme={theme} isEditingLayout={isEditingLayout} onLongPress={() => setIsEditingLayout(true)} onEditIcon={() => { setActiveIconId('phone'); setShowIconEditModal(true); }} /></div>;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`w-full h-full pb-[env(safe-area-inset-bottom)] flex flex-col overflow-hidden relative`}
      style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'max(3rem, env(safe-area-inset-top))' }}
      onPointerDown={(e) => {
        // Only trigger on the background, not on children
        if (e.target === e.currentTarget) {
          touchStartTime.current = Date.now();
          longPressTimer.current = setTimeout(() => {
            setIsEditingLayout(true);
          }, 600);
        }
      }}
      onPointerUp={(e) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onPointerCancel={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
    >
      {/* Scrollable Pages Container */}
      <div className="flex-1 overflow-hidden relative w-full">
        <div 
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={(e) => {
            if (isRestoringScroll.current) return;
            const scrollLeft = e.currentTarget.scrollLeft;
            const width = e.currentTarget.clientWidth;
            if (width > 0) {
              const page = Math.round(scrollLeft / width);
              if (!isNaN(page) && page !== currentPage) {
                setCurrentPage(page);
              }
            }
          }}
          ref={scrollContainerRef}
        >
          <style dangerouslySetInnerHTML={{__html: `
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}} />
          {theme.layout?.pages.map((page, pageIndex) => (
            <div 
              key={page.id} 
              id={page.id} 
              className="w-full h-full shrink-0 overflow-y-auto overflow-x-hidden snap-center"
            >
              <ResponsiveGridLayoutComponent
                className="layout relative z-10"
                isDraggable={isEditingLayout}
                isResizable={isEditingLayout}
                draggableCancel=".cancel-drag"
                layouts={{ lg: page.widgets.map(w => ({ 
                  i: w.id, 
                  x: w.x, 
                  y: w.y, 
                  w: w.w, 
                  h: w.h
                })) }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 4, md: 4, sm: 4, xs: 4, xxs: 4 }}
                rowHeight={130}
                onLayoutChange={(layout) => {
                  const newPages = [...(theme.layout?.pages || [])];
                  newPages[pageIndex] = {
                    ...newPages[pageIndex],
                    widgets: newPages[pageIndex].widgets.map(w => {
                      const l = layout.find(item => item.i === w.id);
                      return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
                    })
                  };
                  setTheme(prev => ({ ...prev, layout: { ...prev.layout, pages: newPages } }));
                }}
              >
                {page.widgets.map(widget => (
                  <div 
                    key={widget.id} 
                    className={isEditingLayout ? "animate-pulse" : ""}
                  >
                    {isEditingLayout && (
                      <button 
                        className="absolute -top-2 -left-2 z-50 w-6 h-6 bg-neutral-200/90 backdrop-blur-md text-neutral-600 rounded-full flex items-center justify-center shadow-sm border border-white/50 active:scale-95 transition-transform cursor-pointer cancel-drag"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWidget(pageIndex, widget.id);
                        }}
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                    )}
                    {renderWidget(widget)}
                  </div>
                ))}
              </ResponsiveGridLayoutComponent>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Indicators */}
      <div className="flex justify-center gap-2 my-3 shrink-0">
        {theme.layout?.pages.map((page, index) => (
          <button 
            key={page.id}
            onClick={() => {
              setCurrentPage(index);
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                  left: index * scrollContainerRef.current.clientWidth,
                  behavior: 'smooth'
                });
              }
            }}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${currentPage === index ? 'bg-white' : 'bg-white/40'}`} 
          />
        ))}
      </div>

      {/* Dock */}
      <div className="mt-auto h-[60px] mx-5 bg-white/50 backdrop-blur-2xl rounded-[2rem] flex items-center justify-around px-6 shadow-sm border border-white/40 shrink-0">
        <button 
          onClick={() => isEditingLayout ? (() => { setActiveIconId('dock_settings'); setShowIconEditModal(true); })() : onNavigate('api')} 
          className={`w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden relative ${isEditingLayout ? 'animate-pulse' : ''}`}
        >
          {theme.customIcons?.['dock_settings'] ? (
             <img src={theme.customIcons['dock_settings']} className="w-full h-full object-cover" alt="Settings" />
          ) : (
             <Settings size={22} />
          )}
          {isEditingLayout && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Upload size={16} className="text-white drop-shadow-md" />
            </div>
          )}
        </button>
        <button 
          onClick={() => isEditingLayout ? (() => { setActiveIconId('dock_layout'); setShowIconEditModal(true); })() : setIsEditingLayout(true)} 
          className={`w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden relative ${isEditingLayout ? 'animate-pulse' : ''}`}
        >
          {theme.customIcons?.['dock_layout'] ? (
             <img src={theme.customIcons['dock_layout']} className="w-full h-full object-cover" alt="Layout" />
          ) : (
             <LayoutGrid size={22} />
          )}
          {isEditingLayout && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Upload size={16} className="text-white drop-shadow-md" />
            </div>
          )}
        </button>
        <button 
          onClick={() => isEditingLayout ? (() => { setActiveIconId('dock_lock'); setShowIconEditModal(true); })() : onLock()} 
          className={`w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden relative ${isEditingLayout ? 'animate-pulse' : ''}`}
        >
          {theme.customIcons?.['dock_lock'] ? (
             <img src={theme.customIcons['dock_lock']} className="w-full h-full object-cover" alt="Lock" />
          ) : (
             <Lock size={22} />
          )}
          {isEditingLayout && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Upload size={16} className="text-white drop-shadow-md" />
            </div>
          )}
        </button>
        <button 
          onClick={() => isEditingLayout ? (() => { setActiveIconId('dock_theme'); setShowIconEditModal(true); })() : onNavigate('theme')} 
          className={`w-11 h-11 bg-black/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform overflow-hidden relative ${isEditingLayout ? 'animate-pulse' : ''}`}
        >
          {theme.customIcons?.['dock_theme'] ? (
             <img src={theme.customIcons['dock_theme']} className="w-full h-full object-cover" alt="Theme" />
          ) : (
             <Palette size={22} />
          )}
          {isEditingLayout && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <Upload size={16} className="text-white drop-shadow-md" />
            </div>
          )}
        </button>
      </div>

      {/* Edit Layout Top Bar */}
      <AnimatePresence>
        {isEditingLayout && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 bg-white/50 backdrop-blur-xl z-[60] flex items-end justify-between px-6 shadow-sm border-b border-white/40"
            style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))', height: 'calc(7rem + env(safe-area-inset-top))' }}
          >
            <button onClick={() => setShowAddWidgetModal(true)} className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center text-neutral-800 active:scale-95 transition-transform">
              <Plus size={20} />
            </button>
            <span className="font-medium text-neutral-800">编辑主屏幕</span>
            <button onClick={() => setIsEditingLayout(false)} className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-sm font-medium active:scale-95 transition-transform">
              完成
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Widget Modal */}
      <AnimatePresence>
        {showAddWidgetModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 z-[70] flex flex-col justify-end"
            onClick={() => setShowAddWidgetModal(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-h-[80vh] flex flex-col shadow-2xl" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
                <h3 className="text-xl font-bold text-neutral-800">添加小组件</h3>
                <button onClick={() => setShowAddWidgetModal(false)} className="p-2 bg-neutral-100 rounded-full text-neutral-500 active:scale-95 transition-transform">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto grid grid-cols-3 gap-4">
                {availableWidgets.map((widget, idx) => (
                  <button 
                    key={idx}
                    onClick={() => addWidget(widget)}
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-neutral-50 hover:bg-neutral-100 active:scale-95 transition-all border border-neutral-100"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500">
                      <widget.icon size={24} />
                    </div>
                    <span className="text-xs font-medium text-neutral-700">{widget.label}</span>
                    <span className="text-[10px] text-neutral-400">{widget.w}x{widget.h}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon Edit Modal */}
      {showIconEditModal && (
        <div className="absolute inset-0 bg-black/50 z-[200] flex items-center justify-center p-6" onClick={() => setShowIconEditModal(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-[280px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-6 text-center text-neutral-800">编辑图标</h3>
            
            <div className="space-y-3">
              <button 
                onClick={() => iconInputRef.current?.click()}
                className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Upload size={18} /> 更换图标图片
              </button>
              
              <button 
                onClick={handleRestoreDefaultIcon}
                className="w-full py-3.5 bg-neutral-100 text-neutral-700 font-semibold rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} /> 恢复默认图标
              </button>
              
              <button 
                onClick={() => setShowIconEditModal(false)}
                className="w-full py-3.5 text-neutral-400 font-medium active:opacity-70 transition-opacity mt-2"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anniversary Widget Edit Modal */}
      {editingWidget === 'anniversary' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义纪念日组件</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">标题</label>
              <input 
                type="text" 
                value={anniversaryTitleInput}
                onChange={(e) => setAnniversaryTitleInput(e.target.value)}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="例如：相恋、认识、陪伴"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1">起始日期</label>
              <input 
                type="date" 
                value={anniversaryDateInput}
                onChange={(e) => setAnniversaryDateInput(e.target.value)}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setUserProfile(prev => ({
                    ...prev,
                    anniversaryTitle: anniversaryTitleInput.trim(),
                    anniversaryDate: anniversaryDateInput
                  }));
                  setEditingWidget(null);
                }}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/30"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Couple Sign Widget Edit Modal */}
      {editingWidget === 'couple-sign' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义情侣签组件</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">上排文字</label>
              <input 
                type="text" 
                value={coupleSignInput.text1}
                onChange={(e) => setCoupleSignInput(prev => ({ ...prev, text1: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="例如：love over rules"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">下排文字</label>
              <input 
                type="text" 
                value={coupleSignInput.text2}
                onChange={(e) => setCoupleSignInput(prev => ({ ...prev, text2: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="例如：To meet is to sig on"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-2">主题颜色</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={coupleSignInput.color?.startsWith('#') ? coupleSignInput.color : ({ rose: '#f43f5e', blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', purple: '#a855f7' }[coupleSignInput.color || 'rose'] || '#f43f5e')}
                  onChange={(e) => setCoupleSignInput(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-sm text-neutral-500">点击选择自定义颜色</span>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-neutral-600 mb-1">图片设置</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setTheme(prev => ({
                              ...prev,
                              coupleSign: {
                                ...(prev.coupleSign || {}),
                                avatar1: event.target?.result as string
                              }
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex-1 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Upload size={14} /> 上排头像
                </button>
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setTheme(prev => ({
                              ...prev,
                              coupleSign: {
                                ...(prev.coupleSign || {}),
                                avatar2: event.target?.result as string
                              }
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex-1 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Upload size={14} /> 下排头像
                </button>
              </div>
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setTheme(prev => ({
                            ...prev,
                            coupleSign: {
                              ...(prev.coupleSign || {}),
                              bgImage: event.target?.result as string
                            }
                          }));
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="w-full py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1"
              >
                <Upload size={14} /> 更换背景壁纸
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setTheme(prev => ({
                    ...prev,
                    coupleSign: {
                      ...(prev.coupleSign || {}),
                      text1: coupleSignInput.text1,
                      text2: coupleSignInput.text2,
                      color: coupleSignInput.color
                    }
                  }));
                  setEditingWidget(null);
                }} 
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/20"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Widget Edit Modal */}
      {editingWidget === 'signature' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义个性签名</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1">签名内容</label>
              <textarea 
                value={signatureInput}
                onChange={(e) => setSignatureInput(e.target.value)}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none h-24"
                placeholder="写下你想说的话..."
                maxLength={50}
              />
              <div className="text-right text-xs text-neutral-400 mt-1">
                {signatureInput.length}/50
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <label className="block text-sm font-medium text-neutral-600 mb-1">图片设置</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setTheme(prev => ({
                              ...prev,
                              signature: {
                                ...(prev.signature || {}),
                                avatar: event.target?.result as string
                              }
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex-1 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Upload size={14} /> 更换头像
                </button>
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setTheme(prev => ({
                              ...prev,
                              signature: {
                                ...(prev.signature || {}),
                                bgImage: event.target?.result as string
                              }
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="flex-1 py-2 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-1"
                >
                  <Upload size={14} /> 更换背景
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setUserProfile(prev => ({
                    ...prev,
                    signature: signatureInput.trim()
                  }));
                  setEditingWidget(null);
                }}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/30"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Memo Widget Edit Modal */}
      {editingWidget === 'memo' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义备忘录</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">内容</label>
              <textarea 
                value={memoInput.content}
                onChange={(e) => setMemoInput(prev => ({ ...prev, content: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-h-[120px] resize-none"
                placeholder="写下你想记住的事情..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-2">主题颜色</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={memoInput.color?.startsWith('#') ? memoInput.color : ({ yellow: '#facc15', blue: '#60a5fa', green: '#4ade80', pink: '#f472b6', purple: '#c084fc' }[memoInput.color || 'yellow'] || '#facc15')}
                  onChange={(e) => setMemoInput(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-sm text-neutral-500">点击选择自定义颜色</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setTheme(prev => ({
                    ...prev,
                    memo: {
                      content: memoInput.content,
                      color: memoInput.color
                    }
                  }));
                  setEditingWidget(null);
                }}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/30"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Player Widget Edit Modal */}
      {editingWidget === 'music-player' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义随身听</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">标题</label>
              <input 
                type="text"
                value={musicPlayerInput.title}
                onChange={(e) => setMusicPlayerInput(prev => ({ ...prev, title: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="想变成你的随身听..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">左侧头像</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={musicPlayerInput.avatar1}
                  onChange={(e) => setMusicPlayerInput(prev => ({ ...prev, avatar1: e.target.value }))}
                  className="flex-1 border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  placeholder="头像 URL..."
                />
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setMusicPlayerInput(prev => ({ ...prev, avatar1: event.target?.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="px-4 bg-neutral-100 text-neutral-700 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
                  title="本地上传"
                >
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1">右侧头像</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={musicPlayerInput.avatar2}
                  onChange={(e) => setMusicPlayerInput(prev => ({ ...prev, avatar2: e.target.value }))}
                  className="flex-1 border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  placeholder="头像 URL..."
                />
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setMusicPlayerInput(prev => ({ ...prev, avatar2: event.target?.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="px-4 bg-neutral-100 text-neutral-700 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
                  title="本地上传"
                >
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setTheme(prev => ({
                    ...prev,
                    musicPlayer: {
                      ...prev.musicPlayer,
                      title: musicPlayerInput.title,
                      avatar1: musicPlayerInput.avatar1,
                      avatar2: musicPlayerInput.avatar2
                    }
                  }));
                  setEditingWidget(null);
                }} 
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/20"
              >
                保存修改
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingWidget(null)} 
                  className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    setEditingWidget(null);
                    onNavigate('music');
                  }} 
                  className="flex-1 py-3 bg-pink-50 text-pink-500 font-medium rounded-xl active:scale-95 transition-transform border border-pink-100"
                >
                  进入播放器
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card Widget Edit Modal */}
      {editingWidget === 'profile-card' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义名片</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">名字</label>
              <input 
                type="text"
                value={profileCardInput.name}
                onChange={(e) => setProfileCardInput(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="小兔叽萌"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">签名</label>
              <input 
                type="text"
                value={profileCardInput.signature}
                onChange={(e) => setProfileCardInput(prev => ({ ...prev, signature: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="天生我萌必有用..."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">日期</label>
              <input 
                type="text"
                value={profileCardInput.date}
                onChange={(e) => setProfileCardInput(prev => ({ ...prev, date: e.target.value }))}
                className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                placeholder="02-27"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-600 mb-1">头像</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={profileCardInput.avatar}
                  onChange={(e) => setProfileCardInput(prev => ({ ...prev, avatar: e.target.value }))}
                  className="flex-1 border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  placeholder="头像 URL..."
                />
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setProfileCardInput(prev => ({ ...prev, avatar: event.target?.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="px-4 bg-neutral-100 text-neutral-700 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
                  title="本地上传"
                >
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1">背景图</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={profileCardInput.bgImage}
                  onChange={(e) => setProfileCardInput(prev => ({ ...prev, bgImage: e.target.value }))}
                  className="flex-1 border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  placeholder="背景图 URL..."
                />
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setProfileCardInput(prev => ({ ...prev, bgImage: event.target?.result as string }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="px-4 bg-neutral-100 text-neutral-700 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
                  title="本地上传"
                >
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setTheme(prev => ({
                    ...prev,
                    profileCard: {
                      name: profileCardInput.name,
                      signature: profileCardInput.signature,
                      avatar: profileCardInput.avatar,
                      bgImage: profileCardInput.bgImage,
                      date: profileCardInput.date
                    }
                  }));
                  setEditingWidget(null);
                }}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/30"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Love Widget Edit Modal */}
      {editingWidget === 'love-widget' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义恋爱组件</h3>
            
            {['name1', 'name2', 'bottomMessage', 'startDate'].map((field) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-neutral-600 mb-1">{field === 'name1' ? '名字1' : field === 'name2' ? '名字2' : field === 'startDate' ? '开始日期' : '底部消息'}</label>
                <input 
                  type={field === 'startDate' ? 'date' : 'text'}
                  value={loveWidgetInput[field as keyof typeof loveWidgetInput]}
                  onChange={(e) => setLoveWidgetInput(prev => ({ ...prev, [field]: e.target.value }))}
                  className="w-full border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
            ))}

            {['avatar1', 'avatar2', 'bgImage'].map((field) => (
              <div key={field} className="mb-4">
                <label className="block text-sm font-medium text-neutral-600 mb-1">{field === 'avatar1' ? '头像1' : field === 'avatar2' ? '头像2' : '背景图'}</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={loveWidgetInput[field as keyof typeof loveWidgetInput]}
                    onChange={(e) => setLoveWidgetInput(prev => ({ ...prev, [field]: e.target.value }))}
                    className="flex-1 border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  />
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setLoveWidgetInput(prev => ({ ...prev, [field]: event.target?.result as string }));
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="px-4 bg-neutral-100 text-neutral-700 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
                    title="本地上传"
                  >
                    <Upload size={18} />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setTheme(prev => ({
                    ...prev,
                    loveWidget: loveWidgetInput
                  }));
                  setEditingWidget(null);
                }}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/30"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Status Widget Edit Modal */}
      {editingWidget === 'dynamic-status' && (
        <div className="absolute inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={() => setEditingWidget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-neutral-800">自定义状态背景</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 mb-1">背景图片</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={dynamicStatusBgInput}
                  onChange={(e) => setDynamicStatusBgInput(e.target.value)}
                  className="flex-1 border border-neutral-300 rounded-xl p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  placeholder="图片 URL..."
                />
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setDynamicStatusBgInput(event.target?.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  className="px-4 bg-neutral-100 text-neutral-700 rounded-xl active:scale-95 transition-transform flex items-center justify-center"
                  title="本地上传"
                >
                  <Upload size={18} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setEditingWidget(null)} 
                className="flex-1 py-3 bg-neutral-100 text-neutral-700 font-medium rounded-xl active:scale-95 transition-transform"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  setTheme(prev => ({
                    ...prev,
                    dynamicStatusBg: dynamicStatusBgInput
                  }));
                  setEditingWidget(null);
                }}
                className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl active:scale-95 transition-transform shadow-md shadow-blue-500/30"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={iconInputRef}
        onChange={handleIconUpload}
      />
    </div>
  );
}
