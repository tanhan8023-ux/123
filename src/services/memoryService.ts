import localforage from 'localforage';

const MEMORY_STORAGE_KEY = 'user_memories';

export interface UserMemory {
  preferences: string[];
  pastContext: string[];
  lastUpdated: number;
}

export const memoryService = {
  async getMemories(): Promise<UserMemory> {
    return (await localforage.getItem<UserMemory>(MEMORY_STORAGE_KEY)) || {
      preferences: [],
      pastContext: [],
      lastUpdated: Date.now()
    };
  },

  async saveMemory(preference: string, context: string): Promise<void> {
    const memories = await this.getMemories();
    if (preference && memories.preferences && !memories.preferences.includes(preference)) {
      memories.preferences.push(preference);
    }
    if (context) {
      memories.pastContext.push(context);
      // Keep only last 10 contexts to avoid prompt bloat
      if (memories.pastContext.length > 10) {
        memories.pastContext.shift();
      }
    }
    memories.lastUpdated = Date.now();
    await localforage.setItem(MEMORY_STORAGE_KEY, memories);
  }
};
