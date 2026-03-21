export interface Persona {
  id: string;
  name: string;
  description?: string;
  instructions: string;
  prompt?: string;
  prompts?: string[];
  avatarUrl?: string;
  avatarFrame?: string;
  avatarFrameScale?: number;
  avatarFrameX?: number;
  avatarFrameY?: number;
  avatarPendant?: string;
  autoReplyEnabled?: boolean;
  autoReplyContent?: string;
  patSuffix?: string;
  isSegmentResponse?: boolean;
  allowActiveMessaging?: boolean;
  mood?: string;
  context?: string;
  statusMessage?: string;
  isOffline?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    lastUpdated?: number;
  };
  hasBlockedUser?: boolean;
  isBlockedByUser?: boolean;
  aiPhoneSettings?: {
    wallpaper?: string;
    customIcons?: Record<string, string>;
    userRemark?: string;
  };
  diaryEntries?: DiaryEntry[];
}

export interface DiaryEntry {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  mood: string;
  moodLabel?: string;
  weather?: string;
}

export interface Transaction {
  id: string;
  type: 'top_up' | 'payment' | 'transfer' | 'red_packet';
  amount: number;
  description: string;
  timestamp: number;
}

export interface Sticker {
  id: string;
  name: string;
  url: string;
}

export interface TheaterScript {
  title: string;
  desc: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  avatarUrl?: string;
  avatarFrame?: string;
  avatarFrameScale?: number;
  avatarFrameX?: number;
  avatarFrameY?: number;
  avatarPendant?: string;
  autoReplyEnabled?: boolean;
  autoReplyContent?: string;
  anniversaryDate?: string;
  anniversaryTitle?: string;
  signature?: string;
  patSuffix?: string;
  persona?: string;
  balance?: number;
  transactions?: Transaction[];
  stickers?: Sticker[];
  theaterScripts?: TheaterScript[];
  personaSpecificSettings?: Record<string, { userPersona?: string }>;
}

export interface ApiSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  voiceModel?: string;
  voiceApiUrl?: string;
  voiceApiKey?: string;
  voiceParams?: string;
  asrModel?: string;
  asrApiUrl?: string;
  asrApiKey?: string;
  asrParams?: string;
  temperature: number;
  proactiveDelay?: number;
  momentsApiUrl?: string;
  momentsApiKey?: string;
  momentsModel?: string;
  autoPostMoments?: boolean;
  autoUpdateStatus?: boolean;
  isAutoXhsEnabled?: boolean;
  isProactiveMessagingEnabled?: boolean;
}

export interface Widget {
  id: string;
  type: 'anniversary' | 'image' | 'weather' | 'app' | 'dynamic-status' | string;
  appId?: string; // If type is 'app'
  x: number;
  y: number;
  w: number; // width in grid units
  h: number; // height in grid units
}

export interface HomeScreenPage {
  id: string;
  widgets: Widget[];
}

export interface HomeScreenLayout {
  pages: HomeScreenPage[];
}

export interface ThemeSettings {
  wallpaper: string;
  lockScreenWallpaper: string;
  momentsBg: string;
  chatBg?: string;
  chatBubbleUser?: string;
  chatBubbleAi?: string;
  chatBubbleUserCss?: string;
  chatBubbleAiCss?: string;
  iconBgColor: string;
  fontUrl: string;
  timeColor?: string;
  statusColor?: string;
  showStatusBar?: boolean;
  immersiveMode?: boolean;
  customIcons: Record<string, string>;
  weatherWidgetBg?: string;
  weatherLocation?: string;
  userBubbleColor?: string;
  aiBubbleColor?: string;
  userTextColor?: string;
  aiTextColor?: string;
  widgetImages?: {
    topRight?: string;
    bottomLeft?: string;
  };
  coupleSign?: {
    avatar1?: string;
    avatar2?: string;
    text1?: string;
    text2?: string;
    bgImage?: string;
    color?: string;
  };
  loveWidget?: {
    avatar1?: string;
    avatar2?: string;
    name1?: string;
    name2?: string;
    bgImage?: string;
    bottomMessage?: string;
    startDate?: string;
  };
  signature?: {
    avatar?: string;
    bgImage?: string;
  };
  memo?: {
    content?: string;
    color?: string;
  };
  musicPlayer?: {
    avatar1?: string;
    avatar2?: string;
    title?: string;
    musicUrl?: string;
    songName?: string;
    artist?: string;
  };
  profileCard?: {
    avatar?: string;
    bgImage?: string;
    name?: string;
    signature?: string;
    date?: string;
  };
  acrylicStand?: {
    leftImage?: string;
    centerImage?: string;
    rightImage?: string;
    bgImage?: string;
  };
  dynamicStatusBg?: string;
  notificationSound?: string;
  fingerprintStyle?: 'default' | 'square' | 'neon' | 'minimal' | 'glass' | 'star' | 'heart' | 'diamond' | 'cyberpunk' | 'liquid' | 'luxury' | 'biometric';
  innerVoiceCss?: string;
  innerVoiceBgColor?: string;
  innerVoiceTextColor?: string;
  globalCss?: string;
  layout?: HomeScreenLayout;
}

