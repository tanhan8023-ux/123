import React, { useState } from 'react';
import { Persona, Message, UserProfile, GroupChat } from '../types';
import { Users, Plus, X, Check } from 'lucide-react';

interface Props {
  personas: Persona[];
  groups: GroupChat[];
  messages: Message[];
  userProfile: UserProfile;
  setCurrentChatId: (id: string | null) => void;
  setCurrentGroupId: (id: string | null) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  defaultAiAvatar: string;
  defaultUserAvatar: string;
  formatRelativeTime: (timestampMs: number | undefined) => string;
}

export const ChatListView = ({ 
  personas, groups, messages, userProfile, setCurrentChatId, setCurrentGroupId, onCreateGroup, defaultAiAvatar, defaultUserAvatar, formatRelativeTime 
}: Props) => {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!newGroupName.trim() || selectedMembers.length < 1) return;
    onCreateGroup(newGroupName, selectedMembers);
    setShowCreateGroup(false);
    setNewGroupName('');
    setSelectedMembers([]);
  };

  return (
    <div className="bg-white">
      {/* Create Group Button */}
      <div 
        onClick={() => setShowCreateGroup(true)}
        className="flex items-center gap-3 p-3 border-b border-neutral-100 active:bg-neutral-50 cursor-pointer text-blue-500"
      >
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
          <Users size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-[16px] font-medium">发起群聊</h3>
          <p className="text-[12px] opacity-70">与多位 AI 角色同时交流</p>
        </div>
        <Plus size={20} />
      </div>

      {/* Group List */}
      {groups.map(g => {
        const filtered = messages.filter(m => m.groupId === g.id);
        const lastMsg = filtered[filtered.length - 1];
        return (
          <div 
            key={g.id}
            onClick={() => setCurrentGroupId(g.id)}
            className="flex items-center gap-3 p-3 border-b border-neutral-100 active:bg-neutral-50 cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200">
                <div className="grid grid-cols-2 gap-0.5 p-0.5 w-full h-full">
                  {g.memberIds.slice(0, 4).map((mid, idx) => {
                    if (mid === 'user') {
                      return <img key={`${mid}-${idx}`} src={userProfile.avatarUrl || defaultUserAvatar} className="w-full h-full object-cover" alt="member" />;
                    }
                    const p = personas.find(pers => pers.id === mid);
                    return <img key={`${mid}-${idx}`} src={p?.avatarUrl || defaultAiAvatar} className="w-full h-full object-cover" alt="member" />;
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-[16px] font-medium text-neutral-900 truncate pr-2">
                  {g.name}
                  <span className="ml-1 text-[12px] text-neutral-400 font-normal">({g.memberIds.length})</span>
                </h3>
                <span className="text-[12px] text-neutral-400">
                  {lastMsg ? formatRelativeTime(lastMsg.createdAt) : ''}
                </span>
              </div>
              <p className="text-[13px] text-neutral-500 truncate mt-0.5">
                {lastMsg ? (
                  `${personas.find(p => p.id === lastMsg.personaId)?.name || '我'}: ${(lastMsg.text || '').replace(/\|\|NEXT:[^|]+\|\|/g, '').trim()}`
                ) : '暂无消息'}
              </p>
            </div>
          </div>
        );
      })}

      {/* Persona List */}
      {personas.map((p) => {
        const filtered = messages.filter(m => m.personaId === p.id && !m.groupId);
        const lastMsg = filtered[filtered.length - 1];
        return (
          <div 
            key={p.id}
            onClick={() => setCurrentChatId(p.id)}
            className="flex items-center gap-3 p-3 border-b border-neutral-100 active:bg-neutral-50 cursor-pointer"
          >
            <div className="relative shrink-0">
              <img src={p.avatarUrl || defaultAiAvatar} className="w-12 h-12 rounded-xl object-cover" alt="avatar" />
              {p.avatarFrame && (
                <img 
                  src={p.avatarFrame} 
                  className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] object-contain pointer-events-none z-10 select-none"
                  alt="frame"
                  style={{ 
                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.1))',
                    transform: `translate(${p.avatarFrameX || 0}px, ${p.avatarFrameY || 0}px) scale(${p.avatarFrameScale || 1})`
                  }}
                />
              )}
              {p.avatarPendant && (
                <img 
                  src={p.avatarPendant} 
                  className="absolute -top-1 -right-1 w-6 h-6 object-contain pointer-events-none z-20 select-none"
                  alt="pendant"
                />
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center">
                <h3 className="text-[16px] font-medium text-neutral-900">
                  {p.name}
                  {p.isBlockedByUser && <span className="ml-2 text-[10px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">已拉黑</span>}
                </h3>
                <span className="text-[12px] text-neutral-400">
                  {lastMsg ? formatRelativeTime(lastMsg.createdAt) : ''}
                </span>
              </div>
              {p.isOffline ? (
                <p className="text-[12px] text-neutral-400 truncate">[离线]</p>
              ) : (
                p.statusMessage && <p className="text-[12px] text-blue-500 truncate">[{p.statusMessage}]</p>
              )}
              <p className="text-[13px] text-neutral-500 truncate mt-0.5">
                {lastMsg ? (
                  lastMsg.msgType === 'transfer' ? '[转账]' : 
                  lastMsg.msgType === 'music' ? '[音乐分享]' :
                  lastMsg.msgType === 'xhsPost' ? '[小红书分享]' :
                  lastMsg.msgType === 'listenTogether' ? '[一起听歌]' :
                  (lastMsg.text || '').replace(/\|\|NEXT:[^|]+\|\|/g, '').trim()
                ) : '暂无消息'}
              </p>
            </div>
          </div>
        );
      })}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <button onClick={() => setShowCreateGroup(false)} className="p-1"><X size={20} /></button>
              <h2 className="font-bold">发起群聊</h2>
              <button 
                onClick={handleCreate}
                disabled={!newGroupName.trim() || selectedMembers.length < 1}
                className="text-blue-500 font-bold disabled:opacity-50"
              >
                完成
              </button>
            </div>
            <div className="p-4">
              <input 
                type="text" 
                placeholder="群聊名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-3 bg-neutral-100 rounded-xl outline-none focus:ring-2 ring-blue-500/20"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs text-neutral-400 font-bold uppercase px-1">选择成员</p>
              {personas.map(p => (
                <div 
                  key={p.id}
                  onClick={() => toggleMember(p.id)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 cursor-pointer"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedMembers.includes(p.id) ? 'bg-blue-500 border-blue-500' : 'border-neutral-300'}`}>
                    {selectedMembers.includes(p.id) && <Check size={12} className="text-white" />}
                  </div>
                  <img src={p.avatarUrl || defaultAiAvatar} className="w-10 h-10 rounded-lg object-cover" alt="avatar" />
                  <span className="flex-1 font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
