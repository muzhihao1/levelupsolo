/**
 * Client-side logger utility
 * Environment-aware logging for browser
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  enableInProduction?: boolean;
}

class ClientLogger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.getLogLevelFromEnv(),
      enableInProduction: false,
      ...config
    };
  }

  private getLogLevelFromEnv(): LogLevel {
    // In production, default to ERROR only
    if (import.meta.env.MODE === 'production') {
      return LogLevel.ERROR;
    }

    // In development, check for env variable
    const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'NONE': return LogLevel.NONE;
      default: return LogLevel.DEBUG; // More verbose in development
    }
  }

  private shouldLog(level: LogLevel): boolean {
    // Check if logging is completely disabled in production
    if (import.meta.env.MODE === 'production' && !this.config.enableInProduction) {
      return level >= LogLevel.ERROR;
    }
    
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string): string {
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const levelStr = `[${level}]`;
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    
    return `${timestamp} ${prefix} ${levelStr} ${message}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(
        `%c${this.formatMessage('DEBUG', message)}`,
        'color: #888',
        ...args
      );
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(
        `%c${this.formatMessage('INFO', message)}`,
        'color: #0066cc',
        ...args
      );
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(
        `%c${this.formatMessage('WARN', message)}`,
        'color: #ff9900',
        ...args
      );
    }
  }

  error(message: string, error?: Error | any, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(
        `%c${this.formatMessage('ERROR', message)}`,
        'color: #ff0000',
        ...args
      );
      if (error) {
        console.error('Error details:', error);
      }
    }
  }

  // Group related logs
  group(label: string, fn: () => void) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  // Time performance
  time(label: string): () => void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const start = performance.now();
      return () => {
        const duration = performance.now() - start;
        this.debug(`${label} took ${duration.toFixed(2)}ms`);
      };
    }
    return () => {}; // No-op in production
  }

  // Table display for debugging
  table(data: any[], columns?: string[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.table(data, columns);
    }
  }

  // Create a child logger with additional context
  child(prefix: string): ClientLogger {
    const childPrefix = this.config.prefix 
      ? `${this.config.prefix}:${prefix}`
      : prefix;
    
    return new ClientLogger({
      ...this.config,
      prefix: childPrefix
    });
  }
}

// Export singleton instances for different features
export const logger = new ClientLogger();
export const apiLogger = logger.child('API');
export const taskLogger = logger.child('TASK');
export const uiLogger = logger.child('UI');
export const performanceLogger = logger.child('PERF');

// Export for testing and custom instances
export { ClientLogger };

// Helper function to replace console.log in components
export function replaceConsoleLog() {
  if (import.meta.env.MODE === 'production') {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
  }
}