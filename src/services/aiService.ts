import React from "react";
import { GoogleGenAI } from "@google/genai";
import { Persona, ApiSettings, WorldbookSettings, UserProfile } from "../types";
import { memoryService } from "./memoryService";

// 1. 生成歌词逻辑
export async function generateLyrics(
  title: string,
  artist: string,
  apiSettings: ApiSettings,
  worldbook: WorldbookSettings,
  userProfile: UserProfile,
  aiRef: React.MutableRefObject<GoogleGenAI | null>,
  forceModel?: string
): Promise<string> {
  try {
    let exactUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}`;
    if (artist && artist !== "未知艺术家") {
      exactUrl += `&artist_name=${encodeURIComponent(artist)}`;
    }
    const exactRes = await withRetry(() => fetch(exactUrl));
    if (exactRes.ok) {
      const data = await exactRes.json();
      if (data && data.syncedLyrics) return data.syncedLyrics;
    }
    const searchQuery = artist && artist !== "未知艺术家" ? `${title} ${artist}` : title;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
    const searchRes = await withRetry(() => fetch(searchUrl));
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (Array.isArray(searchData) && searchData.length > 0) {
        const bestMatch = searchData.find((d: any) => d.syncedLyrics);
        if (bestMatch) return bestMatch.syncedLyrics;
      }
    }
  } catch (error) {
    console.error("LRCLIB API error:", error);
  }

  const artistText = artist && artist !== "未知艺术家" ? `，歌手为“${artist}”` : '';
  const prompt = `请在互联网上精准搜索歌曲《${title}》${artistText} 的歌词。要求返回 LRC 格式。`;
  
  const { responseText } = await fetchAiResponse(
    prompt, [], { id: 'lyrics_generator', name: 'Lyrics Generator', instructions: 'You are a lyrics generator.' } as any,
    apiSettings, worldbook, userProfile, aiRef, false, "", forceModel || "gemini-3-flash-preview",
    undefined, undefined, undefined, [{ googleSearch: {} }], true
  );
  
  return responseText || "[00:00.00] 抱歉，未找到该歌曲的歌词。";
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 6, initialDelay = 2000): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = (error?.message || error?.toString() || "").toLowerCase();
      const isRateLimit = errorMsg.includes('rate limit') || 
                          errorMsg.includes('quota') ||
                          errorMsg.includes('429') ||
                          errorMsg.includes('exhausted') ||
                          error?.status === 429 ||
                          (error?.response?.status === 429);
      
      const isNetworkError = errorMsg.includes('failed to fetch') || 
                             errorMsg.includes('network error') ||
                             errorMsg.includes('aborted') || 
                             errorMsg.includes('timeout') ||
                             [500, 502, 503, 504].includes(error?.status) ||
                             [500, 502, 503, 504].includes(error?.response?.status);

      if ((isRateLimit || isNetworkError) && retries < maxRetries) {
        retries++;
        // Exponential backoff with jitter
        // For rate limits, we use a longer initial delay
        const baseDelay = isRateLimit ? Math.max(initialDelay, 3000) : 1000; // Shorter delay for network errors
        // Cap network error retries to 2 to avoid long "typing..." hangs on CORS issues
        if (isNetworkError && retries > 2) {
           throw new Error("网络请求失败 (可能由于跨域 CORS 限制或网络不通)。如果您在本地文件(file://)中运行，请尝试使用支持跨域的 API 代理，或部署到服务器上。");
        }
        const delay = Math.min(baseDelay * Math.pow(2, retries - 1), 20000) + Math.random() * 1000;
        const reason = isRateLimit ? "Rate limit exceeded" : "Network error/Server error";
        console.warn(`${reason}. Retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isRateLimit) {
        throw new Error("AI 响应过快，请稍后再试 (Rate limit exceeded)");
      }
      if (isNetworkError) {
        throw new Error("网络请求失败 (可能由于跨域 CORS 限制或网络不通)。如果您在本地文件(file://)中运行，请尝试使用支持跨域的 API 代理，或部署到服务器上。");
      }
      
      throw error;
    }
  }
}

