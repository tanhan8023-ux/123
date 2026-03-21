import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Settings, Plus, Trash2, Image as ImageIcon, Download, Upload } from 'lucide-react';
import { ApiSettings, Persona, UserProfile, ThemeSettings } from '../types';
import { generateId } from '../utils/id';

interface Props {
  settings: ApiSettings;
  personas: Persona[];
  userProfile: UserProfile;
  onSave: (settings: ApiSettings, personas: Persona[], userProfile: UserProfile) => void;
  onBack: () => void;
  onTestPush?: () => void;
  theme: ThemeSettings;
}

export function ApiSettingsScreen({ settings, personas: initialPersonas, userProfile: initialUserProfile, onSave, onBack, onTestPush, theme }: Props) {
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);
  const [momentsApiUrl, setMomentsApiUrl] = useState(settings.momentsApiUrl || '');
  const [momentsApiKey, setMomentsApiKey] = useState(settings.momentsApiKey || '');
  const [momentsModel, setMomentsModel] = useState(settings.momentsModel || '');
  const [autoPostMoments, setAutoPostMoments] = useState(settings.autoPostMoments ?? true);
  const [autoUpdateStatus, setAutoUpdateStatus] = useState(settings.autoUpdateStatus ?? true);
  const [isAutoXhsEnabled, setIsAutoXhsEnabled] = useState(settings.isAutoXhsEnabled ?? true);
  const [isProactiveMessagingEnabled, setIsProactiveMessagingEnabled] = useState(settings.isProactiveMessagingEnabled ?? true);
  const [voiceModel, setVoiceModel] = useState(settings.voiceModel || '');
  const [voiceApiUrl, setVoiceApiUrl] = useState(settings.voiceApiUrl || '');
  const [voiceApiKey, setVoiceApiKey] = useState(settings.voiceApiKey || '');
  const [voiceParams, setVoiceParams] = useState(settings.voiceParams || '');
  const [asrModel, setAsrModel] = useState(settings.asrModel || '');
  const [asrApiUrl, setAsrApiUrl] = useState(settings.asrApiUrl || '');
  const [asrApiKey, setAsrApiKey] = useState(settings.asrApiKey || '');
  const [asrParams, setAsrParams] = useState(settings.asrParams || '');
  const [temperature, setTemperature] = useState(settings.temperature);
  const [proactiveDelay, setProactiveDelay] = useState(settings.proactiveDelay || 10);
  const [logs, setLogs] = useState<string[]>(['> System initialized...']);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const userAvatarInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const hasChanges = apiUrl !== settings.apiUrl || 
                     apiKey !== settings.apiKey || 
                     model !== settings.model || 
                     momentsApiUrl !== (settings.momentsApiUrl || '') ||
                     momentsApiKey !== (settings.momentsApiKey || '') ||
                     momentsModel !== (settings.momentsModel || '') ||
                     autoPostMoments !== (settings.autoPostMoments ?? true) ||
                     autoUpdateStatus !== (settings.autoUpdateStatus ?? true) ||
                     isAutoXhsEnabled !== (settings.isAutoXhsEnabled ?? true) ||
                     voiceModel !== (settings.voiceModel || '') ||
                     voiceApiUrl !== (settings.voiceApiUrl || '') ||
                     voiceApiKey !== (settings.voiceApiKey || '') ||
                     voiceParams !== (settings.voiceParams || '') ||
                     asrModel !== (settings.asrModel || '') ||
                     asrApiUrl !== (settings.asrApiUrl || '') ||
                     asrApiKey !== (settings.asrApiKey || '') ||
                     asrParams !== (settings.asrParams || '') ||
                     temperature !== settings.temperature || 
                     proactiveDelay !== settings.proactiveDelay ||
                     JSON.stringify(personas) !== JSON.stringify(initialPersonas) ||
                     JSON.stringify(userProfile) !== JSON.stringify(initialUserProfile);

  const handleBack = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (logs.length > 1) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    onSave({ 
      apiUrl, apiKey, model, 
      momentsApiUrl, momentsApiKey, momentsModel, autoPostMoments, autoUpdateStatus, isAutoXhsEnabled, isProactiveMessagingEnabled,
      voiceModel, voiceApiUrl, voiceApiKey, voiceParams, 
      asrModel, asrApiUrl, asrApiKey, asrParams, 
      temperature, proactiveDelay 
    }, personas, userProfile);
    setLogs(prev => [...prev, '> Settings saved successfully.']);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
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
  };

  const handleAddPersona = () => {
    const newPersona: Persona = {
      id: generateId(),
      name: `新角色 ${personas.length + 1}`,
      instructions: '你是一个新的 AI 助手。',
      prompts: []
    };
    setPersonas([...personas, newPersona]);
  };

  const handleUpdatePersona = (id: string, updates: Partial<Persona>) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeletePersona = (id: string) => {
    if (personas.length <= 1) {
      alert("至少需要保留一个角色！");
      return;
    }
    setPersonas(personas.filter(p => p.id !== id));
  };

  const handleFetchModels = async () => {
    const actualApiKey = apiKey || undefined || process.env.GEMINI_API_KEY;
    if (!actualApiKey) {
      setLogs(prev => [...prev, '> Error: 缺少 API KEY']);
      return;
    }

    setLogs(prev => [...prev, `> Fetching models...`]);
    
    try {
      let endpoint = '';
      let headers: any = { 'Content-Type': 'application/json' };
      let isGemini = false;

      if (apiUrl) {
        // OpenAI compatible endpoint
        let baseUrl = apiUrl;
        if (baseUrl.endsWith('/chat/completions')) {
          baseUrl = baseUrl.replace('/chat/completions', '');
        } else if (baseUrl.endsWith('/v1/messages')) {
          baseUrl = baseUrl.replace('/v1/messages', '');
        }
        endpoint = baseUrl.endsWith('/') ? `${baseUrl}models` : `${baseUrl}/models`;
        headers['Authorization'] = `Bearer ${actualApiKey}`;
      } else {
        // Default Gemini API
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${actualApiKey}`;
        isGemini = true;
      }

      const response = await fetch(endpoint, { method: 'GET', headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let models: string[] = [];

      if (isGemini) {
        if (data && data.models && Array.isArray(data.models)) {
          models = data.models.map((m: any) => m.name.replace('models/', ''));
        }
      } else {
        // More robust OpenAI-compatible parsing
        if (data && data.data && Array.isArray(data.data)) {
          models = data.data.map((m: any) => m.id);
        } else if (Array.isArray(data)) {
          // Some providers return a direct array of strings or objects
          models = data.map((m: any) => typeof m === 'string' ? m : (m.id || m.name));
        } else if (data && typeof data === 'object') {
          // Check for other common keys
          const possibleKeys = ['models', 'data', 'results'];
          for (const key of possibleKeys) {
            if (Array.isArray(data[key])) {
              models = data[key].map((m: any) => typeof m === 'string' ? m : (m.id || m.name || m.model));
              break;
            }
          }
        }
      }

      if (models.length > 0) {
        setFetchedModels(models);
        setLogs(prev => [...prev, `> Success: 成功拉取 ${models.length} 个模型`, `> 请在上方下拉框中选择模型`]);
        if (!models.includes(model)) {
          setModel(models[0]);
        }
      } else {
        throw new Error('未找到模型或返回格式不正确');
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `> Error: ${error.message}`]);
    }
  };

  const handleUpdatePromptArray = (personaId: string, index: number, value: string) => {
    setPersonas(personas.map(p => {
      if (p.id === personaId) {
        const prompts = [...(p.prompts || [])];
        prompts[index] = value;
        return { ...p, prompts };
      }
      return p;
    }));
  };

  const handleAddPrompt = (personaId: string) => {
    setPersonas(personas.map(p => {
      if (p.id === personaId) {
        const prompts = [...(p.prompts || [])];
        prompts.push('');
        return { ...p, prompts };
      }
      return p;
    }));
  };

  const handleRemovePrompt = (personaId: string, index: number) => {
    setPersonas(personas.map(p => {
      if (p.id === personaId) {
        const prompts = [...(p.prompts || [])];
        prompts.splice(index, 1);
        return { ...p, prompts };
      }
      return p;
    }));
  };

  const handleExportPersonas = () => {
    const dataStr = JSON.stringify(personas, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `personas_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    setLogs(prev => [...prev, '> Personas exported successfully.']);
  };

  const handleImportPersonas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedPersonas = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedPersonas)) {
          setPersonas(importedPersonas);
          setLogs(prev => [...prev, '> Personas imported successfully.']);
        } else {
          setLogs(prev => [...prev, '> Invalid personas file format.']);
        }
      } catch (err) {
        setLogs(prev => [...prev, '> Error parsing personas file.']);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      className={`w-full h-full bg-neutral-50 flex flex-col`}
      style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
    >
      <div className="h-12 flex items-center justify-between px-2 bg-white border-b border-neutral-200 shrink-0">
        <button onClick={handleBack} className="text-blue-500 p-2 active:opacity-70 flex items-center">
          <ChevronLeft size={24} />
          <span className="text-[15px] -ml-1">桌面</span>
        </button>
        <h1 className="font-semibold text-neutral-900 text-[15px]">接口与人设</h1>
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

      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          设置已保存
        </div>
      )}

      <div 
        className="flex-1 p-4 overflow-y-auto" 
        ref={scrollContainerRef}
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {/* User Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 space-y-4 mb-4">
          <h2 className="text-[14px] font-semibold text-neutral-800 border-b border-neutral-100 pb-2">我的设定</h2>
          
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center cursor-pointer overflow-hidden relative shadow-sm shrink-0"
              onClick={() => userAvatarInputRef.current?.click()}
            >
              {userProfile.avatarUrl ? (
                <img src={userProfile.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={24} className="text-neutral-400" />
              )}
            </div>
            <input 
              type="file" accept="image/*" className="hidden" ref={userAvatarInputRef}
              onChange={(e) => handleImageUpload(e, (url) => setUserProfile({ ...userProfile, avatarUrl: url }))}
            />
            <div className="flex-1 space-y-1 min-w-0">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">我的名字</label>
              <input 
                type="text" 
                value={userProfile.name}
                onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">拍一拍后缀 (别人拍你时显示)</label>
            <input 
              type="text" 
              placeholder="例如：肩膀"
              value={userProfile.patSuffix || ''}
              onChange={(e) => setUserProfile({ ...userProfile, patSuffix: e.target.value })}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">纪念日 (相恋日期)</label>
            <input 
              type="date" 
              value={userProfile.anniversaryDate || ''}
              onChange={(e) => setUserProfile({ ...userProfile, anniversaryDate: e.target.value })}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">我的人设 (My Persona)</label>
            <textarea 
              placeholder="例如：我是一个喜欢打游戏的大学生..."
              value={userProfile.persona || ''}
              onChange={(e) => setUserProfile({ ...userProfile, persona: e.target.value })}
              className="w-full h-40 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900 leading-relaxed"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 space-y-6">
          
          <div className="flex items-center gap-2 text-neutral-700">
            <Settings size={20} className="text-blue-400" />
            <h2 className="font-semibold text-[15px]">文字 API 设置</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">API URL</label>
            <input 
              type="text" 
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="留空则使用默认 Gemini API"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">API KEY</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 tracking-widest"
              placeholder="留空则使用系统自带 Key"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-medium text-neutral-500 ml-1">发散度 Temperature ({temperature.toFixed(2)})</label>
            <input 
              type="range" 
              min="0" max="2" step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-neutral-400 ml-1 mt-1">
              (值越大越跳跃活泼，越小越严谨)
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-medium text-neutral-500 ml-1">主动回复延迟 ({proactiveDelay}分钟)</label>
            <input 
              type="range" 
              min="1" max="120" step="1"
              value={proactiveDelay}
              onChange={(e) => setProactiveDelay(parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[10px] text-neutral-400 ml-1 mt-1">
              (聊天界面不活跃时，AI 主动发消息的等待时间)
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <label className="text-[11px] font-medium text-neutral-500 ml-1">终端日志</label>
            <div className="w-full h-32 bg-black rounded-xl p-4 overflow-y-auto font-mono text-[11px] text-green-400 leading-relaxed shadow-inner">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
              <div ref={logsEndRef} className="animate-pulse">_</div>
            </div>
          </div>

          <button 
            onClick={handleFetchModels}
            className="w-full bg-blue-500 text-white font-medium py-3 rounded-xl active:bg-blue-600 transition-colors shadow-sm shadow-blue-500/30 text-[13px]"
          >
            拉取模型清单
          </button>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">选择模型</label>
              {fetchedModels.length > 0 && (
                <button onClick={() => setFetchedModels([])} className="text-[10px] text-blue-500 active:opacity-70">手动输入</button>
              )}
            </div>
            {fetchedModels.length > 0 ? (
              <select 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 appearance-none"
              >
                {fetchedModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
                placeholder="gemini-3-flash-preview"
              />
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-neutral-700">
              <Settings size={20} className="text-purple-400" />
              <h2 className="font-semibold text-[15px]">朋友圈 API 设置</h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">朋友圈 API URL</label>
            <input 
              type="text" 
              value={momentsApiUrl}
              onChange={(e) => setMomentsApiUrl(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="留空则使用主 API"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">朋友圈 API KEY</label>
            <input 
              type="password" 
              value={momentsApiKey}
              onChange={(e) => setMomentsApiKey(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 tracking-widest"
              placeholder="留空则使用主 API KEY"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">朋友圈模型 (Model)</label>
            <input 
              type="text" 
              value={momentsModel}
              onChange={(e) => setMomentsModel(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="留空则使用主模型"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">自动发布朋友圈</label>
            <button
              onClick={() => setAutoPostMoments(!autoPostMoments)}
              className={`w-10 h-6 rounded-full transition-colors ${autoPostMoments ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${autoPostMoments ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">自动更新 AI 状态</label>
            <button
              onClick={() => setAutoUpdateStatus(!autoUpdateStatus)}
              className={`w-10 h-6 rounded-full transition-colors ${autoUpdateStatus ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${autoUpdateStatus ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">小红书 AI 自动发帖</label>
            <button
              onClick={() => setIsAutoXhsEnabled(!isAutoXhsEnabled)}
              className={`w-10 h-6 rounded-full transition-colors ${isAutoXhsEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAutoXhsEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">AI 主动发消息</label>
            <button
              onClick={() => setIsProactiveMessagingEnabled(!isProactiveMessagingEnabled)}
              className={`w-10 h-6 rounded-full transition-colors ${isProactiveMessagingEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isProactiveMessagingEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="pt-4 border-t border-neutral-100 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-neutral-800">浏览器通知权限</span>
                <span className="text-[11px] text-neutral-500">
                  {('Notification' in window) ? (
                    Notification.permission === 'granted' ? '✅ 已授权' :
                    Notification.permission === 'denied' ? '❌ 已拒绝 (请在浏览器设置中开启)' :
                    '⚠️ 未授权'
                  ) : '🚫 浏览器不支持'}
                </span>
              </div>
              {('Notification' in window) && Notification.permission === 'default' && (
                <button 
                  onClick={() => Notification.requestPermission().then(() => setLogs(prev => [...prev, `> Notification permission: ${Notification.permission}`]))}
                  className="bg-blue-500 text-white text-[12px] px-3 py-1.5 rounded-lg active:opacity-70"
                >
                  请求授权
                </button>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <p className="text-[11px] text-blue-600 leading-relaxed">
                提示：由于预览窗口限制，Edge/Chrome 可能会拦截通知。如果无法收到，请点击下方按钮在独立页面运行。
              </p>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full mt-2 bg-blue-500 text-white text-[12px] py-2 rounded-lg font-medium active:bg-blue-600"
              >
                在新标签页中打开应用
              </button>
            </div>

            <button 
              onClick={onTestPush}
              className="w-full bg-orange-500 text-white font-medium py-3 rounded-xl active:bg-orange-600 transition-colors shadow-sm shadow-orange-500/30 text-[13px]"
            >
              测试后台推送通知 (5秒后发送)
            </button>
            <p className="text-[10px] text-neutral-400 mt-2 text-center">
              点击后请立即关闭网页或切换标签页，测试是否能收到通知。
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-neutral-700">
              <Settings size={20} className="text-emerald-400" />
              <h2 className="font-semibold text-[15px]">语音/ASR API 设置</h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音模型 (Voice Model)</label>
            <input 
              type="text" 
              value={voiceModel}
              onChange={(e) => setVoiceModel(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="gemini-2.5-flash-preview-tts"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音 API URL</label>
            <input 
              type="text" 
              value={voiceApiUrl}
              onChange={(e) => setVoiceApiUrl(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="留空则使用默认"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音 API KEY</label>
            <input 
              type="password" 
              value={voiceApiKey}
              onChange={(e) => setVoiceApiKey(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 tracking-widest"
              placeholder="留空则使用系统自带"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音模型参数 (JSON)</label>
            <textarea 
              value={voiceParams}
              onChange={(e) => setVoiceParams(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 font-mono"
              placeholder='{"key": "value"}'
              rows={3}
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音识别模型 (ASR)</label>
            <input 
              type="text" 
              value={asrModel}
              onChange={(e) => setAsrModel(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="whisper-1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音识别 API URL</label>
            <input 
              type="text" 
              value={asrApiUrl}
              onChange={(e) => setAsrApiUrl(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800"
              placeholder="留空则使用默认"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音识别 API KEY</label>
            <input 
              type="password" 
              value={asrApiKey}
              onChange={(e) => setAsrApiKey(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 tracking-widest"
              placeholder="留空则使用系统自带"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider ml-1">语音识别模型参数 (JSON)</label>
            <textarea 
              value={asrParams}
              onChange={(e) => setAsrParams(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-800 font-mono"
              placeholder='{"key": "value"}'
              rows={3}
            />
          </div>


        </div>

        {/* AI Personas */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-700">
              <Settings size={20} className="text-blue-400" />
              <h2 className="font-semibold text-[15px]">AI 角色设定</h2>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-neutral-500 text-[12px] font-medium active:opacity-70 cursor-pointer">
                <Upload size={14} /> 导入
                <input type="file" accept=".json" className="hidden" onChange={handleImportPersonas} />
              </label>
              <button 
                onClick={handleExportPersonas}
                className="flex items-center gap-1 text-neutral-500 text-[12px] font-medium active:opacity-70"
              >
                <Download size={14} /> 导出
              </button>
              <button 
                onClick={handleAddPersona}
                className="flex items-center gap-1 text-blue-500 text-[13px] font-medium active:opacity-70 ml-2"
              >
                <Plus size={16} /> 添加角色
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {personas.map((persona, index) => (
              <div key={persona.id} className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-4 relative">
                <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                  <h3 className="text-[13px] font-medium text-neutral-600">角色 {index + 1}</h3>
                  <button 
                    onClick={() => handleDeletePersona(persona.id)}
                    className="text-red-400 p-1 active:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div 
                      className="w-16 h-16 bg-white rounded-xl flex items-center justify-center cursor-pointer overflow-hidden shadow-sm shrink-0 border border-neutral-200"
                    >
                      {persona.avatarUrl ? (
                        <img src={persona.avatarUrl} alt="AI Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-neutral-400" />
                      )}
                    </div>
                    <input 
                      type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => handleImageUpload(e, (url) => handleUpdatePersona(persona.id, { avatarUrl: url }))}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">TA 的名字</label>
                    <input 
                      type="text" 
                      value={persona.name}
                      onChange={(e) => handleUpdatePersona(persona.id, { name: e.target.value })}
                      className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">拍一拍后缀 (你拍TA时显示)</label>
                  <input 
                    type="text" 
                    placeholder="例如：肩膀"
                    value={persona.patSuffix || ''}
                    onChange={(e) => handleUpdatePersona(persona.id, { patSuffix: e.target.value })}
                    className="w-full bg-white border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">角色人设 (Persona Background)</label>
                  <textarea 
                    value={persona.instructions}
                    onChange={(e) => handleUpdatePersona(persona.id, { instructions: e.target.value })}
                    placeholder="例如：你是一个傲娇的青梅竹马..."
                    className="w-full h-40 bg-white border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900 leading-relaxed"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">专属提示词 (Prompts)</label>
                    <button 
                      onClick={() => handleAddPrompt(persona.id)}
                      className="text-[11px] text-blue-500 font-medium active:opacity-70"
                    >
                      + 添加提示词
                    </button>
                  </div>
                  <textarea 
                    value={persona.prompt || ''}
                    onChange={(e) => handleUpdatePersona(persona.id, { prompt: e.target.value })}
                    placeholder="主专属提示词..."
                    className="w-full h-40 bg-white border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900 leading-relaxed"
                  />
                  {persona.prompts?.map((p, i) => (
                    <div key={i} className="relative group">
                      <textarea 
                        value={p}
                        onChange={(e) => handleUpdatePromptArray(persona.id, i, e.target.value)}
                        placeholder={`额外提示词 ${i + 1}...`}
                        className="w-full h-40 bg-white border border-neutral-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[14px] text-neutral-900 leading-relaxed"
                      />
                      <button 
                        onClick={() => handleRemovePrompt(persona.id, i)}
                        className="absolute top-2 right-2 p-1 bg-red-50 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
