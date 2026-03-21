import React, { useState } from 'react';
import { Transaction } from '../types';
import { ArrowLeft, CreditCard } from 'lucide-react';

interface WalletScreenProps {
  balance: number;
  transactions: Transaction[];
  onRecharge: (amount: number) => void;
  onBack: () => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ balance, transactions, onRecharge, onBack }) => {
  const [rechargeAmount, setRechargeAmount] = useState('');

  const handleRecharge = () => {
    const amount = parseFloat(rechargeAmount);
    if (!isNaN(amount) && amount > 0) {
      onRecharge(amount);
      setRechargeAmount('');
    }
  };

  return (
    <div className="w-full h-full bg-neutral-100 flex flex-col">
      <div 
        className="p-4 bg-white flex items-center shadow-sm"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        <button onClick={onBack} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold ml-2">我的钱包</h1>
      </div>
      <div className="p-6">
        <div className="bg-neutral-900 text-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center mb-2">
            <CreditCard className="mr-2" />
            <span className="text-neutral-400">余额</span>
          </div>
          <div className="text-4xl font-bold">¥{balance.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <h2 className="text-sm font-bold mb-4 text-neutral-500">自定义充值</h2>
          <div className="flex gap-2">
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder="输入金额"
              className="flex-1 p-3 border rounded-xl"
            />
            <button onClick={handleRecharge} className="bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold">
              充值
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-bold mb-4 text-neutral-500">交易记录</h2>
          <div className="space-y-4">
            {transactions.slice().reverse().map(t => (
              <div key={t.id} className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{t.description}</div>
                  <div className="text-xs text-neutral-400">{new Date(t.timestamp).toLocaleString()}</div>
                </div>
                <div className={`font-bold ${t.type === 'top_up' ? 'text-emerald-500' : 'text-neutral-900'}`}>
                  {t.type === 'payment' ? '-' : '+'}{t.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
