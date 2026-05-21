/**
 * Logger - Simple logging utility for database operations
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: any;
}

export class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor(level: LogLevel = LogLevel.INFO, maxLogs: number = 1000) {
    this.level = level;
    this.maxLogs = maxLogs;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (level < this.level) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
    };

    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console if in development
    if (process.env.NODE_ENV === "development") {
      const levelName = LogLevel[level];
      const timestamp = entry.timestamp.toISOString();

      console.log(`[${timestamp}] ${levelName}: ${message}`, context || "");
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  clearLogs(): void {
    this.logs = [];
  }

  query(sql: string, bindings?: any[], duration?: number): void {
    const context = {
      sql,
      bindings,
      duration: duration ? `${duration}ms` : undefined,
    };

    this.debug("Database Query", context);
  }

  connection(action: string, details?: any): void {
    this.info(`Database ${action}`, details);
  }

  transaction(action: string, details?: any): void {
    this.info(`Transaction ${action}`, details);
  }
}

// Default logger instance
export const defaultLogger = new Logger();

export default defaultLogger;
