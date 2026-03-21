import { ApiSettings, WorldbookSettings, UserProfile } from "../types";
import { fetchAiResponse } from "./aiService";
import { GoogleGenAI } from "@google/genai";

export const lyricService = {
  async extractLyrics(
    title: string, 
    artist: string, 
    apiSettings: ApiSettings,
    worldbook: WorldbookSettings,
    userProfile: UserProfile,
    aiRef: React.MutableRefObject<GoogleGenAI | null>
  ): Promise<string> {
    try {
      // 1. Try exact match with LRCLIB API
      let exactUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}`;
      if (artist && artist !== "未知艺术家") {
        exactUrl += `&artist_name=${encodeURIComponent(artist)}`;
      }
      const exactRes = await fetch(exactUrl);
      if (exactRes.ok) {
        const data = await exactRes.json();
        if (data && data.syncedLyrics) {
          return data.syncedLyrics;
        }
      }

      // 2. Try search with LRCLIB API
      const searchQuery = artist && artist !== "未知艺术家" ? `${title} ${artist}` : title;
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
      const searchRes = await fetch(searchUrl);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          const bestMatch = searchData.find((d: any) => d.syncedLyrics);
          if (bestMatch) {
            return bestMatch.syncedLyrics;
          }
        }
      }
    } catch (error) {
      console.error("LRCLIB API error:", error);
    }

    // 3. Fallback to AI generation if LRCLIB fails
    const isDjVersion = title.toLowerCase().includes('dj') || title.includes('混音');
    const artistText = artist && artist !== "未知艺术家" ? `，歌手为“${artist}”` : '';
    const prompt = `请在互联网（优先网易云音乐、QQ音乐、百度）上精准搜索歌曲《${title}》${artistText} 的歌词。
    
    ${isDjVersion ? '【特别注意：这是一首 DJ 版/混音版歌曲，其节奏和间奏可能与原版完全不同，请务必寻找该特定版本的 LRC 歌词。】' : ''}
    
    要求：
    1. 必须结合歌名和歌手名进行搜索，确保返回的是该特定艺人版本的歌词。
    2. 必须返回带有时间戳的 LRC 格式歌词，例如 [00:12.34] 歌词内容。
    3. 请确保歌词内容与歌曲版本完全匹配，尤其是时间戳必须与歌曲节奏同步。
    4. 如果网上只有纯文本歌词，请你根据一般的歌曲节奏，自行估算并添加合理的时间戳，使其成为合法的 LRC 格式。
    5. 绝对不要返回纯文本！每一行都必须以 [mm:ss.xx] 开头。
    6. 如果没有找到任何相关歌词，请回复：“[00:00.00] 抱歉，未找到该歌曲的真实歌词。”
    7. 只返回歌词文本或提示，不要有任何其他解释或开场白。`;

    try {
      const { responseText } = await fetchAiResponse(
        prompt,
        [], // contextMessages
        { id: 'lyrics_generator', name: 'Lyrics Generator', instructions: 'You are a lyrics generator.', prompt: '', prompts: [] },
        apiSettings,
        worldbook,
        userProfile,
        aiRef,
        false, // enableQuote
        "你是一个歌词提取专家。请通过搜索获取真实歌词。如果找不到 LRC 格式，请将纯文本歌词转换为 LRC 格式。",
        "gemini-3-flash-preview", // Force flash model for system tasks to avoid Pro rate limits
        undefined,
        undefined,
        undefined,
        [{ googleSearch: {} }], // Add googleSearch tool
        true // isSystemTask
      );

      // If the response is too short or doesn't look like LRC, it might be the "not found" message
      if (!responseText || responseText.length < 20 || !responseText.includes('[')) {
        return responseText || "[00:00.00] 抱歉，未找到该歌曲的真实歌词。";
      }

      return responseText;
    } catch (error) {
      console.error("Lyric extraction error:", error);
      return "[00:00.00] 歌词提取出错，请稍后再试";
    }
  }
};
