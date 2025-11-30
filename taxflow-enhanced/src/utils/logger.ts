/**
 * Structured Logging System
 * Provides type-safe, level-based logging with metadata support
 */

import { env, isProduction, isDevelopment } from '../config/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: LogMetadata;
  error?: Error;
}

class Logger {
  private level: LogLevel;
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    this.level = env.VITE_LOG_LEVEL as LogLevel;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, metadata);
    }
  }

  /**
   * Log informational message
   */
  info(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('info')) {
      this.log('info', message, metadata);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, metadata);
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    if (this.shouldLog('error')) {
      this.log('error', message, { ...metadata, error: error?.message, stack: error?.stack });
    }
  }

  /**
   * Determine if message should be logged based on current level
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.level];
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata,
    };

    // In development, use console with nice formatting
    if (isDevelopment) {
      this.consoleLog(entry);
    }

    // In production, send to monitoring service
    if (isProduction) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Pretty console logging for development
   */
  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const formattedMessage = `${prefix} ${timestamp} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(formattedMessage, entry.metadata || '');
        break;
      case 'info':
        console.info(formattedMessage, entry.metadata || '');
        break;
      case 'warn':
        console.warn(formattedMessage, entry.metadata || '');
        break;
      case 'error':
        console.error(formattedMessage, entry.metadata || '');
        break;
    }
  }

  /**
   * Send logs to monitoring service (production)
   * Replace with actual monitoring service integration
   */
  private sendToMonitoring(entry: LogEntry): void {
    // TODO: Integrate with monitoring service (e.g., Sentry, Datadog, CloudWatch)
    // For now, just console log in production too
    console.log(JSON.stringify(entry));
  }

  /**
   * Create a child logger with persistent metadata
   */
  child(metadata: LogMetadata): Logger {
    const childLogger = new Logger();
    childLogger.level = this.level;

    // Override log methods to include persistent metadata
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, additionalMetadata?: LogMetadata) => {
      originalLog(level, message, { ...metadata, ...additionalMetadata });
    };

    return childLogger;
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Performance timing helper
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = performance.now();
    logger.debug(`Performance timer started: ${label}`);
  }

  /**
   * End timer and log duration
   */
  end(metadata?: LogMetadata): number {
    const duration = performance.now() - this.startTime;
    logger.debug(`Performance timer completed: ${this.label}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...metadata,
    });
    return duration;
  }
}

/**
 * Create a performance timer
 */
export function startTimer(label: string): PerformanceTimer {
  return new PerformanceTimer(label);
}
