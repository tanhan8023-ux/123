import localforage from 'localforage';

export interface UserMemory {
  preferences: string[];
  pastContext: string[];
  lastUpdated: number;
}

export const memoryService = {
  getStorageKey(personaId?: string): string {
    return personaId ? `user_memories_${personaId}` : 'user_memories';
  },

  async getMemories(personaId?: string): Promise<UserMemory> {
    const key = this.getStorageKey(personaId);
    return (await localforage.getItem<UserMemory>(key)) || {
      preferences: [],
      pastContext: [],
      lastUpdated: Date.now()
    };
  },

  async updateMemories(memories: UserMemory, personaId?: string): Promise<void> {
    const key = this.getStorageKey(personaId);
    memories.lastUpdated = Date.now();
    await localforage.setItem(key, memories);
  },

  async saveMemory(preference: string, context: string, personaId?: string): Promise<void> {
    const memories = await this.getMemories(personaId);
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
    await this.updateMemories(memories, personaId);
  }
};
