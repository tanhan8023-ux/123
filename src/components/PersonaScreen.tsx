import React, { useState } from 'react';
import { ChevronLeft, BookOpen, Download, Upload, Users, Image as ImageIcon, RefreshCw, Trash2 } from 'lucide-react';
import { WorldbookSettings, Persona, ApiSettings, UserProfile, ThemeSettings } from '../types';
import { GoogleGenAI } from '@google/genai';
import { fetchAiResponse } from '../services/aiService';

interface Props {
  worldbook: WorldbookSettings;
  personas: Persona[];
  apiSettings: ApiSettings;
  userProfile: UserProfile;
  aiRef: React.MutableRefObject<GoogleGenAI | null>;
  onSave: (worldbook: WorldbookSettings, personas: Persona[]) => void;
  onBack: () => void;
  theme: ThemeSettings;
}

export function PersonaScreen({ worldbook: initialWorldbook, personas: initialPersonas, apiSettings, userProfile, aiRef, onSave, onBack, theme }: Props) {
  const [worldbook, setWorldbook] = useState<WorldbookSettings>(initialWorldbook);
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleAiGenerateStatus = async (persona: Persona) => {
    try {
      const prompt = `你现在是${persona.name}。请根据你的人设、当前心情和情景，写一段简短的“状态/自动回复”内容（用于你不在时展示给别人看）。
人设设定：${persona.instructions}
当前心情：${persona.mood || '未设置'}
当前情景：${persona.context || '未设置'}
要求：语气符合人设，简短有力，不要超过30个字。直接输出回复内容，不要有任何解释。`;
      
      const response = await fetchAiResponse(
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
        undefined,
        undefined,
        undefined,
        true
      );
      handleUpdatePersona(persona.id, 'statusMessage', response.responseText);
    } catch (e) {
      console.error("Failed to generate AI status:", e);
      alert('生成失败，请检查 API 设置。');
    }
  };

  const hasChanges = JSON.stringify(worldbook) !== JSON.stringify(initialWorldbook) || 
                     JSON.stringify(personas) !== JSON.stringify(initialPersonas);

  const handleBack = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onBack();
    }
  };

  const handleSave = () => {
    onSave(worldbook, personas);
    onBack();
  };

  const handleImportWorldbook = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported && typeof imported === 'object') {
            setWorldbook({
              jailbreakPrompt: imported.jailbreakPrompt || '',
              globalPrompt: imported.globalPrompt || '',
              jailbreakPrompts: imported.jailbreakPrompts || [],
              globalPrompts: imported.globalPrompts || [],
              forceSegmentResponse: !!imported.forceSegmentResponse
            });
            alert('导入成功！');
          } else {
            throw new Error('Invalid format');
          }
        } catch (err) {
          alert('导入失败：文件格式不正确');
        }
        e.target.value = ''; // Reset input
      };
      reader.readAsText(file);
    }
  };

  const handleExportWorldbook = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(worldbook, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "worldbook.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleUpdatePersona = (id: string, field: keyof Persona, value: any) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAiDefineAutoReply = async (persona: Persona) => {
    try {
      const prompt = `你现在是${persona.name}。请根据你的人设设定，写一段简短的自动回复内容（用于你不在时回复用户）。
人设设定：${persona.instructions}
要求：语气符合人设，简短有力，不要超过30个字。直接输出回复内容，不要有任何解释。`;
      
      // For now, I'll add a simple simulation or just a prompt to the user.
      alert('AI 自动回复生成功能暂不可用，请手动填写。');
    } catch (e) {
      console.error("Failed to generate AI auto-reply:", e);
      alert('生成失败，请手动填写。');
    }
  };

  const handleToggleSegment = (id: string) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, isSegmentResponse: !p.isSegmentResponse } : p));
  };

  const handleUpdatePromptArray = (type: 'jailbreak' | 'global', index: number, value: string) => {
    const field = type === 'jailbreak' ? 'jailbreakPrompts' : 'globalPrompts';
    const current = [...(worldbook[field] || [])];
    current[index] = value;
    setWorldbook({ ...worldbook, [field]: current });
  };

  const handleAddPrompt = (type: 'jailbreak' | 'global') => {
    const field = type === 'jailbreak' ? 'jailbreakPrompts' : 'globalPrompts';
    const current = [...(worldbook[field] || [])];
    current.push('');
    setWorldbook({ ...worldbook, [field]: current });
  };

  const handleRemovePrompt = (type: 'jailbreak' | 'global', index: number) => {
    const field = type === 'jailbreak' ? 'jailbreakPrompts' : 'globalPrompts';
    const current = [...(worldbook[field] || [])];
    current.splice(index, 1);
    setWorldbook({ ...worldbook, [field]: current });
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
        <h1 className="font-semibold text-neutral-900 text-[15px]">世界书 (破限与提示词)</h1>
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
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2 text-neutral-700">
              <BookOpen size={20} className="text-blue-400" />
              <h2 className="font-semibold text-[15px]">全局设定</h2>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-neutral-500 text-[12px] font-medium active:opacity-70 cursor-pointer">
                <Upload size={14} /> 导入
                <input type="file" accept=".json" className="hidden" onChange={handleImportWorldbook} />
              </label>
              <button 
                onClick={handleExportWorldbook}
                className="flex items-center gap-1 text-neutral-500 text-[12px] font-medium active:opacity-70"
              >
                <Download size={14} /> 导出
              </button>
              <button 
                onClick={() => {
                  if (confirm('确定要删除所有世界书设定吗？此操作不可撤销。')) {
                    setWorldbook({
                      jailbreakPrompt: '',
                      globalPrompt: '',
                      jailbreakPrompts: [],
                      globalPrompts: []
                    });
                  }
                }}
                className="flex items-center gap-1 text-red-500 text-[12px] font-medium active:opacity-70"
              >
                <Trash2 size={14} /> 删除
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-neutral-600 uppercase tracking-wide">破限词 (Jailbreak Prompt)</label>
              <button 
                onClick={() => setWorldbook({ ...worldbook, jailbreakPrompt: '' })}
                className="text-[12px] text-red-500 font-medium active:opacity-70"
              >
                清空
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              用于突破 AI 模型的内置限制。此内容将作为系统提示词的最前置部分发送。
            </p>
            <textarea 
              value={worldbook.jailbreakPrompt}
              onChange={(e) => setWorldbook({ ...worldbook, jailbreakPrompt: e.target.value })}
              placeholder="主破限词..."
              className="w-full h-40 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-900 leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-neutral-600 uppercase tracking-wide">额外破限词</label>
              <button 
                onClick={() => handleAddPrompt('jailbreak')}
                className="text-[12px] text-blue-500 font-medium active:opacity-70"
              >
                + 添加输入框
              </button>
            </div>
            {worldbook.jailbreakPrompts?.map((p, i) => (
              <div key={i} className="relative group">
                <textarea 
                  value={p}
                  onChange={(e) => handleUpdatePromptArray('jailbreak', i, e.target.value)}
                  placeholder={`额外破限词 ${i + 1}...`}
                  className="w-full h-40 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-900 leading-relaxed"
                />
                <button 
                  onClick={() => handleRemovePrompt('jailbreak', i)}
                  className="absolute top-2 right-2 p-1 bg-red-50 text-red-500 rounded-md transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-neutral-50">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-neutral-600 uppercase tracking-wide">全局提示词 (Global Prompt)</label>
              <button 
                onClick={() => setWorldbook({ ...worldbook, globalPrompt: '' })}
                className="text-[12px] text-red-500 font-medium active:opacity-70"
              >
                清空
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              适用于所有角色的全局设定，例如世界观背景、通用规则等。
            </p>
            <textarea 
              value={worldbook.globalPrompt}
              onChange={(e) => setWorldbook({ ...worldbook, globalPrompt: e.target.value })}
              placeholder="主全局提示词..."
              className="w-full h-40 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-900 leading-relaxed"
            />
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-neutral-600 uppercase tracking-wide">额外全局提示词</label>
              <button 
                onClick={() => handleAddPrompt('global')}
                className="text-[12px] text-blue-500 font-medium active:opacity-70"
              >
                + 添加输入框
              </button>
            </div>
            {worldbook.globalPrompts?.map((p, i) => (
              <div key={i} className="relative group">
                <textarea 
                  value={p}
                  onChange={(e) => handleUpdatePromptArray('global', i, e.target.value)}
                  placeholder={`额外全局提示词 ${i + 1}...`}
                  className="w-full h-40 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[13px] text-neutral-900 leading-relaxed"
                />
                <button 
                  onClick={() => handleRemovePrompt('global', i)}
                  className="absolute top-2 right-2 p-1 bg-red-50 text-red-500 rounded-md transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
              <div className="space-y-1">
                <label className="text-[13px] font-medium text-neutral-900">强制全员分段回复</label>
                <p className="text-[11px] text-neutral-500">开启后，所有角色都将强制使用分段回复模式。</p>
              </div>
              <button 
                onClick={() => setWorldbook({ ...worldbook, forceSegmentResponse: !worldbook.forceSegmentResponse })}
                className={`w-11 h-6 rounded-full transition-colors relative ${worldbook.forceSegmentResponse ? 'bg-blue-500' : 'bg-neutral-200'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${worldbook.forceSegmentResponse ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Persona Settings */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 space-y-6">
          <div className="flex items-center gap-2 text-neutral-700 border-b border-neutral-100 pb-3">
            <Users size={20} className="text-purple-400" />
            <h2 className="font-semibold text-[15px]">角色高级设置</h2>
          </div>
          
          <div className="space-y-6">
            {personas.map((persona) => (
              <div key={persona.id} className="space-y-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={persona.avatarUrl} alt={persona.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-medium text-neutral-800">{persona.name}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[13px] text-neutral-700">分段回复功能</span>
                      <span className="text-[10px] text-neutral-400">AI 将尝试分多条消息回复，模拟真人聊天节奏</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={persona.isSegmentResponse || false}
                        onChange={() => handleToggleSegment(persona.id)}
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[13px] text-neutral-700">主动发消息功能</span>
                      <span className="text-[10px] text-neutral-400">AI 会在一段时间不说话后主动找你聊天</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={persona.allowActiveMessaging || false}
                        onChange={() => {
                          setPersonas(personas.map(p => p.id === persona.id ? { ...p, allowActiveMessaging: !p.allowActiveMessaging } : p));
                        }}
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  <div className="border-t border-neutral-100 pt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={14} className="text-pink-400" />
                      <span className="text-[13px] font-medium text-neutral-700">头像美化 (框与挂件)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">头像框 URL</label>
                        <input 
                          type="text" 
                          value={persona.avatarFrame || ''}
                          onChange={(e) => handleUpdatePersona(persona.id, 'avatarFrame', e.target.value)}
                          placeholder="图片链接..."
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">挂件 URL</label>
                        <input 
                          type="text" 
                          value={persona.avatarPendant || ''}
                          onChange={(e) => handleUpdatePersona(persona.id, 'avatarPendant', e.target.value)}
                          placeholder="图片链接..."
                          className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-[12px] outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">缩放 ({persona.avatarFrameScale || 1})</label>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2" 
                          step="0.05"
                          value={persona.avatarFrameScale || 1}
                          onChange={(e) => handleUpdatePersona(persona.id, 'avatarFrameScale', parseFloat(e.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">偏移 X ({persona.avatarFrameX || 0})</label>
                        <input 
                          type="range" 
                          min="-50" 
                          max="50" 
                          step="1"
                          value={persona.avatarFrameX || 0}
                          onChange={(e) => handleUpdatePersona(persona.id, 'avatarFrameX', parseInt(e.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-neutral-400">偏移 Y ({persona.avatarFrameY || 0})</label>
                        <input 
                          type="range" 
                          min="-50" 
                          max="50" 
                          step="1"
                          value={persona.avatarFrameY || 0}
                          onChange={(e) => handleUpdatePersona(persona.id, 'avatarFrameY', parseInt(e.target.value))}
                          className="w-full accent-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
