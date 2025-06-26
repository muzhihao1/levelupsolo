export class LocalStorage {
  static get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return null;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

export const STORAGE_KEYS = {
  SKILLS: 'growthJournal_skills',
  TASKS: 'growthJournal_tasks', 
  GOALS: 'growthJournal_goals',
  LOGS: 'growthJournal_logs',
  SETTINGS: 'growthJournal_settings',
  USER_DATA: 'growthJournal_userData',
  USER_PROFILE: 'growthJournal_userProfile'
};
