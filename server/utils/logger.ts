/**
 * Logger utility for Level Up Solo
 * Replaces console.log with environment-aware logging
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
  timestamp?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: this.getLogLevelFromEnv(),
      timestamp: true,
      ...config
    };
  }

  private getLogLevelFromEnv(): LogLevel {
    if (process.env.NODE_ENV === 'production') {
      return LogLevel.WARN;
    }
    
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'NONE': return LogLevel.NONE;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.config.timestamp ? new Date().toISOString() : '';
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const levelStr = `[${level}]`;
    
    const parts = [timestamp, prefix, levelStr, message].filter(Boolean);
    return parts.join(' ');
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  error(message: string, error?: Error | any, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
      if (error) {
        console.error('Stack trace:', error.stack || error);
      }
    }
  }

  // Special method for request logging
  request(method: string, path: string, statusCode: number, duration: number) {
    if (this.shouldLog(LogLevel.INFO)) {
      const message = `${method} ${path} ${statusCode} - ${duration}ms`;
      this.info(message);
    }
  }

  // Create a child logger with additional context
  child(prefix: string): Logger {
    const childPrefix = this.config.prefix 
      ? `${this.config.prefix}:${prefix}`
      : prefix;
    
    return new Logger({
      ...this.config,
      prefix: childPrefix
    });
  }
}

// Export singleton instances for different modules
export const logger = new Logger();
export const dbLogger = logger.child('DB');
export const authLogger = logger.child('AUTH');
export const aiLogger = logger.child('AI');
export const taskLogger = logger.child('TASK');

// Export for testing and custom instances
export { Logger };