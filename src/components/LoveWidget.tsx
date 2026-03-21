import React from 'react';

interface LoveWidgetProps {
  avatar1: string;
  avatar2: string;
  backgroundImage: string;
  name1: string;
  name2: string;
  startDate: string;
  bottomMessage: string;
}

export const LoveWidget: React.FC<LoveWidgetProps> = ({
  avatar1,
  avatar2,
  backgroundImage,
  name1,
  name2,
  startDate,
  bottomMessage,
}) => {
  const [daysTogether, setDaysTogether] = React.useState(0);

  React.useEffect(() => {
    const calculateDays = () => {
      if (!startDate) return 0;
      const start = new Date(startDate).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    };

    setDaysTogether(calculateDays());
    const interval = setInterval(() => {
      setDaysTogether(calculateDays());
    }, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <div 
      className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden shadow-sm p-3 flex flex-col items-center gap-1.5"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-white/50" />

      <div className="relative z-10 w-full flex flex-col items-center gap-1">
        <div className="text-[10px] text-gray-500 font-medium bg-white/70 px-2 py-0.5 rounded-full">
          我们已经相爱
        </div>

        <div className="flex items-center justify-center gap-2 w-full mt-0.5">
          <div className="flex flex-col items-center gap-0.5">
            <img src={avatar1} alt={name1} className="w-10 h-10 rounded-full border border-white shadow-sm object-cover" />
            <span className="text-gray-600 font-medium text-[10px]">{name1}</span>
          </div>
          
          <div className="relative flex flex-col items-center justify-center w-10 h-10">
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8 drop-shadow-sm">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 font-bold text-[8px]">
              <span>{daysTogether}</span>
              <span>天</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <img src={avatar2} alt={name2} className="w-10 h-10 rounded-full border border-white shadow-sm object-cover" />
            <span className="text-gray-600 font-medium text-[10px]">{name2}</span>
          </div>
        </div>

        <div className="mt-0.5 bg-white/60 px-2 py-1 rounded-full text-gray-500 text-[10px] font-medium">
          {bottomMessage}
        </div>
      </div>
    </div>
  );
};
