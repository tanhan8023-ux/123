import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

export const MusicPlayerBar: React.FC<{ currentSong: Song; isPlaying: boolean; togglePlay: () => void }> = ({ currentSong, isPlaying, togglePlay }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <img src={currentSong.cover} alt={currentSong.title} className="w-12 h-12 rounded-md mr-4" referrerPolicy="no-referrer" />
        <div>
          <div className="font-medium text-white">{currentSong.title}</div>
          <div className="text-sm text-neutral-400">{currentSong.artist}</div>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <button onClick={togglePlay} className="p-3 bg-white text-neutral-900 rounded-full hover:bg-neutral-200 transition">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>
      <div className="w-32">
        <Volume2 size={20} className="text-neutral-400" />
      </div>
    </div>
  );
};
