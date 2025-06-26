import { useState, useEffect } from 'react';
import { LocalStorage } from '@/lib/storage';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = LocalStorage.get<T>(key);
    return stored !== null ? stored : defaultValue;
  });

  const setStoredValue = (newValue: T | ((prevValue: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      LocalStorage.set(key, valueToStore);
    } catch (error) {
      console.error(`Error updating localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setStoredValue] as const;
}
