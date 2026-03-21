import React, { useRef } from 'react';
import { ChevronLeft, Image as ImageIcon, Type, Palette, Lock, Grid, CloudSun, MessageCircle, Download, Upload, Music, MessageSquare } from 'lucide-react';
import { repairJson } from '../utils';
import { ThemeSettings } from '../types';
import localforage from 'localforage';

interface Props {
  theme: ThemeSettings;
  onSave: (theme: ThemeSettings) => void;
  onBack: () => void;
  onExport?: () => void;
  onImport?: (data: string) => void;
}

const DEFAULT_SOUNDS = [
  { name: '默认', url: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
  { name: '清脆', url: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' },
  { name: '水滴', url: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3' },
  { name: '鸟鸣', url: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3' },
];

const DEFAULT_THEME: ThemeSettings = {
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
};

export function ThemeSettingsScreen({ theme: initialTheme, onSave, onBack, onExport, onImport }: Props) {
  const [theme, setThemeState] = React.useState<ThemeSettings>(initialTheme);
  const [isReadingFile, setIsReadingFile] = React.useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const lockWallpaperInputRef = useRef<HTMLInputElement>(null);
  const momentsBgInputRef = useRef<HTMLInputElement>(null);
  const chatBgInputRef = useRef<HTMLInputElement>(null);
  const chatBubbleUserInputRef = useRef<HTMLInputElement>(null);
  const chatBubbleAiInputRef = useRef<HTMLInputElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const widgetTopRightInputRef = useRef<HTMLInputElement>(null);
  const widgetBottomLeftInputRef = useRef<HTMLInputElement>(null);
  const weatherWidgetBgInputRef = useRef<HTMLInputElement>(null);
  const importThemeInputRef = useRef<HTMLInputElement>(null);
  const notificationSoundInputRef = useRef<HTMLInputElement>(null);
  const [activeIconId, setActiveIconId] = React.useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = React.useState(false);
  const [jsonCode, setJsonCode] = React.useState(JSON.stringify(initialTheme, null, 2));
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = React.useState(false);

  React.useEffect(() => {
    if (!showCodeEditor) {
      setJsonCode(JSON.stringify(theme, null, 2));
    }
  }, [theme, showCodeEditor]);

  const hasChanges = JSON.stringify(theme) !== JSON.stringify(initialTheme);

  const handleBack = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleSave = () => {
    onSave(theme);
    onBack();
  };

  const handleExportTheme = () => {
    try {
      const jsonStr = JSON.stringify(theme);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", "my_theme.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败，主题数据可能过大");
    }
  };

  const handleImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsReadingFile(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          let importedTheme;
          try {
            importedTheme = JSON.parse(jsonString);
          } catch (e) {
            console.warn("Theme JSON parse failed, attempting repair...", e);
            try {
              const repaired = repairJson(jsonString);
              importedTheme = JSON.parse(repaired);
              alert('警告：主题文件似乎已损坏，系统已尝试修复并导入。');
            } catch (repairError) {
              throw e;
            }
          }
          setThemeState({ ...theme, ...importedTheme });
          alert('主题导入成功！请记得点击保存。');
        } catch (error) {
          console.error("Import failed:", error);
          alert('主题导入失败，文件格式不正确。');
        } finally {
          setIsReadingFile(false);
          // Reset input value to allow importing the same file again
          if (e.target) {
            e.target.value = '';
          }
        }
      };
      reader.onerror = () => {
        setIsReadingFile(false);
        alert('读取文件失败');
      };
      reader.readAsText(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          callback(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          callback(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFontChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = URL.createObjectURL(file);
        setThemeState({ ...theme, fontUrl: url });
        await localforage.setItem('themeFontBlob', file);
      } catch (error) {
        console.error("Failed to save font", error);
        alert("保存字体失败");
      }
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThemeState({ ...theme, iconBgColor: e.target.value });
  };

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      setThemeState(parsed);
      setJsonError(null);
      alert('代码已应用！请记得点击保存。');
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  return (
    <div 
      className={`w-full h-full bg-neutral-50 flex flex-col`}
      style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
    >
      {isReadingFile && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex flex-col items-center justify-center text-white">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">正在读取文件...</p>
        </div>
      )}
      <div className="h-12 flex items-center justify-between px-2 bg-white border-b border-neutral-200 shrink-0">
        <button onClick={handleBack} className="text-blue-500 p-2 active:opacity-70 flex items-center">
          <ChevronLeft size={24} />
          <span className="text-[15px] -ml-1">桌面</span>
        </button>
        <h1 className="font-semibold text-neutral-900 text-[15px]">主题设置</h1>
        <button onClick={handleSave} className="text-blue-500 font-semibold text-[15px] active:opacity-70 px-4">
          保存
        </button>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-[280px] bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/50">
            <div className="p-5 text-center">
              <h3 className="text-[17px] font-semibold text-neutral-900">保存更改？</h3>
              <p className="text-[13px] text-neutral-600 mt-1">您有未保存的修改，是否在离开前保存？</p>
            </div>
            <div className="flex border-t border-neutral-200">
              <button 
                onClick={() => onBack()}
                className="flex-1 py-3 text-[17px] text-red-500 font-medium active:bg-neutral-100 transition-colors border-r border-neutral-200"
              >
                不保存
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 text-[17px] text-blue-500 font-semibold active:bg-neutral-100 transition-colors"
              >
                保存
              </button>
            </div>
            <button 
              onClick={() => setShowExitConfirm(false)}
              className="w-full py-3 text-[15px] text-neutral-500 border-t border-neutral-200 active:bg-neutral-100 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div 
        className="flex-1 p-4 overflow-y-auto space-y-6"
        style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
      >
        
        {/* Wallpapers */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 min-w-0">
            <label className="text-[11px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-1.5">
              <Lock size={12} /> 锁屏壁纸
            </label>
            <div 
              className="w-full aspect-[9/16] bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
              onClick={() => lockWallpaperInputRef.current?.click()}
            >
              {theme.lockScreenWallpaper ? (
                <img src={theme.lockScreenWallpaper} alt="Lock Wallpaper" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>锁屏壁纸</span>
              )}
            </div>
            <input 
              type="file" accept="image/*" className="hidden" ref={lockWallpaperInputRef}
              onChange={(e) => handleImageUpload(e, (url) => setThemeState(prev => ({ ...prev, lockScreenWallpaper: url })))}
            />
          </div>

          <div className="space-y-3 min-w-0">
            <label className="text-[11px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-1.5">
              <Lock size={12} /> 指纹样式
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['default', 'square', 'neon', 'minimal', 'glass', 'star', 'heart', 'diamond', 'cyberpunk', 'liquid', 'luxury', 'biometric'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => setThemeState(prev => ({ ...prev, fingerprintStyle: style }))}
                  className={`py-2 rounded-lg text-[10px] font-medium border transition-all ${
                    (theme.fingerprintStyle || 'default') === style 
                      ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm' 
                      : 'bg-white border-neutral-200 text-neutral-600 active:bg-neutral-50'
                  }`}
                >
                  {style === 'default' ? '经典圆形' : 
                   style === 'square' ? '现代方圆' : 
                   style === 'neon' ? '霓虹光晕' : 
                   style === 'minimal' ? '极简无边' : 
                   style === 'glass' ? '毛玻璃质感' :
                   style === 'star' ? '五角星形' :
                   style === 'heart' ? '爱心形状' : 
                   style === 'diamond' ? '菱形结构' :
                   style === 'cyberpunk' ? '赛博蜂巢' :
                   style === 'liquid' ? '流体生物' :
                   style === 'luxury' ? '奢华金边' :
                   style === 'biometric' ? '精密扫描' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <label className="text-[11px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-1.5">
              <ImageIcon size={12} /> 桌面壁纸
            </label>
            <div 
              className="w-full aspect-[9/16] bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
              onClick={() => wallpaperInputRef.current?.click()}
            >
              {theme.wallpaper ? (
                <img src={theme.wallpaper} alt="Wallpaper Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>桌面壁纸</span>
              )}
            </div>
            <input 
              type="file" accept="image/*" className="hidden" ref={wallpaperInputRef}
              onChange={(e) => handleImageUpload(e, (url) => setThemeState(prev => ({ ...prev, wallpaper: url })))}
            />
          </div>

          {/* Moments Background */}
          <div className="space-y-3 col-span-2">
            <label className="text-[11px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-1.5">
              <ImageIcon size={12} /> 朋友圈背景图
            </label>
            <div 
              className="w-full h-32 bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
              onClick={() => momentsBgInputRef.current?.click()}
            >
              {theme.momentsBg ? (
                <img src={theme.momentsBg} alt="Moments Background" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>朋友圈背景</span>
              )}
            </div>
            <input 
              type="file" accept="image/*" className="hidden" ref={momentsBgInputRef}
              onChange={(e) => handleImageUpload(e, (url) => setThemeState(prev => ({ ...prev, momentsBg: url })))}
            />
          </div>

          {/* Chat Background */}
          <div className="space-y-3 col-span-2 border-t border-neutral-200 pt-4 mt-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon size={12} /> 聊天背景图
              </label>
              {theme.chatBg && (
                <button 
                  onClick={() => setThemeState(prev => ({ ...prev, chatBg: undefined }))}
                  className="text-[10px] text-red-500 font-medium active:opacity-70"
                >
                  恢复默认
                </button>
              )}
            </div>
            <div 
              className="w-full h-32 bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
              onClick={() => chatBgInputRef.current?.click()}
            >
              {theme.chatBg ? (
                <img src={theme.chatBg} alt="Chat Background" className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>聊天背景 (默认纯色)</span>
              )}
            </div>
            <input 
              type="file" accept="image/*" className="hidden" ref={chatBgInputRef}
              onChange={(e) => handleImageUpload(e, (url) => setThemeState(prev => ({ ...prev, chatBg: url })))}
            />
          </div>

          {/* Chat Bubbles */}
          <div className="grid grid-cols-2 gap-4 col-span-2 border-t border-neutral-200 pt-4 mt-2">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageCircle size={12} /> 我的气泡背景图
                </label>
                {theme.chatBubbleUser && (
                  <button 
                    onClick={() => setThemeState(prev => ({ ...prev, chatBubbleUser: undefined }))}
                    className="text-[10px] text-red-500 font-medium active:opacity-70"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <div 
                className="w-full h-24 bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
                onClick={() => chatBubbleUserInputRef.current?.click()}
              >
                {theme.chatBubbleUser ? (
                  <img src={theme.chatBubbleUser} alt="User Bubble" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>我的气泡</span>
                )}
              </div>
              <input 
                type="file" accept="image/*" className="hidden" ref={chatBubbleUserInputRef}
                onChange={(e) => handleImageUpload(e, (url) => setThemeState({ ...theme, chatBubbleUser: url }))}
              />
              <div className="flex items-center justify-between px-1 mt-2">
                <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                  我的气泡 CSS
                </label>
                {theme.chatBubbleUserCss && (
                  <button 
                    onClick={() => setThemeState(prev => ({ ...prev, chatBubbleUserCss: undefined }))}
                    className="text-[10px] text-red-500 font-medium active:opacity-70"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <textarea
                value={theme.chatBubbleUserCss || ''}
                onChange={(e) => setThemeState({ ...theme, chatBubbleUserCss: e.target.value })}
                placeholder="例如: border-radius: 20px 0 20px 20px;"
                className="w-full h-20 p-2 text-xs border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageCircle size={12} /> 对方气泡背景图
                </label>
                {theme.chatBubbleAi && (
                  <button 
                    onClick={() => setThemeState(prev => ({ ...prev, chatBubbleAi: undefined }))}
                    className="text-[10px] text-red-500 font-medium active:opacity-70"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <div 
                className="w-full h-24 bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
                onClick={() => chatBubbleAiInputRef.current?.click()}
              >
                {theme.chatBubbleAi ? (
                  <img src={theme.chatBubbleAi} alt="AI Bubble" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>对方气泡</span>
                )}
              </div>
              <input 
                type="file" accept="image/*" className="hidden" ref={chatBubbleAiInputRef}
                onChange={(e) => handleImageUpload(e, (url) => setThemeState({ ...theme, chatBubbleAi: url }))}
              />
              <div className="flex items-center justify-between px-1 mt-2">
                <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
                  对方气泡 CSS
                </label>
                {theme.chatBubbleAiCss && (
                  <button 
                    onClick={() => setThemeState(prev => ({ ...prev, chatBubbleAiCss: undefined }))}
                    className="text-[10px] text-red-500 font-medium active:opacity-70"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <textarea
                value={theme.chatBubbleAiCss || ''}
                onChange={(e) => setThemeState({ ...theme, chatBubbleAiCss: e.target.value })}
                placeholder="例如: border-radius: 0 20px 20px 20px;"
                className="w-full h-20 p-2 text-xs border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Desktop Widgets */}
          <div className="space-y-3 col-span-2 border-t border-neutral-200 pt-4 mt-2">
            <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
              <Grid size={14} /> 桌面相框小组件
            </label>
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 ml-1">自定义相框图片</span>
              <div 
                className="w-full aspect-[2/1] bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
                onClick={() => widgetBottomLeftInputRef.current?.click()}
              >
                {theme.widgetImages?.bottomLeft ? (
                  <img src={theme.widgetImages.bottomLeft} alt="Desktop Widget" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>图片</span>
                )}
              </div>
              <input 
                type="file" accept="image/*" className="hidden" ref={widgetBottomLeftInputRef}
                onChange={(e) => handleImageUpload(e, (url) => setThemeState({ 
                  ...theme, 
                  widgetImages: { ...theme.widgetImages, bottomLeft: url } 
                }))}
              />
            </div>
          </div>

          {/* Weather Widget Settings */}
          <div className="space-y-3 col-span-2 border-t border-neutral-200 pt-4 mt-2">
            <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
              <CloudSun size={14} /> 天气小组件设置
            </label>
            
            {/* Weather Location */}
            <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[15px] text-neutral-700 whitespace-nowrap">城市位置</span>
                <input 
                  type="text" 
                  value={theme.weatherLocation || ''}
                  placeholder="例如：杭州、成都 (留空自动定位)"
                  onChange={(e) => setThemeState({ ...theme, weatherLocation: e.target.value })}
                  className="flex-1 text-right bg-transparent border-none outline-none text-neutral-900 placeholder-neutral-400 text-[15px]"
                />
              </div>
            </div>

            {/* Weather Background */}
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 ml-1">自定义背景图片</span>
              <div 
                className="w-full h-32 bg-white border border-neutral-200 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm"
                onClick={() => weatherWidgetBgInputRef.current?.click()}
              >
                {theme.weatherWidgetBg ? (
                  <img src={theme.weatherWidgetBg} alt="Weather Widget Background" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-neutral-400 text-xs text-center px-2">点击选择<br/>天气背景图片</span>
                )}
              </div>
              <input 
                type="file" accept="image/*" className="hidden" ref={weatherWidgetBgInputRef}
                onChange={(e) => handleImageUpload(e, (url) => setThemeState({ ...theme, weatherWidgetBg: url }))}
              />
            </div>
          </div>
        </div>

        {/* Icon Background Color */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Palette size={14} /> 默认图标背景色
          </label>
          <div className="w-full bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <span className="text-[15px] text-neutral-700">颜色</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-400 font-mono uppercase">{theme.iconBgColor}</span>
              <input 
                type="color" 
                value={theme.iconBgColor}
                onChange={handleColorChange}
                className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
              />
            </div>
          </div>
        </div>

        {/* Inner Voice Styling */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare size={14} /> 心声样式
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 ml-1">背景色</span>
              <div className="w-full bg-white border border-neutral-200 rounded-xl p-2 flex items-center justify-between shadow-sm">
                <input 
                  type="color" 
                  value={theme.innerVoiceBgColor || '#f5f5f5'}
                  onChange={(e) => setThemeState({ ...theme, innerVoiceBgColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 ml-1">文字颜色</span>
              <div className="w-full bg-white border border-neutral-200 rounded-xl p-2 flex items-center justify-between shadow-sm">
                <input 
                  type="color" 
                  value={theme.innerVoiceTextColor || '#666666'}
                  onChange={(e) => setThemeState({ ...theme, innerVoiceTextColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-neutral-400">自定义 CSS</span>
              {theme.innerVoiceCss && (
                <button 
                  onClick={() => setThemeState(prev => ({ ...prev, innerVoiceCss: undefined }))}
                  className="text-[10px] text-red-500 font-medium active:opacity-70"
                >
                  恢复默认
                </button>
              )}
            </div>
            <textarea
              value={theme.innerVoiceCss || ''}
              onChange={(e) => setThemeState({ ...theme, innerVoiceCss: e.target.value })}
              placeholder=".custom-inner-voice { font-style: italic; ... }"
              className="w-full h-24 bg-white border border-neutral-200 rounded-xl p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Font */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Type size={14} /> 自定义字体
          </label>
          <button 
            onClick={() => fontInputRef.current?.click()}
            className="w-full bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between shadow-sm active:bg-neutral-50"
          >
            <span className="text-[15px] text-neutral-700">选择字体文件 (.ttf, .woff)</span>
            <span className="text-blue-500 text-sm font-medium">浏览</span>
          </button>
          <input 
            type="file" 
            accept=".ttf,.otf,.woff,.woff2" 
            className="hidden" 
            ref={fontInputRef}
            onChange={handleFontChange}
          />
          {theme.fontUrl && (
            <p className="text-xs text-green-600 ml-1">✓ 已加载自定义字体</p>
          )}
        </div>

        {/* Notification Sound */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Music size={14} /> 消息提示音
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {DEFAULT_SOUNDS.map((sound, i) => (
              <button
                key={i}
                onClick={() => {
                  setThemeState({ ...theme, notificationSound: sound.url });
                  const audio = new Audio(sound.url);
                  audio.play();
                }}
                className={`py-2 rounded-lg text-xs font-medium border transition-colors ${theme.notificationSound === sound.url ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-neutral-200 text-neutral-600'}`}
              >
                {sound.name}
              </button>
            ))}
          </div>
          <button 
            onClick={() => notificationSoundInputRef.current?.click()}
            className="w-full bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between shadow-sm active:bg-neutral-50"
          >
            <span className="text-[15px] text-neutral-700">
              {theme.notificationSound ? '已设置自定义提示音' : '选择提示音文件 (.mp3, .wav)'}
            </span>
            <span className="text-blue-500 text-sm font-medium">浏览</span>
          </button>
          <input 
            type="file" 
            accept="audio/*" 
            className="hidden" 
            ref={notificationSoundInputRef}
            onChange={(e) => handleAudioUpload(e, (url) => setThemeState({ ...theme, notificationSound: url }))}
          />
          {theme.notificationSound && (
            <div className="flex items-center gap-2 ml-1">
              <p className="text-xs text-green-600">✓ 已加载自定义提示音</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const audio = new Audio(theme.notificationSound);
                  audio.play();
                }}
                className="text-xs text-blue-500 underline"
              >
                试听
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setThemeState({ ...theme, notificationSound: undefined });
                }}
                className="text-xs text-red-500 underline ml-2"
              >
                清除
              </button>
            </div>
          )}
        </div>

        {/* Time and Status Color */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Palette size={14} /> 桌面时间与状态栏颜色
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-3 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-neutral-700">桌面时间颜色</span>
              <input 
                type="color" 
                value={theme.timeColor || '#ffffff'}
                onChange={(e) => setThemeState({ ...theme, timeColor: e.target.value })}
                className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
              />
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-[15px] text-neutral-700">状态栏颜色</span>
              <input 
                type="color" 
                value={theme.statusColor || '#ffffff'}
                onChange={(e) => setThemeState({ ...theme, statusColor: e.target.value })}
                className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
              />
            </div>
          </div>
        </div>

        {/* Chat Bubble Colors */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <MessageCircle size={14} /> 聊天气泡颜色
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-3 space-y-3 shadow-sm">
            {/* User Bubble */}
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-neutral-700">我方气泡颜色</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-mono uppercase">{theme.userBubbleColor || '#95ec69'}</span>
                <input 
                  type="color" 
                  value={theme.userBubbleColor || '#95ec69'}
                  onChange={(e) => setThemeState({ ...theme, userBubbleColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-[15px] text-neutral-700">我方文字颜色</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-mono uppercase">{theme.userTextColor || '#000000'}</span>
                <input 
                  type="color" 
                  value={theme.userTextColor || '#000000'}
                  onChange={(e) => setThemeState({ ...theme, userTextColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>

            {/* AI Bubble */}
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-[15px] text-neutral-700">对方气泡颜色</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-mono uppercase">{theme.aiBubbleColor || '#ffffff'}</span>
                <input 
                  type="color" 
                  value={theme.aiBubbleColor || '#ffffff'}
                  onChange={(e) => setThemeState({ ...theme, aiBubbleColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
              <span className="text-[15px] text-neutral-700">对方文字颜色</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-mono uppercase">{theme.aiTextColor || '#000000'}</span>
                <input 
                  type="color" 
                  value={theme.aiTextColor || '#000000'}
                  onChange={(e) => setThemeState({ ...theme, aiTextColor: e.target.value })}
                  className="w-8 h-8 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Grid size={14} /> 显示设置
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-neutral-700">显示状态栏</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={theme.showStatusBar !== false}
                  onChange={(e) => setThemeState({ ...theme, showStatusBar: e.target.checked })}
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <span className="text-[15px] text-neutral-700">沉浸模式 (铺满全屏)</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={theme.immersiveMode || false}
                  onChange={(e) => setThemeState({ ...theme, immersiveMode: e.target.checked })}
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <span className="text-[15px] text-neutral-700">全屏模式</span>
              <button 
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().then(() => {
                      // Automatically enable immersive mode and save immediately for live preview
                      const newTheme = { ...theme, immersiveMode: true };
                      setThemeState(newTheme);
                      onSave(newTheme);
                    }).catch(e => {
                      alert(`全屏失败: ${e.message}`);
                    });
                  } else {
                    if (document.exitFullscreen) {
                      document.exitFullscreen();
                    }
                  }
                }}
                className="px-4 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium active:bg-neutral-200"
              >
                切换全屏
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 px-1">
              * 开启全屏会自动进入沉浸模式，移除手机边框。
            </p>
          </div>
        </div>

        {/* Global Custom CSS */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Palette size={14} /> 全局自定义 CSS
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-2">
            <textarea
              value={theme.globalCss || ''}
              onChange={(e) => setThemeState({ ...theme, globalCss: e.target.value })}
              placeholder="例如: .app-icon { border-radius: 50%; } body { filter: grayscale(0.2); }"
              className="w-full h-32 p-3 text-xs font-mono border border-neutral-200 rounded-xl resize-none focus:outline-none focus:border-blue-500 bg-neutral-50"
            />
            <p className="text-[10px] text-neutral-400">
              * 此 CSS 将直接注入应用全局样式，可用于深度美化。
            </p>
          </div>
        </div>

        {/* Advanced Code Editor */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            <Download size={14} /> 高级代码自定义 (JSON)
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-1 shadow-sm overflow-hidden">
            <button 
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              className="w-full flex items-center justify-between p-3 active:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                  <Type size={18} />
                </div>
                <span className="text-[15px] text-neutral-700">{showCodeEditor ? '隐藏代码编辑器' : '打开代码编辑器'}</span>
              </div>
              <span className="text-neutral-400 text-xs">{showCodeEditor ? '收起' : '展开'}</span>
            </button>
            
            {showCodeEditor && (
              <div className="p-3 border-t border-neutral-100 space-y-3">
                <div className="relative">
                  <textarea
                    value={jsonCode}
                    onChange={(e) => {
                      setJsonCode(e.target.value);
                      setJsonError(null);
                    }}
                    spellCheck={false}
                    className={`w-full h-64 p-3 text-xs font-mono border ${jsonError ? 'border-red-500' : 'border-neutral-200'} rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-neutral-900 text-green-400`}
                  />
                  {jsonError && (
                    <div className="absolute bottom-2 left-2 right-2 p-2 bg-red-500/90 text-white text-[10px] rounded-lg">
                      格式错误: {jsonError}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleApplyJson}
                    className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium active:bg-blue-600 transition-colors"
                  >
                    应用代码
                  </button>
                  <button 
                    onClick={() => setJsonCode(JSON.stringify(theme, null, 2))}
                    className="px-4 py-2 bg-neutral-100 text-neutral-600 rounded-lg text-sm font-medium active:bg-neutral-200"
                  >
                    重置
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400">
                  * 直接编辑 JSON 配置。请确保格式正确，否则可能导致应用异常。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Theme Management */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            主题管理
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-1 shadow-sm overflow-hidden">
            <button 
              onClick={handleExportTheme}
              className="w-full flex items-center justify-between p-3 active:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                  <Download size={18} />
                </div>
                <span className="text-[15px] text-neutral-700">导出主题</span>
              </div>
              <span className="text-neutral-400 text-xs">JSON</span>
            </button>
            <div className="h-[1px] bg-neutral-100 mx-3"></div>
            <label className="w-full flex items-center justify-between p-3 active:bg-neutral-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                  <Upload size={18} />
                </div>
                <span className="text-[15px] text-neutral-700">导入主题</span>
              </div>
              <span className="text-neutral-400 text-xs">JSON</span>
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                ref={importThemeInputRef}
                onChange={handleImportTheme}
              />
            </label>
            <div className="h-[1px] bg-neutral-100 mx-3"></div>
            <button 
              onClick={() => {
                if (window.confirm('确定要恢复出厂设置吗？所有主题自定义项都将被重置。')) {
                  setThemeState(DEFAULT_THEME);
                }
              }}
              className="w-full flex items-center justify-between p-3 active:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                  <Palette size={18} />
                </div>
                <span className="text-[15px] text-neutral-700 font-medium">恢复出厂设置</span>
              </div>
              <span className="text-neutral-400 text-xs text-red-400">重置</span>
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="space-y-3">
          <label className="text-[13px] font-medium text-neutral-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            数据管理
          </label>
          <div className="bg-white border border-neutral-200 rounded-xl p-1 shadow-sm overflow-hidden">
            <button 
              onClick={onExport}
              className="w-full flex items-center justify-between p-3 active:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                  <Download size={18} />
                </div>
                <span className="text-[15px] text-neutral-700">导出数据 (备份)</span>
              </div>
              <span className="text-neutral-400 text-xs">JSON</span>
            </button>
            <div className="h-[1px] bg-neutral-100 mx-3"></div>
            <label className="w-full flex items-center justify-between p-3 active:bg-neutral-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                  <Upload size={18} />
                </div>
                <span className="text-[15px] text-neutral-700">导入数据 (还原)</span>
              </div>
              <input 
                type="file" 
                accept=".json,application/json" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsReadingFile(true);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result && onImport) {
                        onImport(event.target.result as string);
                      }
                      setIsReadingFile(false);
                      e.target.value = ''; // Reset input to allow selecting the same file again
                    };
                    reader.onerror = () => {
                      setIsReadingFile(false);
                      alert('读取文件失败');
                    };
                    reader.readAsText(file);
                  }
                }}
              />
              <span className="text-neutral-400 text-xs">JSON</span>
            </label>
          </div>
          <p className="text-[10px] text-neutral-400 px-1">
            * 导出数据将保存所有角色、聊天记录、朋友圈和小红书内容。导入数据会覆盖当前所有内容并刷新页面。
          </p>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 pt-6">
          <label className="text-[13px] font-medium text-red-500 ml-1 uppercase tracking-wide flex items-center gap-2">
            危险区域
          </label>
          <button 
            onClick={() => {
              if (confirm('确定要清除所有数据并重置应用吗？此操作不可撤销。')) {
                localforage.clear().then(() => {
                  localStorage.clear();
                  window.location.reload();
                });
              }
            }}
            className="w-full bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 flex items-center justify-center font-medium active:bg-red-100"
          >
            清除缓存并重置应用
          </button>
          <p className="text-[10px] text-neutral-400 text-center px-4">
            如果遇到白屏或保存失败，请尝试点击上方按钮重置应用。
          </p>
        </div>

      </div>
    </div>
  );
}
