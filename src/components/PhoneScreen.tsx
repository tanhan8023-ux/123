import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, ChevronLeft, Clock, Users, Delete, Grid3X3, User } from 'lucide-react';
import { Persona, CallRecord, ApiSettings, WorldbookSettings, UserProfile } from '../types';
import { fetchAiResponse } from '../services/aiService';
import { GoogleGenAI } from '@google/genai';

interface Props {
  personas: Persona[];
  callHistory: CallRecord[];
  onBack: () => void;
  onStartCall: (personaId: string) => void;
}

export function PhoneScreen({ personas, callHistory, onBack, onStartCall }: Props) {
  const [activeTab, setActiveTab] = useState<'recents' | 'contacts' | 'keypad'>('recents');
  const [dialNumber, setDialNumber] = useState('');

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white text-black pt-[calc(3.5rem+env(safe-area-inset-top))]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">电话</h1>
        <div className="w-10"></div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'recents' && (
          <div className="divide-y divide-gray-100">
            {callHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400">暂无通话记录</div>
            ) : (
              callHistory.slice().reverse().map(call => {
                const persona = personas.find(p => p.id === call.personaId);
                if (!persona) return null;
                return (
                  <div key={call.id} className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                    <img src={persona.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} alt={persona.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className="ml-4 flex-1">
                      <div className={`font-medium ${call.type === 'missed' ? 'text-red-500' : 'text-black'}`}>
                        {persona.name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        {call.type === 'incoming' && <Phone size={12} className="text-green-500" />}
                        {call.type === 'outgoing' && <Phone size={12} className="text-blue-500" />}
                        {call.type === 'missed' && <PhoneOff size={12} className="text-red-500" />}
                        {call.type === 'missed' ? '未接来电' : `通话时长 ${formatDuration(call.duration)}`}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400 flex flex-col items-end">
                      <span>{formatTime(call.startTime)}</span>
                      <button 
                        onClick={() => onStartCall(persona.id)}
                        className="mt-1 p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                      >
                        <Phone size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="divide-y divide-gray-100">
            {personas.map(persona => (
              <div key={persona.id} className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                <img src={persona.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} alt={persona.name} className="w-12 h-12 rounded-full object-cover" />
                <div className="ml-4 flex-1">
                  <div className="font-medium text-black">{persona.name}</div>
                  <div className="text-sm text-gray-500 line-clamp-1">{persona.description || '暂无简介'}</div>
                </div>
                <button 
                  onClick={() => onStartCall(persona.id)}
                  className="p-3 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                >
                  <Phone size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'keypad' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="text-4xl font-light tracking-widest mb-8 h-12 text-center w-full truncate">
                {dialNumber}
              </div>
              <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                {[
                  { num: '1', letters: '' },
                  { num: '2', letters: 'A B C' },
                  { num: '3', letters: 'D E F' },
                  { num: '4', letters: 'G H I' },
                  { num: '5', letters: 'J K L' },
                  { num: '6', letters: 'M N O' },
                  { num: '7', letters: 'P Q R S' },
                  { num: '8', letters: 'T U V' },
                  { num: '9', letters: 'W X Y Z' },
                  { num: '*', letters: '' },
                  { num: '0', letters: '+' },
                  { num: '#', letters: '' },
                ].map((key, i) => (
                  <button 
                    key={i}
                    onClick={() => setDialNumber(prev => prev + key.num)}
                    className="w-20 h-20 rounded-full bg-gray-100 hover:bg-gray-200 flex flex-col items-center justify-center transition-colors active:bg-gray-300"
                  >
                    <span className="text-3xl font-light">{key.num}</span>
                    <span className="text-[10px] text-gray-500 font-medium tracking-widest">{key.letters}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center w-full mt-10 relative">
                <button 
                  onClick={() => {
                    if (dialNumber) {
                      // Find persona by phone number if we had one, for now just match by name or random
                      const matchedPersona = personas.find(p => p.name.includes(dialNumber) || p.id.includes(dialNumber));
                      if (matchedPersona) {
                        onStartCall(matchedPersona.id);
                      } else if (personas.length > 0) {
                        // Random persona if no match
                        onStartCall(personas[Math.floor(Math.random() * personas.length)].id);
                      }
                      setDialNumber('');
                    }
                  }}
                  className="w-20 h-20 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors active:scale-95"
                >
                  <Phone size={32} />
                </button>
                {dialNumber && (
                  <button 
                    onClick={() => setDialNumber(prev => prev.slice(0, -1))}
                    className="absolute right-8 p-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Delete size={28} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex justify-around items-center p-2 border-t border-gray-100 bg-white pb-safe">
        <button 
          onClick={() => setActiveTab('recents')}
          className={`flex flex-col items-center p-2 ${activeTab === 'recents' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Clock size={24} />
          <span className="text-[10px] mt-1">最近通话</span>
        </button>
        <button 
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center p-2 ${activeTab === 'contacts' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Users size={24} />
          <span className="text-[10px] mt-1">通讯录</span>
        </button>
        <button 
          onClick={() => setActiveTab('keypad')}
          className={`flex flex-col items-center p-2 ${activeTab === 'keypad' ? 'text-blue-500' : 'text-gray-400'}`}
        >
          <Grid3X3 size={24} />
          <span className="text-[10px] mt-1">拨号键盘</span>
        </button>
      </div>
    </div>
  );
}
