import React, { useState } from 'react';
import { LoveWidget } from './LoveWidget';

export const LoveWidgetScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [config, setConfig] = useState({
    avatar1: 'https://picsum.photos/seed/avatar1/100/100',
    avatar2: 'https://picsum.photos/seed/avatar2/100/100',
    backgroundImage: 'https://picsum.photos/seed/bg/800/600?blur=4',
    name1: '小乖',
    name2: '小宝',
    startDate: new Date().toISOString().split('T')[0],
    bottomMessage: '请靠近我和我的心'
  });

  return (
    <div 
      className="h-full overflow-y-auto bg-pink-50 p-4"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
    >
      <button onClick={onBack} className="mb-4 text-pink-600 font-bold">返回</button>
      <h2 className="text-xl font-bold text-center mb-4 text-pink-800">恋爱小组件设置</h2>
      
      <LoveWidget {...config} />

      <div className="mt-8 bg-white p-4 rounded-2xl shadow-sm space-y-4">
        <input 
          type="text" 
          placeholder="名字1" 
          value={config.name1} 
          onChange={(e) => setConfig({...config, name1: e.target.value})}
          className="w-full p-2 border rounded-lg"
        />
        <input 
          type="text" 
          placeholder="名字2" 
          value={config.name2} 
          onChange={(e) => setConfig({...config, name2: e.target.value})}
          className="w-full p-2 border rounded-lg"
        />
        <input 
          type="date" 
          placeholder="开始日期" 
          value={config.startDate} 
          onChange={(e) => setConfig({...config, startDate: e.target.value})}
          className="w-full p-2 border rounded-lg"
        />
        <input 
          type="text" 
          placeholder="底部寄语" 
          value={config.bottomMessage} 
          onChange={(e) => setConfig({...config, bottomMessage: e.target.value})}
          className="w-full p-2 border rounded-lg"
        />
      </div>
    </div>
  );
};
