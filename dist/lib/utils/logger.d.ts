/**
 * Logger - Simple logging utility for database operations
 */
export declare enum LogLevel {
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
export declare class Logger {
  private level;
  private logs;
  private maxLogs;
  constructor(level?: LogLevel, maxLogs?: number);
  setLevel(level: LogLevel): void;
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
  private log;
  getLogs(): LogEntry[];
  getLogsByLevel(level: LogLevel): LogEntry[];
  clearLogs(): void;
  query(sql: string, bindings?: any[], duration?: number): void;
  connection(action: string, details?: any): void;
  transaction(action: string, details?: any): void;
}
export declare const defaultLogger: Logger;
export default defaultLogger;
//# sourceMappingURL=logger.d.ts.map