async function callAi(params: {
  apiKey: string;
  apiUrl?: string;
  model: string;
  systemInstruction?: string;
  messages: { role: string; content: any }[];
  temperature?: number;
  aiRef?: any;
  signal?: AbortSignal;
}) {
  if (params.apiUrl) {
    let endpoint = params.apiUrl.trim();
    if (endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1);
    }
    // 自动补全 OpenAI 兼容端点
    if (!endpoint.endsWith('/chat/completions') && !endpoint.endsWith('/v1/messages')) {
      endpoint = `${endpoint}/chat/completions`;
    }

    const rawMessages = params.messages.map(m => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content || " "
    }));

    // Merge consecutive messages with the same role
    const messages: any[] = [];
    for (const msg of rawMessages) {
      if (messages.length > 0 && messages[messages.length - 1].role === msg.role) {
        const lastMsg = messages[messages.length - 1];
        if (typeof lastMsg.content === 'string' && typeof msg.content === 'string') {
          lastMsg.content += '\n' + msg.content;
        } else {
          const lastContentArray = Array.isArray(lastMsg.content) ? lastMsg.content : [{ type: 'text', text: lastMsg.content }];
          const newContentArray = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
          lastMsg.content = [...lastContentArray, ...newContentArray];
        }
      } else {
        messages.push({ ...msg });
      }
    }

    if (params.systemInstruction) {
      messages.unshift({ role: 'system', content: params.systemInstruction });
    }
    const response = await withRetry(async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${params.apiKey}`
          },
          body: JSON.stringify({
            model: params.model,
            messages,
            temperature: params.temperature,
            stream: false
          }),
          signal: params.signal || controller.signal
        });
        clearTimeout(id);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const err = new Error(errorData.error?.message || `API Error: ${res.status}`);
          (err as any).status = res.status;
          throw err;
        }
        return res;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } else {
    const ai = params.aiRef?.current || new GoogleGenAI({ apiKey: params.apiKey });
    const rawContents = params.messages.map(m => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(m.content) ? m.content.map(c => {
        if (typeof c === 'object' && c.type === 'image_url') {
          const mimeMatch = c.image_url.url.match(/data:(image\/[^;]+);base64,/);
          return { inlineData: { mimeType: mimeMatch?.[1] || 'image/png', data: c.image_url.url.split(',')[1] } };
        }
        return { text: typeof c === 'string' ? (c || " ") : JSON.stringify(c) };
      }) : [{ text: m.content || " " }]
    }));

    // Merge consecutive contents with the same role
    const contents: any[] = [];
    for (const content of rawContents) {
      if (contents.length > 0 && contents[contents.length - 1].role === content.role) {
        contents[contents.length - 1].parts.push(...content.parts);
      } else {
        contents.push({ ...content, parts: [...content.parts] });
      }
    }
    
    const genAiPromise = withRetry(() => ai.models.generateContent({
      model: params.model,
      contents,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature,
        maxOutputTokens: 2048,
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
        ] as any
      }
    }));
    
    if (params.signal) {
      return new Promise((resolve, reject) => {
        if (params.signal?.aborted) {
          return reject(new DOMException('Aborted', 'AbortError'));
        }
        params.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        genAiPromise.then(resolve).catch(reject);
      }).then((response: any) => response.text || "");
    }
    
    const response = await genAiPromise;
    return (response as any).text || "";
  }
}

// 2. 记忆提取逻辑
export async function extractAndSaveMemory(
  userMessage: string,
  aiResponse: string,
  aiRef: React.MutableRefObject<GoogleGenAI | null>,
  apiSettings: ApiSettings,
  personaId?: string
): Promise<void> {
  const apiKey = apiSettings.apiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  const prompt = `分析对话并提取记忆。
用户说：${userMessage}
AI说：${aiResponse}
请提取关键信息（如爱好、习惯、重要事件等），以JSON数组格式输出，如：["喜欢吃辣", "家里有只猫"]。如果没有新信息，输出空数组 []。`;

  try {
    const text = await withRetry(() => callAi({
      apiKey: apiKey as string,
      apiUrl: apiSettings.apiUrl,
      model: "gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      aiRef
    }), 3, 5000); // Fewer retries, longer delay for background task
    
    const memories = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || "[]");
    if (Array.isArray(memories) && memories.length > 0) {
      for (const m of memories) {
        if (typeof m === 'string') {
          await memoryService.saveMemory(m, "", personaId);
        }
      }
    }
  } catch (e: any) {
    // Fail silently for background tasks to avoid cluttering logs/UI
    console.log("Background memory extraction skipped:", e?.message || e);
  }
}

// 3. 图片生成
export async function generateImage(prompt: string, providedApiKey: string, providedApiUrl?: string): Promise<string> {
  let apiKey = providedApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(prompt)}`;

  if (providedApiUrl) {
    // If using a proxy, we might not be able to use Imagen easily if the proxy doesn't support it
    // But we can try to hit the same endpoint if it's a Gemini proxy
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const imageResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { 
        imageConfig: { aspectRatio: "1:1" },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
        ] as any
      }
    }));
    const part = imageResponse.candidates?.[0]?.content?.parts[0];
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error();
  } catch (e) {
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(prompt)}`;
  }
}

// 4. 其他功能函数
export async function generatePersonaStatus(persona: Persona, apiSettings: ApiSettings, worldbook: WorldbookSettings, userProfile: UserProfile, aiRef: any) {
  const prompt = `写一段短状态。`;
  const { responseText } = await fetchAiResponse(prompt, [], persona, apiSettings, worldbook, userProfile, aiRef, false, "", undefined, undefined, undefined, undefined, undefined, true);
  return responseText || "";
}

export async function checkIfPersonaIsOffline(persona: Persona, apiSettings: ApiSettings, worldbook: WorldbookSettings, userProfile: UserProfile, aiRef: any, context: any[] = []) {
  const prompt = `判断在线或离线。`;
  const { responseText } = await fetchAiResponse(prompt, context, persona, apiSettings, worldbook, userProfile, aiRef, false, "", "gemini-3-flash-preview", undefined, undefined, undefined, undefined, true);
  return responseText.includes('离线');
}

export async function summarizeChat(messages: any[], persona: Persona, apiSettings: ApiSettings, worldbook: WorldbookSettings, userProfile: UserProfile, aiRef: any) {
  const prompt = `总结聊天记录。`;
  const { responseText } = await fetchAiResponse(prompt, messages, persona, apiSettings, worldbook, userProfile, aiRef, false, "", undefined, undefined, undefined, undefined, undefined, true);
  return responseText;
}

export async function generateUserRemark(persona: Persona, apiSettings: ApiSettings, worldbook: WorldbookSettings, userProfile: UserProfile, aiRef: any) {
  const prompt = `起个备注名。`;
  const { responseText } = await fetchAiResponse(prompt, [], persona, apiSettings, worldbook, userProfile, aiRef, false, "", undefined, undefined, undefined, undefined, undefined, true);
  return responseText.trim();
}

export async function generateDiaryEntry(persona: Persona, apiSettings: ApiSettings, worldbook: WorldbookSettings, userProfile: UserProfile, aiRef: any) {
  const prompt = `写日记。JSON输出。`;
  const { responseText } = await fetchAiResponse(prompt, [], persona, apiSettings, worldbook, userProfile, aiRef, false, "", undefined, undefined, undefined, undefined, undefined, true);
  try {
    return JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch (e) {
    return { title: "无题", content: responseText };
  }
}

export async function generateMoment(persona: Persona, apiSettings: ApiSettings, worldbook: WorldbookSettings) {
  const apiKey = apiSettings.apiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API Key is missing");
  const prompt = `发朋友圈，带[IMAGE: 画面]`;
  
  const content = await callAi({
    apiKey: apiKey as string,
    apiUrl: apiSettings.apiUrl,
    model: "gemini-3-flash-preview",
    messages: [{ role: "user", content: prompt }]
  });

  let text = content || "";
  let imageUrl;
  const imageMatch = text.match(/\[IMAGE:\s*([^\]]+)\]/i);
  if (imageMatch) {
    text = text.replace(imageMatch[0], "").trim();
    imageUrl = await generateImage(imageMatch[1], apiKey as string, apiSettings.apiUrl);
  }
  return { content: text, imageUrl };
}

export async function generateXHSPost(apiSettings: ApiSettings, worldbook: WorldbookSettings, userProfile: UserProfile, aiRef: any) {
  const prompt = `生成小红书。`;
  const { responseText } = await fetchAiResponse(prompt, [], { id: 'xhs' } as any, apiSettings, worldbook, userProfile, aiRef, false, "", undefined, undefined, undefined, undefined, undefined, true);
  let data: any = {};
  try {
    data = JSON.parse(responseText.match(/\{[\s\S]*\}/)?.[0] || "{}");
  } catch (e) {
    console.error("Failed to parse XHS post data:", e);
    data = { title: "无题", content: responseText, imagePrompt: "aesthetic background", authorName: "AI", authorAvatarPrompt: "avatar" };
  }
  const [mainImg, avatarImg] = await Promise.all([
    generateImage(data.imagePrompt, apiSettings.apiKey || "", apiSettings.apiUrl), 
    generateImage(data.authorAvatarPrompt, apiSettings.apiKey || "", apiSettings.apiUrl)
  ]);
  return { title: data.title, content: data.content, images: [mainImg], authorName: data.authorName, authorAvatar: avatarImg };
}

async function describeImage(imageUrl: string, apiKey: string, apiUrl?: string) {
  if (!apiKey) return null;
  
  try {
    const text = await callAi({
      apiKey,
      apiUrl,
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "客观描述图片内容" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    });
    return text || null;
  } catch (e) {
    console.error("describeImage error:", e);
    return null;
  }
}

export async function transcribeAudio(audioBase64: string, mimeType: string, apiSettings: ApiSettings, aiRef: any) {
  const apiKey = apiSettings.apiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) return "失败";
  
  try {
    const text = await callAi({
      apiKey: apiKey as string,
      apiUrl: apiSettings.apiUrl,
      model: "gemini-3-flash-preview",
      messages: [{ 
        role: "user", 
        content: [
          { inlineData: { mimeType, data: audioBase64 } }, 
          { text: "提取歌词" }
        ] 
      }],
      aiRef
    });
    return text || "失败";
  } catch (e) {
    console.error("Transcription failed:", e);
    return "失败";
  }
}

// 5. 核心对话接口 (整合修复后的逻辑)
export async function fetchAiResponse(
  promptText: string, 
  contextMessages: any[] = [], 
  persona: Persona,
  apiSettings: ApiSettings,
  worldbook: WorldbookSettings,
  userProfile: UserProfile,
  aiRef: React.MutableRefObject<GoogleGenAI | null>,
  enableQuote: boolean = true,
  additionalSystemInstructions: string = "",
  forceModel?: string,
  customApiSettings?: Partial<ApiSettings>,
  isOffline?: boolean,
  imageUrl?: string,
  tools?: any[],
  isSystemTask: boolean = false,
  disableActions: boolean = false,
  signal?: AbortSignal
) {
  const effectiveApiSettings = { ...apiSettings, ...customApiSettings };
  const apiKey = effectiveApiSettings.apiKey?.trim() || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("AI Service Error: API Key is missing. Settings:", effectiveApiSettings);
    throw new Error("API Key is missing. Please check your settings.");
  }
  
  // 视觉感知预处理
  let imageDescription: string | null = null;
  if (imageUrl && imageUrl.startsWith('data:image')) {
    imageDescription = await describeImage(imageUrl, apiKey as string, effectiveApiSettings.apiUrl);
    if (imageDescription) {
      promptText = `【视觉感知报告】\n用户刚刚发了一张照片，内容描述：\n"${imageDescription}"\n\n${promptText}`;
    }
  }

  const now = new Date();
  const timeString = now.toLocaleString('zh-CN');
  const globalMemories = await memoryService.getMemories();
  const personaMemories = await memoryService.getMemories(persona.id);

  // 构建完整的系统指令
  const isTheaterMode = !!additionalSystemInstructions.includes('剧场模式') || !!promptText.includes('剧场模式');
  const showActions = isTheaterMode || userProfile.enableActionDescriptions === true;
  
  const fullSystemInstruction = [
    worldbook.globalPrompt ? `【全局规则】\n${worldbook.globalPrompt}` : "",
    ...(worldbook.globalPrompts || []).filter(Boolean).map(p => `【额外全局规则】\n${p}`),
    worldbook.jailbreakPrompt ? `【破限协议】\n${worldbook.jailbreakPrompt}` : "",
    ...(worldbook.jailbreakPrompts || []).filter(Boolean).map(p => `【额外破限协议】\n${p}`),
    `【当前时间】${timeString}。`,
    isOffline ? `【离线模式】回复必须以“[自动回复] ”开头。` : "【在线模式】",
    persona.instructions ? `【角色人设】\n${persona.instructions}` : "",
    persona.prompt ? `【专属提示词】\n${persona.prompt}` : "",
    `【用户人设】\n${userProfile.persona || '一个普通人'}`,
    globalMemories.preferences.length > 0 ? `【全局记忆】\n${globalMemories.preferences.join('\n')}` : "",
    personaMemories.preferences.length > 0 ? `【专属记忆】\n${personaMemories.preferences.join('\n')}` : "",
    `【回复规范】绝对锁定身份。拒绝客服腔。严禁替用户说话。禁止在回复开头添加 [角色名] 或任何类似的前缀。${showActions ? '所有的动作、心理、环境描写必须包裹在括号 ( ) 中。' : '请像真实的微信好友一样自然聊天，严禁使用 (动作) 或 *动作* 这种角色扮演式的描写。直接输出对话内容即可，不要描述动作。'}`,
    additionalSystemInstructions,
    (disableActions || !showActions) ? "【绝对禁止】严禁任何动作描写，严禁使用括号，只输出对话文字。" : ""
  ].filter(Boolean).join('\n\n');

  const modelName = forceModel || effectiveApiSettings.model || 'gemini-3-flash-preview';
  const messages = contextMessages.map(m => ({
    role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
    content: m.content || m.text || " "
  }));

  // Gemini API requires the first message in contents to be from 'user'
  if (messages.length > 0 && messages[0].role === 'model') {
    messages.unshift({ role: 'user', content: '游戏开始' });
  }

  let currentContent: any = promptText || " ";
  if (imageUrl) {
    currentContent = [
      { type: "text", text: promptText || " " },
      { type: "image_url", image_url: { url: imageUrl } }
    ];
  }
  messages.push({ role: 'user', content: currentContent });

  try {
    const text = await callAi({
      apiKey: apiKey as string,
      apiUrl: effectiveApiSettings.apiUrl,
      model: modelName,
      systemInstruction: fullSystemInstruction,
      messages,
      temperature: effectiveApiSettings.temperature,
      aiRef,
      signal
    });

    if (!isSystemTask) {
      // Stagger memory extraction to avoid concurrent requests hitting rate limits
      setTimeout(() => {
        extractAndSaveMemory(promptText, text, aiRef, effectiveApiSettings, persona.id).catch(e => {
          console.error("Memory extraction background task failed:", e);
        });
      }, 3000 + Math.random() * 2000);
    }
    return { responseText: processAiResponse(text, persona.name, disableActions || !showActions, isTheaterMode), imageDescription };
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error("AI Response Error:", error);
    }
    throw error;
  }
}

export function processAiResponse(responseText: string, personaName?: string, disableActions?: boolean, keepQuotes?: boolean) {
  if (!responseText) return "";
  let processed = responseText.replace(/\[ID:\s*[^\]]+\]/gi, '').replace(/\|\|\|/g, '').trim();
  
  // Strip leading and trailing double quotes if they wrap the entire message AND not in theater mode
  if (!keepQuotes && ((processed.startsWith('“') && processed.endsWith('”')) || (processed.startsWith('"') && processed.endsWith('"')))) {
    processed = processed.substring(1, processed.length - 1).trim();
  }

  if (disableActions) {
    processed = processed.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
  }
  if (personaName) {
    const prefix = `[${personaName}]:`;
    if (processed.startsWith(prefix)) {
      processed = processed.substring(prefix.length).trim();
    }
  }
  return processed;
}