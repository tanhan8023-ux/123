import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Repeat, Shuffle, Upload } from 'lucide-react';
import { Song } from '../types';
import { generateId } from '../utils/id';

export const MusicPlayer: React.FC<{ 
  songs: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectSong: (index: number) => void;
  onAddSong: (song: Song, file: File) => void;
}> = ({ songs, currentSongIndex, isPlaying, onPlayPause, onNext, onPrev, onSelectSong, onAddSong }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newSong: Song = {
      id: generateId(),
      title: file.name.split('.')[0],
      artist: '未知艺术家',
      url: '', // URL will be generated in App.tsx
      cover: 'https://picsum.photos/seed/default/100/100'
    };

    onAddSong(newSong, file);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 text-white rounded-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">我的歌单</h2>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 bg-neutral-800 rounded-full hover:bg-neutral-700 transition-colors"
            title="上传音乐"
          >
            <Upload size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="audio/*" 
            className="hidden" 
          />
        </div>
        <div className="space-y-2">
          {songs.map((song, index) => (
            <div 
              key={song.id} 
              className={`flex items-center p-3 rounded-lg cursor-pointer ${currentSongIndex === index ? 'bg-neutral-800' : 'hover:bg-neutral-800'}`}
              onClick={() => onSelectSong(index)}
            >
              <img src={song.cover} alt={song.title} className="w-12 h-12 rounded-md mr-4" referrerPolicy="no-referrer" />
              <div>
                <div className="font-medium">{song.title}</div>
                <div className="text-sm text-neutral-400">{song.artist}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-neutral-800 flex items-center justify-between">
        <button onClick={onPrev}><SkipBack size={24} /></button>
        <button onClick={onPlayPause} className="p-3 bg-white text-black rounded-full">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={onNext}><SkipForward size={24} /></button>
      </div>
    </div>
  );
};
