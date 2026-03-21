import React, { useState } from 'react';
import { ChevronLeft, Plus, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoAlbumScreenProps {
  onBack: () => void;
}

export function PhotoAlbumScreen({ onBack }: PhotoAlbumScreenProps) {
  const [photos, setPhotos] = useState<string[]>([
    'https://picsum.photos/seed/photo1/800/800',
    'https://picsum.photos/seed/photo2/800/800',
    'https://picsum.photos/seed/photo3/800/800',
    'https://picsum.photos/seed/photo4/800/800',
    'https://picsum.photos/seed/photo5/800/800',
    'https://picsum.photos/seed/photo6/800/800',
    'https://picsum.photos/seed/photo7/800/800',
    'https://picsum.photos/seed/photo8/800/800',
    'https://picsum.photos/seed/photo9/800/800',
  ]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleAddPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotos([event.target.result as string, ...photos]);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDeletePhoto = (photoToDelete: string) => {
    setPhotos(photos.filter(photo => photo !== photoToDelete));
    setSelectedPhoto(null);
  };

  return (
    <div className="w-full h-full bg-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 border-b border-neutral-100 bg-white/80 backdrop-blur-md z-10 shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(3.5rem + env(safe-area-inset-top))' }}
      >
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center -ml-2 active:bg-neutral-100 rounded-full transition-colors text-neutral-700"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="font-medium text-[17px] text-neutral-800">相册</div>
        <button 
          onClick={handleAddPhoto}
          className="w-10 h-10 flex items-center justify-center -mr-2 active:bg-neutral-100 rounded-full transition-colors text-neutral-700"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto p-1">
        <div className="grid grid-cols-3 gap-1">
          {photos.map((photo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="aspect-square bg-neutral-100 relative cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img 
                src={photo} 
                alt={`Photo ${index + 1}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fullscreen Photo Viewer */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black z-50 flex flex-col"
          >
            <div className="h-14 flex items-center justify-between px-4 bg-gradient-to-b from-black/50 to-transparent z-10">
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="w-10 h-10 flex items-center justify-center -ml-2 active:bg-white/20 rounded-full transition-colors text-white"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-white font-medium text-[15px]">
                {photos.indexOf(selectedPhoto) + 1} / {photos.length}
              </div>
              <button 
                onClick={() => handleDeletePhoto(selectedPhoto)}
                className="w-10 h-10 flex items-center justify-center -mr-2 active:bg-white/20 rounded-full transition-colors text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                src={selectedPhoto}
                alt="Selected"
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
