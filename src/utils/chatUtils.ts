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
  const imageRegex = /[\[［【\(\{]\s*ACTION[:：]?\s*IMAGE[:：]?\s*([^\]］】\)\}]+)[\]］】\)\}]/i;
  const checkPhoneRegex = /[\[［【\(\{]\s*ACTION[:：]?\s*CHECK_PHONE\s*[\]］】\)\}]/i;
  const locationRegex = /[\[［【\(\{]\s*LOCATION[:：]?\s*([^\]］】\)\}]+)\s*[\]］】\)\}]/i;
  const quoteRegex = /[\[［]QUOTE[:：]\s*([^\]］]+)[\]］]/i;

  // Split text by any of these tags, keeping the tags in the result
  const allTagsRegex = /([\[［【\(\{]\s*(?:TRANSFER|REQUEST|REFUND|RELATIVE_CARD|ORDER|STICKER|MUSIC|RECALL|QUOTE|ACTION[:：]?\s*(?:IMAGE|CHECK_PHONE)|LOCATION)[:：]?[^\]］】\)\}]+[\]］】\)\}]|\|\|\|)/gi;
  
  let rawParts = text.split(allTagsRegex).filter(p => p && p.trim() !== '|||');
  if (isSegmentResponse) {
    rawParts = rawParts.flatMap(p => p.split(/[\n\r]+|\\n/).filter(l => l.trim()));
  }
  const processedParts: any[] = [];
  let currentQuotedId = aiQuotedId;
  let orderItems: string[] = [];
  let shouldRecall = false;
  let checkPhoneRequest = false;

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
    } else if (trimmedPart.match(imageRegex)) {
      const match = trimmedPart.match(imageRegex)!;
      const imageUrl = match[1].trim();
      processedParts.push({ msgType: 'sticker', sticker: imageUrl });
    } else if (trimmedPart.match(checkPhoneRegex)) {
      processedParts.push({ msgType: 'checkPhoneRequest' });
    } else if (trimmedPart.match(locationRegex)) {
      const match = trimmedPart.match(locationRegex)!;
      const content = match[1].trim();
      const parts = content.split(/[,，、]/);
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const address = parts.slice(2).join(',').trim();
      processedParts.push({ 
        msgType: 'location', 
        location: { latitude: lat, longitude: lng, address: address || undefined } 
      });
    } else if (trimmedPart.match(quoteRegex)) {
      const match = trimmedPart.match(quoteRegex)!;
      currentQuotedId = match[1].trim();
    } else {
      // Clean any stray ID tags or other markers
      let cleanText = trimmedPart.replace(/[\[［]ID[:：]\s*[^\]］]+[\]］]/gi, '').trim();
      
      if (userProfile.enableActionDescriptions === false) {
        cleanText = cleanText.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
      }
      
      if (cleanText) {
        if (isSegmentResponse) {
          // Improved segmentation: split by lines first, then by sentences while respecting quotes and parentheses
          const lines = cleanText.split(/[\n\r]+|\\n/).filter(l => l.trim());
          for (const line of lines) {
            // Split by sentence-ending punctuation, but try to keep them together if they are part of a formatted block
            // This is a simplified approach: we split by punctuation but then merge back if we detect unbalanced quotes/parentheses
            const segments = line.split(/([。！？!?]+|(?:\.\.\.+))/).filter((s: string) => s.trim().length > 0);
            let buffer = "";
            for (let i = 0; i < segments.length; i++) {
              const segment = segments[i];
              buffer += segment;
              
              // Check if buffer has balanced parentheses and quotes
              const openParen = (buffer.match(/\(/g) || []).length;
              const closeParen = (buffer.match(/\)/g) || []).length;
              const openQuote = (buffer.match(/[“"「]/g) || []).length;
              const closeQuote = (buffer.match(/[”"」]/g) || []).length;
              
              const isBalanced = openParen === closeParen && openQuote === closeQuote;
              const nextSegment = segments[i + 1];
              const nextIsPunctuation = nextSegment && /^[。！？!?.]+$/.test(nextSegment);
              
              if ((isBalanced && !nextIsPunctuation) || (i === segments.length - 1)) {
                if (buffer.trim()) {
                  processedParts.push({ msgType: 'text', text: buffer.trim() });
                }
                buffer = "";
              }
            }
            if (buffer) {
              processedParts.push({ msgType: 'text', text: buffer.trim() });
            }
          }
        } else {
          processedParts.push({ msgType: 'text', text: cleanText });
        }
      }
    }
  }

  // If no parts were created (e.g. empty response), add a fallback
  if (processedParts.length === 0) {
    processedParts.push({ msgType: 'text', text: '...' });
  }

  return {
    parts: processedParts,
    quotedMessageId: currentQuotedId,
    orderItems,
    shouldRecall,
    checkPhoneRequest,
    nextTag
  };
};
