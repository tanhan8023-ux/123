import localforage from 'localforage';
import { Song, Playlist } from '../types';

const SONG_STORAGE_KEY = 'local_songs_metadata';
const PLAYLIST_STORAGE_KEY = 'local_playlists';
const SONG_BLOB_PREFIX = 'song_blob_';

export interface StoredSongMetadata extends Omit<Song, 'url'> {
  blobKey: string;
}

export const storageService = {
  async saveSong(song: Song, file: File | Blob): Promise<void> {
    const blobKey = `${SONG_BLOB_PREFIX}${song.id}`;
    
    // Convert to pure Blob to avoid browser compatibility issues with File objects in IndexedDB
    const pureBlob = new Blob([file], { type: file.type });
    
    // Save the blob
    await localforage.setItem(blobKey, pureBlob);
    
    // Save metadata
    const metadata: StoredSongMetadata = {
      ...song,
      blobKey
    };
    
    const existingMetadata = await this.getAllMetadata();
    // Update if exists, else add
    const index = existingMetadata.findIndex(m => m.id === song.id);
    if (index >= 0) {
      existingMetadata[index] = metadata;
      await localforage.setItem(SONG_STORAGE_KEY, existingMetadata);
    } else {
      await localforage.setItem(SONG_STORAGE_KEY, [...existingMetadata, metadata]);
    }
  },

  async getAllMetadata(): Promise<StoredSongMetadata[]> {
    return (await localforage.getItem<StoredSongMetadata[]>(SONG_STORAGE_KEY)) || [];
  },

  async loadAllSongs(): Promise<Song[]> {
    const metadataList = await this.getAllMetadata();
    const songs: Song[] = [];

    for (const meta of metadataList) {
      const blob = await localforage.getItem<Blob>(meta.blobKey);
      if (blob) {
        songs.push({
          ...meta,
          url: URL.createObjectURL(blob)
        });
      }
    }

    return songs;
  },

  async deleteSong(songId: string): Promise<void> {
    const blobKey = `${SONG_BLOB_PREFIX}${songId}`;
    await localforage.removeItem(blobKey);
    
    const existingMetadata = await this.getAllMetadata();
    const updatedMetadata = existingMetadata.filter(m => m.id !== songId);
    await localforage.setItem(SONG_STORAGE_KEY, updatedMetadata);
  },

  async savePlaylists(playlists: Playlist[]): Promise<void> {
    await localforage.setItem(PLAYLIST_STORAGE_KEY, playlists);
  },

  async loadPlaylists(): Promise<Playlist[]> {
    return (await localforage.getItem<Playlist[]>(PLAYLIST_STORAGE_KEY)) || [];
  }
};
