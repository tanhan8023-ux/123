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
  
  // 1. Recent chats with other personas
  const otherChats = otherPersonas.map(p => {
    const lastMsgs = messages
      .filter(m => m.personaId === p.id && !m.groupId)
      .slice(-5)
      .map(m => `${m.role === 'user' ? '用户' : p.name}: ${m.text}`)
      .join('\n');
    return lastMsgs ? `【与 ${p.name} 的聊天记录】\n${lastMsgs}` : null;
  }).filter(Boolean).join('\n\n');

  // 2. Wallet transactions
  const recentTransactions = (userProfile.transactions || [])
    .slice(0, 10)
    .map(t => {
      const time = new Date(t.timestamp).toLocaleString('zh-CN');
      return `[${time}] ${t.description}: ${t.type === 'payment' || t.type === 'transfer' ? '-' : '+'}${t.amount}元`;
    })
    .join('\n');

  // 3. Food delivery
  const recentOrders = orders
    .slice(0, 5)
    .map(o => `[${new Date(o.orderTime).toLocaleString('zh-CN')}] ${o.restaurantName}: ${o.items.join(', ')} (¥${o.totalPrice})`)
    .join('\n');

  // 4. Moments
  const recentMoments = moments
    .slice(0, 5)
    .map(m => {
      const author = personas.find(p => p.id === m.authorId)?.name || '我';
      return `[朋友圈] ${author}: ${m.text} (${m.likedByIds.length}个赞, ${m.comments.length}条评论)`;
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
