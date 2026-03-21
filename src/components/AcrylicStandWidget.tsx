import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, Upload } from 'lucide-react';

interface AcrylicStandWidgetProps {
  leftImage?: string;
  centerImage?: string;
  rightImage?: string;
  bgImage?: string;
  onUpdate: (updates: { leftImage?: string; centerImage?: string; rightImage?: string; bgImage?: string }) => void;
  isEditing?: boolean;
}

export function AcrylicStandWidget({ leftImage, centerImage, rightImage, bgImage, onUpdate, isEditing }: AcrylicStandWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = React.useState<'left' | 'center' | 'right' | 'bg' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTarget) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onUpdate({ [`${uploadTarget}Image`]: base64 });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const triggerUpload = (target: 'left' | 'center' | 'right' | 'bg') => {
    setUploadTarget(target);
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center p-2 overflow-hidden">
      <input 
        type="file" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
      />
      
      {/* Main Acrylic Plate */}
      <div className="relative w-full aspect-[2/1] bg-white/10 backdrop-blur-md rounded-xl border border-white/30 shadow-2xl overflow-hidden flex items-end justify-around px-4 pb-2">
        {/* Raindrops Background */}
        <div 
          className="absolute inset-0 opacity-60 pointer-events-none bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${bgImage || 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80'})`,
            mixBlendMode: 'overlay'
          }}
        />
        
        {/* Left Character */}
        <div className="relative z-10 w-1/3 h-[85%] flex items-end justify-center group/item">
          <img 
            src={leftImage || "https://picsum.photos/seed/boy1/400/600"} 
            className="h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            alt="Left"
            referrerPolicy="no-referrer"
          />
          {isEditing && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                triggerUpload('left');
              }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity rounded-lg z-20 cancel-drag"
            >
              <Upload size={24} className="text-white" />
            </button>
          )}
        </div>

        {/* Center Item */}
        <div className="relative z-20 w-1/4 h-[60%] flex items-center justify-center group/item mb-4">
          <img 
            src={centerImage || "https://api.iconify.design/fluent-emoji:adhesive-bandage.svg"} 
            className="w-full object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] rotate-[-15deg]"
            alt="Center"
            referrerPolicy="no-referrer"
          />
          {isEditing && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                triggerUpload('center');
              }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity rounded-lg z-30 cancel-drag"
            >
              <Upload size={20} className="text-white" />
            </button>
          )}
        </div>

        {/* Right Character */}
        <div className="relative z-10 w-1/3 h-[85%] flex items-end justify-center group/item">
          <img 
            src={rightImage || "https://picsum.photos/seed/boy2/400/600"} 
            className="h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            alt="Right"
            referrerPolicy="no-referrer"
          />
          {isEditing && (
            <button 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                triggerUpload('right');
              }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity rounded-lg z-20 cancel-drag"
            >
              <Upload size={24} className="text-white" />
            </button>
          )}
        </div>

        {/* Background Edit Button */}
        {isEditing && (
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              triggerUpload('bg');
            }}
            className="absolute top-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 text-white hover:bg-white/40 transition-colors z-30 cancel-drag"
          >
            <ImageIcon size={16} />
          </button>
        )}
      </div>

      {/* Base Stand */}
      <div className="w-[110%] h-4 bg-gradient-to-b from-white/40 to-white/10 backdrop-blur-xl rounded-full -mt-2 border-t border-white/50 shadow-lg relative z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"></div>
      </div>
    </div>
  );
}
