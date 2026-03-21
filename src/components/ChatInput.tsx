import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onPlusClick: () => void;
  isLoading: boolean;
}

export const ChatInput = React.memo(({ onSend, onPlusClick, isLoading }: ChatInputProps) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="p-3 flex items-center gap-2">
      <button onClick={onPlusClick} className="p-1.5 text-neutral-500 hover:text-neutral-800">
        <Plus size={24} />
      </button>
      <input 
        type="text" 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        className="flex-1 bg-white rounded-md px-3 py-2 outline-none text-[15px] text-neutral-800"
      />
      {input.trim() ? (
        <button 
          onClick={handleSend}
          className="bg-[#07c160] text-white px-4 py-2 rounded-md font-medium text-[15px] active:bg-[#06ad56] transition-colors"
        >
          发送
        </button>
      ) : (
        <button className="w-9 h-9 rounded-full border border-neutral-400 flex items-center justify-center text-neutral-600 active:bg-neutral-200">
          +
        </button>
      )}
    </div>
  );
});
