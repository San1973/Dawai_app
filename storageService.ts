
import { HistoryItem } from '../types';

const STORAGE_KEY = 'sahayak_history_v1';
const LANGUAGE_KEY = 'sahayak_lang_v1';

/**
 * Checks if the storage quota is nearly full or if an error occurred.
 * Attempts to save and catches the specific QuotaExceededError.
 */
export const saveHistoryItem = (item: HistoryItem): void => {
  try {
    const currentHistory = getHistory();
    const existingIndex = currentHistory.findIndex(i => String(i.id) === String(item.id));
    
    let updatedHistory;
    if (existingIndex >= 0) {
      updatedHistory = [...currentHistory];
      updatedHistory[existingIndex] = item;
    } else {
      updatedHistory = [item, ...currentHistory];
    }
    
    const serialized = JSON.stringify(updatedHistory);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e: any) {
    console.error("Storage error:", e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert("Device storage for this app is full. Please delete some old records to save new ones.");
    } else {
      alert("An error occurred while saving. Please try again.");
    }
  }
};

export const saveFullHistory = (history: HistoryItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e: any) {
    console.error("Storage full during bulk save", e);
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      alert("Storage full. Some translations could not be saved locally.");
    }
  }
};

export const getHistory = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading history", e);
    return [];
  }
};

export const deleteHistoryItem = (id: string): HistoryItem[] => {
  const currentHistory = getHistory();
  const targetId = String(id);
  const updated = currentHistory.filter(item => String(item.id) !== targetId);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error updating storage after delete", e);
  }
  return updated;
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const saveLanguage = (lang: string): void => {
  localStorage.setItem(LANGUAGE_KEY, lang);
};

export const getSavedLanguage = (): string | null => {
  return localStorage.getItem(LANGUAGE_KEY);
};
