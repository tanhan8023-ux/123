import React, { useState } from 'react';
import { ArrowLeft, Search, ShoppingCart, MessageCircle, Star, ChevronRight, CheckCircle2, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Transaction, Persona, ThemeSettings } from '../types';
import { generateId } from '../utils/id';

interface Props {
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onBack: () => void;
  personas: Persona[];
  onShare: (productId: string, personaId: string) => void;
  theme: ThemeSettings;
}

const PRODUCTS = [
  {
    id: 'p1',
    name: '【官方正品】新款降噪蓝牙耳机 沉浸式音质 超长续航',
    price: 299,
    sales: '1万+',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    shop: '数码官方旗舰店'
  },
  {
    id: 'p2',
    name: 'ins风简约陶瓷马克杯 办公室咖啡杯 伴手礼',
    price: 39.9,
    sales: '5000+',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=400&q=80',
    shop: '生活美学馆'
  },
  {
    id: 'p3',
    name: '【包邮】特级明前龙井 绿茶礼盒装 250g',
    price: 158,
    sales: '2000+',
    image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=400&q=80',
    shop: '茗茶专卖店'
  },
  {
    id: 'p4',
    name: '复古胶片相机 傻瓜机 胶卷相机 学生党入门',
    price: 128,
    sales: '800+',
    image: 'https://images.unsplash.com/photo-1516961642265-531546e84af2?auto=format&fit=crop&w=400&q=80',
    shop: '时光影像馆'
  }
];

export function TaobaoScreen({ userProfile, setUserProfile, onBack, personas, onShare, theme }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<typeof PRODUCTS[0] | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const handleBuy = (product: typeof PRODUCTS[0]) => {
    const balance = userProfile.balance || 0;
    if (balance >= product.price) {
      const newTransaction: Transaction = {
        id: generateId(),
        type: 'payment',
        amount: product.price,
        description: `淘宝购物: ${product.name.substring(0, 10)}...`,
        timestamp: Date.now()
      };

      setUserProfile(prev => ({
        ...prev,
        balance: (prev.balance || 0) - product.price,
        transactions: [newTransaction, ...(prev.transactions || [])]
      }));

      setToastMsg('支付成功！');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setSelectedProduct(null);
      }, 2000);
    } else {
      setToastMsg('余额不足，请先充值');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleShare = (personaId: string) => {
    if (selectedProduct) {
      onShare(selectedProduct.id, personaId);
      setShowShareModal(false);
      setToastMsg('已分享给好友');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  return (
    <motion.div 
      className="absolute inset-0 bg-[#f2f2f2] flex flex-col z-30"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      {/* Header */}
      <div 
        className={`bg-[#ff5000] px-4 pb-3 flex items-center gap-3 shrink-0`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <button onClick={onBack} className="p-1 -ml-1 text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 bg-white/20 rounded-full h-8 flex items-center px-3 gap-2">
          <Search className="w-4 h-4 text-white/80" />
          <span className="text-white/80 text-sm">搜索宝贝、店铺...</span>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Banner */}
        <div className="p-3">
          <div className="w-full h-32 bg-gradient-to-r from-orange-400 to-[#ff5000] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm">
            双11提前购 满300减50
          </div>
        </div>

        {/* Product Grid */}
        <div className="px-3 grid grid-cols-2 gap-2">
          {PRODUCTS.map(product => (
            <div 
              key={product.id} 
              className="bg-white rounded-xl overflow-hidden shadow-sm active:scale-95 transition-transform"
              onClick={() => setSelectedProduct(product)}
            >
              <div className="aspect-square w-full">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-2">
                <div className="text-[13px] text-neutral-800 line-clamp-2 leading-tight mb-2">
                  {product.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[#ff5000] text-xs">¥</span>
                  <span className="text-[#ff5000] text-lg font-bold">{product.price}</span>
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  {product.sales}人付款
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <motion.div 
          className="absolute inset-0 bg-white z-40 flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="absolute top-12 left-4 z-50 bg-black/30 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm">
            <button onClick={() => setSelectedProduct(null)} className="text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-12 right-4 z-50 bg-black/30 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm">
            <button onClick={() => setShowShareModal(true)} className="text-white">
              <Share className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
            <div className="w-full aspect-square">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
            </div>
            
            <div className="p-4 bg-white">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-[#ff5000] text-sm">¥</span>
                <span className="text-[#ff5000] text-3xl font-bold">{selectedProduct.price}</span>
              </div>
              <div className="text-base font-medium text-neutral-900 leading-snug mb-2">
                {selectedProduct.name}
              </div>
              <div className="flex justify-between items-center text-xs text-neutral-500">
                <span>快递: 免运费</span>
                <span>月销 {selectedProduct.sales}</span>
                <span>浙江杭州</span>
              </div>
            </div>

            <div className="mt-2 p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">{selectedProduct.shop}</div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1">
                    <Star className="w-3 h-3 text-[#ff5000] fill-[#ff5000]" /> 综合体验 4.9
                  </div>
                </div>
              </div>
              <div className="flex items-center text-xs text-[#ff5000] border border-[#ff5000] rounded-full px-3 py-1">
                进店逛逛 <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 p-2 flex items-center gap-3"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex gap-4 px-2">
              <div className="flex flex-col items-center gap-1 text-neutral-500">
                <MessageCircle className="w-5 h-5" />
                <span className="text-[10px]">客服</span>
              </div>
              <div className="flex flex-col items-center gap-1 text-neutral-500">
                <Star className="w-5 h-5" />
                <span className="text-[10px]">收藏</span>
              </div>
            </div>
            <div className="flex-1 flex gap-2">
              <button className="flex-1 bg-gradient-to-r from-[#ffc500] to-[#ff9402] text-white rounded-full py-2.5 text-sm font-medium">
                加入购物车
              </button>
              <button 
                onClick={() => handleBuy(selectedProduct)}
                className="flex-1 bg-gradient-to-r from-[#ff7700] to-[#ff4900] text-white rounded-full py-2.5 text-sm font-medium"
              >
                立即购买
              </button>
            </div>
          </div>
          {/* Share Modal */}
          <AnimatePresence>
            {showShareModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 z-[60] flex flex-col justify-end"
                onClick={() => setShowShareModal(false)}
              >
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="bg-white rounded-t-2xl p-4 flex flex-col max-h-[60vh]"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-center font-medium text-neutral-900 mb-4">发送给朋友</div>
                  <div className="flex-1 overflow-y-auto">
                    {personas.map(p => (
                      <div 
                        key={p.id} 
                        className="flex items-center gap-3 p-3 border-b border-neutral-100 active:bg-neutral-50 cursor-pointer"
                        onClick={() => handleShare(p.id)}
                      >
                        <img src={p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'} className="w-10 h-10 rounded-lg object-cover" alt="avatar" />
                        <span className="text-[15px] font-medium text-neutral-900">{p.name}</span>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowShareModal(false)}
                    className="mt-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium w-full"
                  >
                    取消
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-6 py-4 rounded-xl flex flex-col items-center gap-2 z-50 backdrop-blur-sm"
          >
            {toastMsg === '支付成功！' ? (
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            ) : (
              <ShoppingCart className="w-8 h-8 text-white" />
            )}
            <span className="text-sm font-medium">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
