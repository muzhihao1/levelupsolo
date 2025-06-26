import { useEffect } from 'react';

// Performance monitoring for Core Web Vitals
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor Largest Contentful Paint (LCP)
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    });
    
    if ('PerformanceObserver' in window) {
      try {
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Browser doesn't support this metric
      }
    }

    // Monitor First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log('FID:', entry.processingStart - entry.startTime);
      });
    });

    if ('PerformanceObserver' in window) {
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Browser doesn't support this metric
      }
    }

    return () => {
      observer.disconnect();
      fidObserver.disconnect();
    };
  }, []);
}

export default function PerformanceMonitoring() {
  usePerformanceMonitoring();
  return null;
}