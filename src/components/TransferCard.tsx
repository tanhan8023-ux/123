import React from 'react';

interface TransferCardProps {
  text: string;
}

export const TransferCard: React.FC<TransferCardProps> = ({ text }) => {
  const lines = text.split('\n');
  const title = lines.find(l => l.includes('【'))?.replace(/[【】]/g, '') || '转账';
  const amount = lines.find(l => l.includes('金额：'))?.replace('金额：', '').trim() || '0.00';
  const remark = lines.find(l => l.includes('备注：'))?.replace('备注：', '').trim() || '';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-3 w-64">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-emerald-500 p-1.5 rounded">
          <span className="text-white text-xs">转</span>
        </div>
        <span className="text-sm font-bold text-neutral-900">{title}</span>
      </div>
      <div className="text-2xl font-bold text-neutral-900 mb-2">¥{amount}</div>
      <div className="text-xs text-neutral-500 border-t border-neutral-100 pt-2">
        备注：{remark}
      </div>
    </div>
  );
};
