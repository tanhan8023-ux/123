import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, Star, Clock, MapPin, ShoppingCart, User, Home, List, Heart, Filter, ChevronRight, Plus, Minus, X, Phone, MessageSquare, ShoppingBag, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Persona, Order, UserProfile, ThemeSettings } from '../types';
import { generateId } from '../utils/id';

interface Restaurant {
  id: string;
  name: string;
  rating: number;
  sales: string;
  deliveryTime: string;
  deliveryFee: string;
  minOrder: number;
  image: string;
  tags: string[];
  discount?: string;
  menu: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
  sales: string;
  description?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

const RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: '蜜雪冰城 (旗舰店)',
    rating: 4.8,
    sales: '月售5000+',
    deliveryTime: '30分钟',
    deliveryFee: '免配送费',
    minOrder: 15,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&q=80',
    tags: ['奶茶果汁', '平价首选'],
    discount: '满20减5',
    menu: [
      { id: '101', name: '冰鲜柠檬水', price: 4, image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=200&q=80', sales: '月售1000+' },
      { id: '102', name: '珍珠奶茶', price: 7, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
      { id: '103', name: '满杯百香果', price: 8, image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
    ]
  },
  {
    id: '2',
    name: '麦当劳麦乐送',
    rating: 4.9,
    sales: '月售3000+',
    deliveryTime: '25分钟',
    deliveryFee: '配送费¥9',
    minOrder: 0,
    image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=200&q=80',
    tags: ['汉堡薯条', '西式快餐'],
    discount: '满50减10',
    menu: [
      { id: '201', name: '巨无霸套餐', price: 35, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=80', sales: '月售2000+' },
      { id: '202', name: '麦辣鸡腿堡', price: 22, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80', sales: '月售1500+' },
      { id: '203', name: '薯条(大)', price: 14, image: 'https://images.unsplash.com/photo-1573080496987-a199f8cd75c5?auto=format&fit=crop&w=200&q=80', sales: '月售3000+' },
    ]
  },
  {
    id: '3',
    name: '海底捞火锅外送',
    rating: 4.7,
    sales: '月售1000+',
    deliveryTime: '45分钟',
    deliveryFee: '免配送费',
    minOrder: 99,
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=200&q=80',
    tags: ['火锅', '品质服务'],
    discount: '满200减30',
    menu: [
      { id: '301', name: '单人火锅套餐', price: 128, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
      { id: '302', name: '招牌虾滑', price: 48, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
    ]
  },
  {
    id: '4',
    name: '塔斯汀中国汉堡',
    rating: 4.6,
    sales: '月售2000+',
    deliveryTime: '35分钟',
    deliveryFee: '配送费¥2',
    minOrder: 20,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80',
    tags: ['中式汉堡', '现烤堡胚'],
    discount: '满30减8',
    menu: [
      { id: '401', name: '香辣鸡腿堡', price: 16, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80', sales: '月售1000+' },
      { id: '402', name: '藤椒鸡腿堡', price: 18, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
    ]
  },
  {
    id: '5',
    name: '瑞幸咖啡 luckin coffee',
    rating: 4.8,
    sales: '月售8000+',
    deliveryTime: '20分钟',
    deliveryFee: '免配送费',
    minOrder: 20,
    image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&w=200&q=80',
    tags: ['咖啡饮品', '职场首选'],
    discount: '9.9元喝咖啡',
    menu: [
      { id: '501', name: '生椰拿铁', price: 18, image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&w=200&q=80', sales: '月售5000+' },
      { id: '502', name: '厚乳拿铁', price: 19, image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=200&q=80', sales: '月售3000+' },
    ]
  },
  {
    id: '6',
    name: '必胜客',
    rating: 4.7,
    sales: '月售1500+',
    deliveryTime: '40分钟',
    deliveryFee: '配送费¥5',
    minOrder: 30,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=200&q=80',
    tags: ['披萨', '西餐'],
    discount: '满100减20',
    menu: [
      { id: '601', name: '超级至尊披萨', price: 69, image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
      { id: '602', name: '经典意式肉酱面', price: 32, image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
    ]
  },
  {
    id: '7',
    name: '老北京炸酱面',
    rating: 4.5,
    sales: '月售2000+',
    deliveryTime: '30分钟',
    deliveryFee: '免配送费',
    minOrder: 15,
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=200&q=80',
    tags: ['面馆', '传统美食'],
    discount: '新客立减3元',
    menu: [
      { id: '701', name: '招牌炸酱面', price: 18, image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=200&q=80', sales: '月售1000+' },
      { id: '702', name: '老北京爆肚', price: 28, image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=200&q=80', sales: '月售300+' },
    ]
  },
  {
    id: '8',
    name: '争鲜回转寿司',
    rating: 4.8,
    sales: '月售1200+',
    deliveryTime: '45分钟',
    deliveryFee: '配送费¥6',
    minOrder: 50,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&q=80',
    tags: ['日料', '寿司'],
    discount: '满80减10',
    menu: [
      { id: '801', name: '三文鱼刺身', price: 38, image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
      { id: '802', name: '加州卷', price: 22, image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=200&q=80', sales: '月售400+' },
    ]
  },
  {
    id: '9',
    name: '木屋烧烤',
    rating: 4.7,
    sales: '月售3000+',
    deliveryTime: '50分钟',
    deliveryFee: '配送费¥5',
    minOrder: 40,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80',
    tags: ['烧烤', '夜宵'],
    discount: '满100减15',
    menu: [
      { id: '901', name: '烤羊肉串(10串)', price: 45, image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
      { id: '902', name: '烤生蚝(6只)', price: 38, image: 'https://images.unsplash.com/photo-1534938665420-4193effeacc4?auto=format&fit=crop&w=200&q=80', sales: '月售600+' },
    ]
  },
  {
    id: '10',
    name: '杨国福麻辣烫',
    rating: 4.6,
    sales: '月售4000+',
    deliveryTime: '35分钟',
    deliveryFee: '免配送费',
    minOrder: 20,
    image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=200&q=80',
    tags: ['麻辣烫', '小吃'],
    discount: '满30减5',
    menu: [
      { id: '1001', name: '自选麻辣烫套餐', price: 25, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=200&q=80', sales: '月售2000+' },
    ]
  },
  {
    id: '11',
    name: '浪漫满屋鲜花店',
    rating: 4.9,
    sales: '月售999+',
    deliveryTime: '40分钟',
    deliveryFee: '配送费¥5',
    minOrder: 50,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=200&q=80',
    tags: ['鲜花', '礼品'],
    discount: '满100减20',
    menu: [
      { id: '1101', name: '红玫瑰(11朵)', price: 128, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=200&q=80', sales: '月售200+' },
      { id: '1102', name: '向日葵花束', price: 88, image: 'https://images.unsplash.com/photo-1470509037663-253afd7f0f51?auto=format&fit=crop&w=200&q=80', sales: '月售100+' },
      { id: '1103', name: '百合花束', price: 158, image: 'https://images.unsplash.com/photo-1591206369811-4eeb2f04bc95?auto=format&fit=crop&w=200&q=80', sales: '月售50+' },
    ]
  },
  {
    id: '12',
    name: '叮当快药 (24小时)',
    rating: 4.8,
    sales: '月售2000+',
    deliveryTime: '20分钟',
    deliveryFee: '免配送费',
    minOrder: 0,
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=200&q=80',
    tags: ['买药', '药店'],
    discount: '新客立减5元',
    menu: [
      { id: '1201', name: '感冒灵颗粒', price: 15, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
      { id: '1202', name: '布洛芬缓释胶囊', price: 25, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=200&q=80', sales: '月售300+' },
      { id: '1203', name: '维生素C泡腾片', price: 19.9, image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=200&q=80', sales: '月售1000+' },
    ]
  },
  {
    id: '13',
    name: '百果园 (鲜果专卖)',
    rating: 4.7,
    sales: '月售3000+',
    deliveryTime: '35分钟',
    deliveryFee: '配送费¥3',
    minOrder: 29,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=200&q=80',
    tags: ['水果', '生鲜'],
    discount: '满59减10',
    menu: [
      { id: '1301', name: 'A级车厘子(250g)', price: 39.9, image: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
      { id: '1302', name: '巨峰葡萄(500g)', price: 19.9, image: 'https://images.unsplash.com/photo-1537640538965-17565236b519?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
      { id: '1303', name: '海南金钻凤梨', price: 25, image: 'https://images.unsplash.com/photo-1589820296156-2454bb8a6d54?auto=format&fit=crop&w=200&q=80', sales: '月售300+' },
    ]
  },
  {
    id: '14',
    name: '盒马鲜生 (生鲜超市)',
    rating: 4.9,
    sales: '月售8000+',
    deliveryTime: '30分钟',
    deliveryFee: '免配送费',
    minOrder: 39,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
    tags: ['超市', '蔬菜', '生鲜'],
    discount: '会员88折',
    menu: [
      { id: '1401', name: '日日鲜猪肉(300g)', price: 18.9, image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=200&q=80', sales: '月售1000+' },
      { id: '1402', name: '有机青菜(250g)', price: 5.9, image: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&w=200&q=80', sales: '月售2000+' },
      { id: '1403', name: '鲜活基围虾(500g)', price: 45, image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=200&q=80', sales: '月售500+' },
    ]
  },
  {
    id: '15',
    name: '满记甜品',
    rating: 4.6,
    sales: '月售1000+',
    deliveryTime: '40分钟',
    deliveryFee: '配送费¥4',
    minOrder: 30,
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=200&q=80',
    tags: ['甜品', '下午茶'],
    discount: '满50减8',
    menu: [
      { id: '1501', name: '杨枝甘露', price: 28, image: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=200&q=80', sales: '月售800+' },
      { id: '1502', name: '芒果班戟', price: 18, image: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=200&q=80', sales: '月售600+' },
    ]
  },
  {
    id: '16',
    name: '东北饺子馆',
    rating: 4.5,
    sales: '月售1500+',
    deliveryTime: '35分钟',
    deliveryFee: '配送费¥2',
    minOrder: 20,
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=200&q=80',
    tags: ['美食', '面食'],
    discount: '满30减3',
    menu: [
      { id: '1601', name: '猪肉白菜水饺(15个)', price: 22, image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c423c?auto=format&fit=crop&w=200&q=80', sales: '月售1000+' },
      { id: '1602', name: '酱大骨', price: 38, image: 'https://images.unsplash.com/photo-1544025162-d76690b67f61?auto=format&fit=crop&w=200&q=80', sales: '月售200+' },
    ]
  }
];

const CATEGORIES = [
  { name: '美食', icon: '🍔', color: 'bg-orange-100' },
  { name: '超市', icon: '🛒', color: 'bg-blue-100' },
  { name: '水果', icon: '🍎', color: 'bg-green-100' },
  { name: '买药', icon: '💊', color: 'bg-red-100' },
  { name: '甜品', icon: '🍰', color: 'bg-pink-100' },
  { name: '蔬菜', icon: '🥬', color: 'bg-emerald-100' },
  { name: '鲜花', icon: '💐', color: 'bg-purple-100' },
  { name: '跑腿', icon: '🏃', color: 'bg-yellow-100' },
];

export function FoodDeliveryScreen({ onBack, personas, onOrder, onDeleteOrder, orders, userProfile, setUserProfile, theme }: { 
  onBack: () => void;
  personas: Persona[];
  onOrder: (items: string[], forWho: string) => void;
  onDeleteOrder: (orderId: string) => void;
  orders: Order[];
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  theme: ThemeSettings;
}) {
  const [activeTab, setActiveTab] = useState<'home' | 'order' | 'mine'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const [orderFor, setOrderFor] = useState<'me' | string>('me');

  // User Profile State (Local state for editing, but display from props)
  const [username, setUsername] = useState(userProfile.name || '美食爱好者');
  const [userId, setUserId] = useState('fd_user_888');
  const [avatar, setAvatar] = useState<string | null>(userProfile.avatarUrl || null);
  const [address, setAddress] = useState('杭州市西湖区...');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBannerImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    
    const total = cartTotal;
    // Check balance
    if ((userProfile.balance || 0) < total) {
      alert('余额不足，请前往钱包充值');
      return;
    }

    // Deduct balance
    setUserProfile(prev => ({
      ...prev,
      balance: (prev.balance || 0) - total,
      transactions: [
        {
          id: generateId(),
          type: 'payment',
          amount: total,
          description: `外卖订单-${selectedRestaurant?.name || '美食'}`,
          timestamp: Date.now()
        },
        ...(prev.transactions || [])
      ]
    }));

    onOrder(cart.map(i => `${i.name} x${i.quantity}`), orderFor);

    setSelectedRestaurant(null);
    setActiveTab('order');
    setCart([]);
    setShowCart(false);
  };

  if (selectedRestaurant) {
    return (
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
        {/* Restaurant Header */}
        <div className="relative h-32 bg-neutral-800 shrink-0">
          <img src={selectedRestaurant.image} className="w-full h-full object-cover opacity-60" />
          <button onClick={() => setSelectedRestaurant(null)} className="absolute top-12 left-4 text-white p-2 bg-black/20 rounded-full backdrop-blur-sm">
            <ChevronLeft size={24} />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <h2 className="text-xl font-bold shadow-sm">{selectedRestaurant.name}</h2>
            <div className="flex items-center gap-2 text-xs opacity-90 mt-1">
              <span>{selectedRestaurant.deliveryTime}</span>
              <span>|</span>
              <span>{selectedRestaurant.sales}</span>
            </div>
          </div>
        </div>

        {/* Menu List */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-6"
          style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        >
          <div>
            <h3 className="font-bold text-lg mb-4">热销推荐</h3>
            <div className="space-y-4">
              {selectedRestaurant.menu.map(item => (
                <div key={item.id} className="flex gap-3">
                  <img src={item.image} className="w-24 h-24 rounded-lg object-cover bg-neutral-100" />
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="font-bold text-neutral-900">{item.name}</h4>
                      <p className="text-xs text-neutral-500 mt-1">{item.sales}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-red-500">¥{item.price}</span>
                      <div className="flex items-center gap-3">
                        {cart.find(i => i.id === item.id) && (
                          <>
                            <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center text-neutral-500">
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-medium w-4 text-center">{cart.find(i => i.id === item.id)?.quantity}</span>
                          </>
                        )}
                        <button onClick={() => addToCart(item)} className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Bar */}
        {cartCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <div className="bg-neutral-900 text-white rounded-full p-3 flex items-center justify-between shadow-lg" onClick={() => setShowCart(!showCart)}>
              <div className="flex items-center gap-3 pl-2">
                <div className="relative">
                  <ShoppingCart size={24} />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg">¥{cartTotal}</span>
                  <span className="text-[10px] opacity-70">预估配送费 ¥{selectedRestaurant.deliveryFee.replace(/[^0-9]/g, '') || '0'}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <select 
                  value={orderFor} 
                  onChange={(e) => setOrderFor(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-neutral-800 text-white text-xs rounded-lg px-2 py-1 outline-none border border-neutral-700"
                >
                  <option value="me">给自己点</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.id}>给{p.name}点</option>
                  ))}
                </select>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handlePlaceOrder(); 
                  }}
                  className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm"
                >
                  去结算
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#f4f4f4] flex flex-col overflow-hidden">
      {/* Header */}
      <div 
        className={`bg-white px-4 pb-3 shrink-0`}
        style={{ paddingTop: theme.showStatusBar !== false ? 'calc(3.5rem + env(safe-area-inset-top))' : 'calc(3rem + env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-neutral-800 font-bold flex-1 mr-4">
            <MapPin size={18} className="text-blue-500 shrink-0" />
            {isEditingAddress ? (
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={() => setIsEditingAddress(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingAddress(false)}
                autoFocus
                className="text-[15px] bg-neutral-100 px-2 py-1 rounded w-full outline-none border border-blue-500"
              />
            ) : (
              <div 
                className="flex items-center gap-1 cursor-pointer active:opacity-70"
                onClick={() => setIsEditingAddress(true)}
              >
                <span className="text-[15px] truncate max-w-[200px]">{address}</span>
                <ChevronRight size={14} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
            <Search size={16} />
          </div>
          <input 
            type="text"
            placeholder="想吃什么？搜索商家、商品"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-neutral-100 rounded-full pl-10 pr-4 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'home' && (
          <div className="p-4 space-y-4">
            {selectedCategory ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setSelectedCategory(null)} className="p-1 rounded-full bg-neutral-100">
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-lg font-bold">{selectedCategory}</h2>
                </div>
                {/* Filtered Restaurant List */}
                <div className="space-y-3">
                  {RESTAURANTS.filter(r => {
                    if (selectedCategory === '美食') return true;
                    const tagMap: Record<string, string[]> = {
                      '甜品': ['奶茶果汁', '咖啡饮品', '甜品'],
                      '超市': ['超市', '便利店'],
                      '买药': ['买药', '药店'],
                      '鲜花': ['鲜花'],
                      '蔬菜': ['蔬菜', '生鲜'],
                      '水果': ['水果'],
                      '跑腿': ['跑腿']
                    };
                    const targetTags = tagMap[selectedCategory] || [];
                    return r.tags.some(t => targetTags.includes(t)) || r.name.includes(selectedCategory);
                  }).length > 0 ? (
                    RESTAURANTS.filter(r => {
                      if (selectedCategory === '美食') return true;
                      const tagMap: Record<string, string[]> = {
                        '甜品': ['奶茶果汁', '咖啡饮品', '甜品'],
                        '超市': ['超市', '便利店'],
                        '买药': ['买药', '药店'],
                        '鲜花': ['鲜花'],
                        '蔬菜': ['蔬菜', '生鲜'],
                        '水果': ['水果'],
                        '跑腿': ['跑腿']
                      };
                      const targetTags = tagMap[selectedCategory] || [];
                      return r.tags.some(t => targetTags.includes(t)) || r.name.includes(selectedCategory);
                    }).map((res) => (
                      <motion.div 
                        key={res.id}
                        layoutId={`restaurant-${res.id}`}
                        className="bg-white rounded-xl p-3 shadow-sm flex gap-3 active:scale-[0.98] transition-transform"
                        onClick={() => setSelectedRestaurant(res)}
                      >
                        <div className="relative w-20 h-20 shrink-0">
                          <img src={res.image} className="w-full h-full object-cover rounded-lg" />
                          {res.discount && (
                            <div className="absolute top-0 left-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-tl-lg rounded-br-lg font-medium">
                              {res.discount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-neutral-800 text-[15px] truncate">{res.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5 text-orange-500 font-bold text-xs">
                              <Star size={12} fill="currentColor" />
                              <span>{res.rating}</span>
                            </div>
                            <span className="text-xs text-neutral-400">{res.sales}</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                            <div className="flex gap-2">
                              <span>起送 ¥{res.minOrder}</span>
                              <span>{res.deliveryFee}</span>
                            </div>
                            <div className="flex gap-2">
                              <span>{res.deliveryTime}</span>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {res.tags.map((tag, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                      <ShoppingBag size={48} strokeWidth={1} />
                      <p className="mt-2 text-sm">暂无该分类商家</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
            {/* Recent Order Status Bar */}
            {orders.length > 0 && orders[0].status !== 'completed' && (
              <div 
                className="bg-white rounded-2xl p-3 flex items-center justify-between shadow-sm border border-blue-50 active:bg-neutral-50 cursor-pointer"
                onClick={() => setActiveTab('order')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-neutral-800">
                      {orders[0].status === 'preparing' ? '商家正在准备中...' : 
                       orders[0].status === 'delivering' ? '骑手正在配送中...' : '外卖已送达，请取餐'}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {orders[0].restaurantName} · {orders[0].items.join('、')}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-300" />
              </div>
            )}

            {/* Categories Grid */}
            <div className="grid grid-cols-4 gap-y-4 bg-white rounded-2xl p-4 shadow-sm">
              {CATEGORIES.map((cat, i) => (
                <div 
                  key={i} 
                  className="flex flex-col items-center gap-1 cursor-pointer"
                  onClick={() => setSelectedCategory(cat.name)}
                >
                  <div className={`w-12 h-12 ${cat.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm active:scale-95 transition-transform`}>
                    {cat.icon}
                  </div>
                  <span className="text-[11px] text-neutral-600 font-medium">{cat.name}</span>
                </div>
              ))}
            </div>

            {/* Banner */}
            <div 
              className="w-full h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white shadow-md relative overflow-hidden cursor-pointer"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerImage ? (
                <img src={bannerImage} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
              ) : (
                <>
                  <div className="relative z-10">
                    <div className="text-lg font-bold italic">超级会员</div>
                    <div className="text-xs opacity-90">下单立减 · 专享红包</div>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full blur-2xl absolute -right-4 -top-4"></div>
                  <button className="relative z-10 bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm">立即开通</button>
                </>
              )}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={bannerInputRef}
                onChange={handleBannerUpload}
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
              {['综合排序', '销量最高', '距离最近', '筛选'].map((f, i) => (
                <span key={i} className={`text-[13px] whitespace-nowrap ${i === 0 ? 'text-blue-600 font-bold' : 'text-neutral-500'}`}>
                  {f}
                  {f === '筛选' && <Filter size={12} className="inline ml-1" />}
                </span>
              ))}
            </div>

            {/* Restaurant List */}
            <div className="space-y-3">
              {RESTAURANTS.filter(r => r.name.includes(searchQuery)).map((res) => (
                <motion.div 
                  key={res.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm active:bg-neutral-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRestaurant(res)}
                >
                  <img src={res.image} alt={res.name} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[15px] font-bold text-neutral-800 truncate">{res.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-0.5 text-orange-500 font-bold text-xs">
                          <Star size={12} fill="currentColor" />
                          <span>{res.rating}</span>
                        </div>
                        <span className="text-[11px] text-neutral-400">{res.sales}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-500">
                        <div className="flex items-center gap-2">
                          <span>¥{res.minOrder}起送</span>
                          <span className="w-[1px] h-2 bg-neutral-200"></span>
                          <span>{res.deliveryFee}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={10} />
                          <span>{res.deliveryTime}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      {res.tags.map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded leading-none">
                          {tag}
                        </span>
                      ))}
                      {res.discount && (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] rounded border border-red-100 leading-none">
                          {res.discount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    )}

        {activeTab === 'order' && (
          <div 
            className="p-4 h-full overflow-y-auto"
            style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          >
            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400 space-y-2">
                <ShoppingCart size={48} strokeWidth={1.5} />
                <p className="text-sm">暂无订单</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-bold mb-4">我的订单</h2>
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-50">
                      <div className="flex items-center gap-3">
                        <img src={order.restaurantImage} className="w-8 h-8 rounded-lg object-cover bg-neutral-100" />
                        <span className="font-bold text-neutral-800 text-sm">{order.restaurantName}</span>
                      </div>
                      <span className="text-xs font-medium text-blue-500">
                        {order.status === 'preparing' ? '商家准备中' : 
                         order.status === 'delivering' ? '骑手配送中' : '已送达'}
                      </span>
                    </div>
                    
                    <div className="pl-11">
                      <div className="text-sm text-neutral-600 mb-3 line-clamp-2">
                        {order.items.join('、')}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">
                          {new Date(order.orderTime).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex gap-2">
                          {order.isAiOrder && (
                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-medium border border-blue-100">
                              AI投喂
                            </span>
                          )}
                          {order.orderFor && order.orderFor !== 'me' && (
                            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-medium border border-orange-100">
                              给TA点
                            </span>
                          )}
                          <button 
                            onClick={() => onDeleteOrder(order.id)}
                            className="px-3 py-1 rounded-full border border-neutral-200 text-xs text-red-500 active:bg-red-50"
                          >
                            删除
                          </button>
                          <button className="px-3 py-1 rounded-full border border-neutral-200 text-xs text-neutral-600">
                            再来一单
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mine' && (
          <div className="p-4 space-y-4">
            <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm relative">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden bg-blue-100 text-blue-500 shrink-0 relative cursor-pointer"
                onClick={() => isEditingProfile && avatarInputRef.current?.click()}
              >
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} />
                )}
                {isEditingProfile && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                    <Plus size={20} />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                {isEditingProfile ? (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="text-lg font-bold text-neutral-800 w-full bg-neutral-100 px-2 py-1 rounded border border-blue-500 outline-none"
                      placeholder="用户名"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-neutral-400 shrink-0">账号:</span>
                      <input 
                        type="text" 
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="text-xs text-neutral-600 w-full bg-neutral-100 px-2 py-1 rounded border border-blue-500 outline-none"
                        placeholder="ID"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-neutral-800 truncate">{username}</h2>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">账号: {userId}</p>
                  </>
                )}
              </div>
              <button 
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${isEditingProfile ? 'bg-blue-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}
              >
                {isEditingProfile ? '保存' : '编辑'}
              </button>
            </div>
            
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-neutral-50">
              {['我的收藏', '我的评价', '我的地址', '红包卡券', '客服中心'].map((item, i) => (
                <div key={i} className="p-4 flex items-center justify-between active:bg-neutral-50 transition-colors">
                  <span className="text-[15px] text-neutral-700">{item}</span>
                  <ChevronRight size={16} className="text-neutral-300" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div 
        className="bg-white border-t border-neutral-100 px-6 py-2 flex items-center justify-around shrink-0"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-blue-500' : 'text-neutral-400'}`}
        >
          <Home size={22} fill={activeTab === 'home' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-medium">首页</span>
        </button>
        <button 
          onClick={() => setActiveTab('order')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'order' ? 'text-blue-500' : 'text-neutral-400'}`}
        >
          <List size={22} />
          <span className="text-[10px] font-medium">订单</span>
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'mine' ? 'text-blue-500' : 'text-neutral-400'}`}
        >
          <User size={22} fill={activeTab === 'mine' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-medium">我的</span>
        </button>
      </div>
    </div>
  );
}
