import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import Database from "better-sqlite3";
import path from "path";

dotenv.config();

// Initialize Database
const db = new Database("chat.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    personaId TEXT,
    role TEXT,
    text TEXT,
    timestamp TEXT,
    createdAt INTEGER,
    isRead INTEGER DEFAULT 0
  )
`);

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 8, initialDelay = 5000): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || "";
      const isRateLimit = errorMsg.includes('rate limit') || 
                          errorMsg.includes('quota') ||
                          errorMsg.includes('429') ||
                          errorMsg.includes('exhausted') ||
                          error.status === 429 ||
                          (error.response?.status === 429) ||
                          (typeof error.message === 'string' && error.message.includes('429'));
      
      if (isRateLimit && retries < maxRetries) {
        retries++;
        const delay = initialDelay * Math.pow(2, retries - 1) + Math.random() * 1000;
        console.warn(`Rate limit hit, retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- API Routes ---
  
  // Get messages from server
  app.get("/api/messages/:personaId", (req, res) => {
    try {
      const { personaId } = req.params;
      const { lastTimestamp } = req.query;
      
      let query = "SELECT * FROM messages WHERE personaId = ?";
      const params: any[] = [personaId];
      
      if (lastTimestamp) {
        query += " AND createdAt > ?";
        params.push(Number(lastTimestamp));
      }
      
      query += " ORDER BY createdAt ASC";
      
      const rows = db.prepare(query).all(...params);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { 
      message, 
      history, 
      persona, 
      apiSettings, 
      worldbook, 
      userProfile, 
      subscriptionId,
      additionalSystemInstructions,
      forceModel,
      messageId // Client-side generated ID for the user message
    } = req.body;

    try {
      // Save user message to DB if it doesn't exist
      if (messageId && persona?.id) {
        const existing = db.prepare("SELECT id FROM messages WHERE id = ?").get(messageId);
        if (!existing) {
          db.prepare("INSERT INTO messages (id, personaId, role, text, timestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
            .run(messageId, persona.id, 'user', message, new Date().toLocaleTimeString(), Date.now());
        }
      }
    } catch (dbError) {
      console.error("Database error in /api/chat:", dbError);
    }

    // Return immediately to the client so they don't wait
    res.json({ status: "received", messageId });

    // --- Background Processing ---
    (async () => {
      const settingsKey = apiSettings?.apiKey?.trim();
      const envKey = process.env.GEMINI_API_KEY;
      const apiKey = settingsKey || envKey;

      if (!apiKey) {
        console.error("[Background AI Error]: No API key found.");
        return;
      }

      try {
        const modelName = forceModel || apiSettings?.model || 'gemini-3-flash-preview';
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN');

        const fullSystemInstruction = [
          worldbook?.globalPrompt ? `【全局规则】\n${worldbook.globalPrompt}` : "",
          worldbook?.jailbreakPrompt ? `【破限协议】\n${worldbook.jailbreakPrompt}` : "",
          `【当前时间】${timeString}。`,
          persona?.instructions ? `【角色人设】\n${persona.instructions}` : "",
          persona?.prompt ? `【专属提示词】\n${persona.prompt}` : "",
          `【用户人设】\n${userProfile?.persona || '一个普通人'}`,
          `【回复规范】绝对锁定身份。拒绝客服腔。动作描写用括号包裹。严禁替用户说话。`,
          additionalSystemInstructions || ""
        ].filter(Boolean).join('\n\n');

        let cleanedText = "";

        if (apiSettings?.apiUrl) {
          // --- OpenAI Compatible Call ---
          let endpoint = apiSettings.apiUrl;
          if (!endpoint.endsWith('/chat/completions') && !endpoint.endsWith('/v1/messages')) {
            endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
          }

          const messages = history.map((m: any) => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content || m.text || ''
          }));
          messages.unshift({ role: 'system', content: fullSystemInstruction });
          messages.push({ role: 'user', content: message || '' });

          const response = await withRetry(() => fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelName,
              messages,
              temperature: apiSettings?.temperature || 0.7,
              stream: false
            })
          }));

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as any;
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
          }
          const data = await response.json() as any;
          cleanedText = data.choices?.[0]?.message?.content || "";
        } else {
          // --- Native Gemini Call ---
          const ai = new GoogleGenAI({ apiKey });
          const contents = history.map((m: any) => ({
            role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || m.text || '' }]
          }));
          contents.push({ role: 'user', parts: [{ text: message || '' }] });

          const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: fullSystemInstruction,
              temperature: apiSettings?.temperature || 0.7,
            }
          }));

          const responseText = response.text || "";
          cleanedText = responseText.replace(/\[ID:\s*[^\]]+\]/gi, '').replace(/\|\|\|/g, '').trim();
        }

        // Save AI response to DB
        try {
          if (persona?.id) {
            db.prepare("INSERT INTO messages (id, personaId, role, text, timestamp, createdAt) VALUES (?, ?, ?, ?, ?, ?)")
              .run(generateId(), persona.id, 'model', cleanedText, new Date().toLocaleTimeString(), Date.now());
          }
        } catch (dbError) {
          console.error("Database error saving AI response:", dbError);
        }

        // Send Push Notification
        if (subscriptionId && process.env.ONESIGNAL_REST_API_KEY && process.env.ONESIGNAL_APP_ID) {
          console.log(`[Push Debug] Background push to ${subscriptionId}`);
          try {
            await fetch("https://onesignal.com/api/v1/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
              },
              body: JSON.stringify({
                app_id: process.env.ONESIGNAL_APP_ID,
                include_subscription_ids: [subscriptionId],
                contents: { en: cleanedText, zh: cleanedText },
                headings: { en: persona?.name || "AI Chatbot", zh: persona?.name || "AI 聊天机器人" },
                data: { personaId: persona?.id }
              })
            });
          } catch (e) {
            console.error("[Push Debug] Background push error:", e);
          }
        }
      } catch (error: any) {
        console.error("[Background AI Error]:", error);
      }
    })();
  });

  // Synchronous chat endpoint for direct client-side calls
  app.post("/api/chat/sync", async (req, res) => {
    const { 
      message, 
      history, 
      persona, 
      apiSettings, 
      worldbook, 
      userProfile, 
      additionalSystemInstructions,
      forceModel,
      imageUrl
    } = req.body;

    const settingsKey = apiSettings?.apiKey?.trim();
    const envKey = process.env.GEMINI_API_KEY;
    const apiKey = settingsKey || envKey;

    if (!apiKey) {
      return res.status(400).json({ error: "API Key is missing." });
    }

    try {
      const modelName = forceModel || apiSettings?.model || 'gemini-3-flash-preview';
      const now = new Date();
      const timeString = now.toLocaleString('zh-CN');

      const fullSystemInstruction = [
        worldbook?.globalPrompt ? `【全局规则】\n${worldbook.globalPrompt}` : "",
        worldbook?.jailbreakPrompt ? `【破限协议】\n${worldbook.jailbreakPrompt}` : "",
        `【当前时间】${timeString}。`,
        persona?.instructions ? `【角色人设】\n${persona.instructions}` : "",
        persona?.prompt ? `【专属提示词】\n${persona.prompt}` : "",
        `【用户人设】\n${userProfile?.persona || '一个普通人'}`,
        `【回复规范】绝对锁定身份。拒绝客服腔。动作描写用括号包裹。严禁替用户说话。`,
        additionalSystemInstructions || ""
      ].filter(Boolean).join('\n\n');

      let responseText = "";

      if (apiSettings?.apiUrl) {
        // OpenAI Compatible
        let endpoint = apiSettings.apiUrl;
        if (!endpoint.endsWith('/chat/completions') && !endpoint.endsWith('/v1/messages')) {
          endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
        }

        const messages = history.map((m: any) => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content || m.text || ''
        }));
        messages.unshift({ role: 'system', content: fullSystemInstruction });
        messages.push({ role: 'user', content: message || '' });

        const response = await withRetry(() => fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: apiSettings?.temperature || 0.7
          })
        }));

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json() as any;
        responseText = data.choices?.[0]?.message?.content || "";
      } else {
        // Native Gemini
        const ai = new GoogleGenAI({ apiKey });
        const contents = history.map((m: any) => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || m.text || '' }]
        }));
        
        let currentContent: any = message;
        if (imageUrl) {
          currentContent = [
            { text: message },
            { inlineData: { mimeType: "image/jpeg", data: imageUrl.split(',')[1] } }
          ];
        }
        contents.push({ role: 'user', parts: Array.isArray(currentContent) ? currentContent : [{ text: currentContent }] });

        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: fullSystemInstruction,
            temperature: apiSettings?.temperature || 0.7,
          }
        }));

        responseText = response.text || "";
      }

      res.json({ responseText });
    } catch (error: any) {
      console.error("Sync AI Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files from dist
    app.use(express.static("dist"));

    // SPA fallback: Serve index.html for any unknown routes (excluding API routes which are handled above)
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
