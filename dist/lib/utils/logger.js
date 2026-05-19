/**
 * Logger - Simple logging utility for database operations
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
export class Logger {
    level = LogLevel.INFO;
    logs = [];
    maxLogs = 1000;
    constructor(level = LogLevel.INFO, maxLogs = 1000) {
        this.level = level;
        this.maxLogs = maxLogs;
    }
    setLevel(level) {
        this.level = level;
    }
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    error(message, context) {
        this.log(LogLevel.ERROR, message, context);
    }
    log(level, message, context) {
        if (level < this.level)
            return;
        const entry = {
            level,
            message,
            timestamp: new Date(),
            context
        };
        this.logs.push(entry);
        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        // Output to console if in development
        if (process.env.NODE_ENV === 'development') {
            const levelName = LogLevel[level];
            const timestamp = entry.timestamp.toISOString();
            console.log(`[${timestamp}] ${levelName}: ${message}`, context || '');
        }
    }
    getLogs() {
        return [...this.logs];
    }
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }
    clearLogs() {
        this.logs = [];
    }
    query(sql, bindings, duration) {
        const context = {
            sql,
            bindings,
            duration: duration ? `${duration}ms` : undefined
        };
        this.debug('Database Query', context);
    }
    connection(action, details) {
        this.info(`Database ${action}`, details);
    }
    transaction(action, details) {
        this.info(`Transaction ${action}`, details);
    }
}
// Default logger instance
export const defaultLogger = new Logger();
export default defaultLogger;
//# sourceMappingURL=logger.js.map