export interface WorldbookSettings {
  jailbreakPrompt: string;
  globalPrompt: string;
  jailbreakPrompts?: string[];
  globalPrompts?: string[];
  forceSegmentResponse?: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  cover: string;
  lyrics?: string;
  url?: string;
  duration?: number;
  source?: 'netease' | 'qq' | 'local';
  album?: string;
  playlistId?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface Message {
  id: string;
  personaId: string;
  groupId?: string;
  role: 'user' | 'model' | 'system';
  text: string;
  msgType?: 'text' | 'transfer' | 'music' | 'system' | 'xhsPost' | 'taobaoProduct' | 'relativeCard' | 'sticker' | 'thought' | 'listenTogether' | 'checkPhoneRequest' | 'image' | 'location';
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  amount?: number;
  transferNote?: string;
  transferStatus?: 'pending' | 'accepted' | 'rejected';
  checkPhoneStatus?: 'pending' | 'accepted' | 'rejected';
  sticker?: string;
  relativeCard?: {
    limit: number;
    status: 'active' | 'cancelled';
  };
  song?: Song;
  xhsPost?: XHSPost;
  taobaoProduct?: {
    id: string;
    name: string;
    price: number | string;
    image: string;
    sales?: string;
    shop?: string;
  };
  timestamp?: string;
  isRead?: boolean;
  readBy?: string[];
  status?: 'sent' | 'delivered' | 'read';
  createdAt?: number;
  isRecalled?: boolean;
  isFavorited?: boolean;
  quotedMessageId?: string;
  isRequest?: boolean;
  isRefund?: boolean;
  isReceived?: boolean;
  isInnerVoice?: boolean;
  innerVoice?: string;
  innerVoiceMood?: string;
  showInnerVoice?: boolean;
  theaterId?: string;
  hidden?: boolean;
  imageDescription?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
  replyToId?: string;
  createdAt?: number;
}

export interface Moment {
  id: string;
  authorId: string;
  text: string;
  timestamp: string;
  likedByIds: string[];
  comments: Comment[];
  song?: Song;
  xhsPost?: XHSPost;
  createdAt?: number;
  imageUrl?: string;
}

export interface XHSComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: number;
}

export interface XHSPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  images: string[];
  likes: number;
  comments: number;
  commentsList?: XHSComment[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: number;
}

export interface TreeHoleComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  likes: number;
  isLiked?: boolean;
  replyToName?: string;
  createdAt: number;
}

export interface TreeHolePost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorPersona?: string; // e.g. "INFP 天蝎座"
  content: string;
  likes: number;
  isLiked?: boolean;
  comments: TreeHoleComment[];
  createdAt: number;
}

export interface TreeHoleMessage {
  id: string;
  text: string;
  isMe: boolean;
  time: number;
  type?: 'text' | 'contact';
  contactInfo?: {
    id: string;
    name: string;
    avatar: string;
    intro: string;
  };
  replyTo?: {
    id: string;
    text: string;
    name: string;
  };
  isRecalled?: boolean;
}

export interface TreeHoleNotification {
  id: string;
  type: 'like' | 'comment';
  postId: string;
  authorName: string;
  authorAvatar: string;
  text?: string;
  createdAt: number;
  isRead: boolean;
}

export interface Order {
  id: string;
  restaurantName: string;
  restaurantImage: string;
  items: string[];
  totalPrice: number;
  status: 'preparing' | 'delivering' | 'arrived' | 'completed';
  orderTime: number;
  deliveryTime?: string;
  isAiOrder?: boolean;
  orderFor?: string; // 'me' or personaId
}

export interface CallRecord {
  id: string;
  personaId: string;
  type: 'incoming' | 'outgoing' | 'missed';
  startTime: number;
  duration: number; // in seconds
}

export interface GroupChat {
  id: string;
  name: string;
  avatarUrl?: string;
  memberIds: string[]; // Persona IDs
  ownerId: string; // User ID
  createdAt: number;
}

export type Screen = 'home' | 'chat' | 'persona' | 'api' | 'theme' | 'music' | 'xhs' | 'wallet' | 'treehole' | 'taobao' | 'fooddelivery' | 'bartender' | 'aiphones' | 'lovewidget' | 'photoalbum' | 'weather' | 'calendar' | 'notes' | 'calculator' | 'camera' | 'phone' | 'virtualmap';




