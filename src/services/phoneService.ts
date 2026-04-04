import { Persona, Message, UserProfile, Order, Moment } from "../types";

export function getPhoneData(
  personas: Persona[],
  messages: Message[],
  userProfile: UserProfile,
  orders: Order[],
  moments: Moment[],
  currentPersonaId: string
): string {
  const otherPersonas = personas.filter(p => p.id !== currentPersonaId);
  
  // 1. Recent chats with other personas (limited to last 3 messages)
  const otherChats = otherPersonas.map(p => {
    const lastMsgs = messages
      .filter(m => m.personaId === p.id && !m.groupId)
      .slice(-3)
      .map(m => `${m.role === 'user' ? '用户' : p.name}: ${m.text.slice(0, 50)}${m.text.length > 50 ? '...' : ''}`)
      .join('\n');
    return lastMsgs ? `【与 ${p.name} 的聊天记录】\n${lastMsgs}` : null;
  }).filter(Boolean).join('\n\n');

  // 2. Wallet transactions (limited to last 5)
  const recentTransactions = (userProfile.transactions || [])
    .slice(0, 5)
    .map(t => {
      const time = new Date(t.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      return `[${time}] ${t.description}: ${t.type === 'payment' || t.type === 'transfer' ? '-' : '+'}${t.amount}元`;
    })
    .join('\n');

  // 3. Food delivery (limited to last 3)
  const recentOrders = orders
    .slice(0, 3)
    .map(o => `[${new Date(o.orderTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}] ${o.restaurantName}: ${o.items.join(', ')}`)
    .join('\n');

  // 4. Moments (limited to last 3)
  const recentMoments = moments
    .slice(0, 3)
    .map(m => {
      const author = personas.find(p => p.id === m.authorId)?.name || '我';
      return `[朋友圈] ${author}: ${m.text.slice(0, 30)}${m.text.length > 30 ? '...' : ''}`;
    })
    .join('\n');

  return `
【手机实时数据快照 - 严禁幻视】
1. 通讯录（其他联系人）：${otherPersonas.map(p => p.name).join(', ')}
2. 钱包余额：${userProfile.balance || 0}元
3. 最近交易记录：
${recentTransactions || '无记录'}
4. 最近外卖订单：
${recentOrders || '无记录'}
5. 朋友圈动态：
${recentMoments || '无记录'}
6. 与其他人的私密聊天摘要：
${otherChats || '无其他聊天记录'}
`.trim();
}
