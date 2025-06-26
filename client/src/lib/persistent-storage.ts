/**
 * 持久化存储工具类
 * 提供本地数据缓存和同步机制
 */

interface StorageEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export class PersistentStorage {
  private static readonly VERSION = "1.0.0";
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  static set<T>(key: string, data: T): void {
    try {
      const entry: StorageEntry<T> = {
        data,
        timestamp: Date.now(),
        version: this.VERSION
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const entry: StorageEntry<T> = JSON.parse(item);
      
      // 版本检查
      if (entry.version !== this.VERSION) {
        this.remove(key);
        return null;
      }

      // 过期检查
      if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  static clear(): void {
    try {
      // 只清理我们应用的数据
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('skillTree_') || key.startsWith('growthJournal_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  static isAvailable(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

export const STORAGE_KEYS = {
  SKILLS: 'skillTree_skills',
  TASKS: 'skillTree_tasks', 
  GOALS: 'skillTree_goals',
  ACTIVITY_LOGS: 'skillTree_activity_logs',
  USER_PROFILE: 'growthJournal_userProfile',
  ACHIEVEMENTS: 'skillTree_achievements'
} as const;