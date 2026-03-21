import { UserProfile } from "../types";

export const cleanContextMessage = (text: string) => {
  if (!text) return '';
  // Replace [STICKER: data:...] with [STICKER: image]
  let cleaned = text.replace(/\[STICKER:\s*data:[^\]]+\]/g, '[STICKER: image]');
  // Strip hidden control tags
  cleaned = cleaned.replace(/\|\|NEXT:[^|]+\|\|/g, '').trim();
  return cleaned;
};

export const processAiResponseParts = (responseText: string | { responseText: string }, userProfile: UserProfile, aiQuotedId?: string, isSegmentResponse?: boolean) => {
  let text = typeof responseText === 'string' ? responseText : (responseText?.responseText || '');
  
  // Extract and remove ||NEXT:xxx|| tags
  let nextTag: string | undefined;
  const nextTagRegex = /\|\|NEXT:(IMMEDIATE|SHORT|LONG|STOP)\|\|/i;
  const nextTagMatch = (text || '').match(nextTagRegex);
  if (nextTagMatch) {
    nextTag = nextTagMatch[0];
    text = text.replace(nextTagRegex, '').trim();
  }

  // Regexes for special tags
  const transferRegex = /[\[［【\(\{]\s*TRANSFER[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const requestRegex = /[\[［【\(\{]\s*REQUEST[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const refundRegex = /[\[［【\(\{]\s*REFUND[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const relativeCardRegex = /[\[［【\(\{]\s*RELATIVE_CARD[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const orderRegex = /[\[［【\(\{]\s*ORDER[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const stickerRegex = /[\[［【\(\{]\s*STICKER[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const musicRegex = /[\[［【\(\{]\s*MUSIC[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const recallRegex = /[\[［【\(\{]\s*RECALL\s*[\]］】\)\}]/i;
  const checkPhoneRegex = /[\[［【\(\{]\s*ACTION[:：]?\s*CHECK_PHONE\s*[\]］】\)\}]/i;
  const imageRegex = /[\[［【\(\{]\s*ACTION[:：]?\s*IMAGE[:：]?\s*([^\]］】\)\}]+)[\]］】\)\}]/i;
  const locationRegex = /[\[［【\(\{]\s*LOCATION[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const quoteRegex = /[\[［]QUOTE[:：]\s*([^\]］]+)[\]］]/i;

  // Split text by any of these tags, keeping the tags in the result
  const allTagsRegex = /([\[［【\(\{]\s*(?:TRANSFER|REQUEST|REFUND|RELATIVE_CARD|ORDER|STICKER|MUSIC|RECALL|QUOTE|ACTION[:：]?\s*CHECK_PHONE|ACTION[:：]?\s*IMAGE|LOCATION)[:：]?[^\]］】\)\}]+[\]］】\)\}]|\|\|\|)/gi;
  
  let rawParts = text.split(allTagsRegex).filter(p => p && p.trim() !== '|||');
  if (isSegmentResponse) {
    rawParts = rawParts.flatMap(p => p.split(/[\n\r]+|\\n/).filter(l => l.trim()));
  }
  const processedParts: any[] = [];
  let currentQuotedId = aiQuotedId;
  let orderItems: string[] = [];
  let shouldRecall = false;

  const parseAmountAndNote = (content: string) => {
    const parts = content.split(/[,，、]/);
    const amountStr = parts[0];
    const note = parts.slice(1).join(',').trim();
    const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''));
    return { amount, note: note || undefined };
  };

  for (const part of rawParts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    if (trimmedPart.match(transferRegex)) {
      const match = trimmedPart.match(transferRegex)!;
      const { amount, note } = parseAmountAndNote(match[1]);
      processedParts.push({ msgType: 'transfer', amount, transferNote: note });
    } else if (trimmedPart.match(requestRegex)) {
      const match = trimmedPart.match(requestRegex)!;
      const { amount, note } = parseAmountAndNote(match[1]);
      processedParts.push({ msgType: 'transfer', amount, transferNote: note, isRequest: true });
    } else if (trimmedPart.match(refundRegex)) {
      const match = trimmedPart.match(refundRegex)!;
      const { amount, note } = parseAmountAndNote(match[1]);
      processedParts.push({ msgType: 'transfer', amount, transferNote: note, isRefund: true });
    } else if (trimmedPart.match(relativeCardRegex)) {
      const match = trimmedPart.match(relativeCardRegex)!;
      processedParts.push({ msgType: 'relativeCard', relativeCard: { limit: parseFloat(match[1].replace(/[^\d.]/g, '')), status: 'active' } });
    } else if (trimmedPart.match(orderRegex)) {
      const match = trimmedPart.match(orderRegex)!;
      const items = match[1].split(/[,，、]/).map(s => s.trim()).filter(s => s);
      orderItems = [...orderItems, ...items];
    } else if (trimmedPart.match(stickerRegex)) {
      const match = trimmedPart.match(stickerRegex)!;
      const seed = match[1].trim();
      if (seed.startsWith('http') || seed.startsWith('data:')) {
           processedParts.push({ msgType: 'sticker', sticker: seed });
      } else {
           const customSticker = userProfile.stickers?.find(s => s.name === seed);
           processedParts.push({ msgType: 'sticker', sticker: customSticker ? customSticker.url : `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}` });
      }
    } else if (trimmedPart.match(musicRegex)) {
      const match = trimmedPart.match(musicRegex)!;
      processedParts.push({ msgType: 'text', text: `[播放音乐: ${match[1]}]` });
    } else if (trimmedPart.match(recallRegex)) {
      shouldRecall = true;
    } else if (trimmedPart.match(checkPhoneRegex)) {
      processedParts.push({ msgType: 'checkPhoneRequest', text: '[请求查看你的手机]', checkPhoneStatus: 'pending' });
    } else if (trimmedPart.match(imageRegex)) {
      const match = trimmedPart.match(imageRegex)!;
      const imageUrl = match[1].trim();
      processedParts.push({ msgType: 'image', imageUrl });
    } else if (trimmedPart.match(locationRegex)) {
      const match = trimmedPart.match(locationRegex)!;
      const locParts = match[1].split(/[,，、]/).map(s => s.trim());
      const address = locParts[0];
      const lat = parseFloat(locParts[1] || '0');
      const lng = parseFloat(locParts[2] || '0');
      processedParts.push({ msgType: 'location', location: { address, latitude: lat, longitude: lng } });
    } else if (trimmedPart.match(quoteRegex)) {
      const match = trimmedPart.match(quoteRegex)!;
      currentQuotedId = match[1].trim();
    } else {
      processedParts.push({ msgType: 'text', text: trimmedPart });
    }
  }

  return {
    parts: processedParts,
    quotedMessageId: currentQuotedId,
    orderItems,
    shouldRecall,
    checkPhoneRequest: processedParts.some(p => p.msgType === 'checkPhoneRequest'),
    nextTag
  };
};
