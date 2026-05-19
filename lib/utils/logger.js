/**
 * Simple logger utility for database operations
 */

export default class Logger {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.level = options.level || "info";
    this.prefix = options.prefix || "[DB]";
    this.colors = options.colors !== false;

    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      verbose: 4,
    };

    this.levelColors = {
      error: "\x1b[31m", // Red
      warn: "\x1b[33m", // Yellow
      info: "\x1b[36m", // Cyan
      debug: "\x1b[35m", // Magenta
      verbose: "\x1b[37m", // White
    };

    this.reset = "\x1b[0m";
  }

  /**
   * Check if logging is enabled for level
   *
   * @param {string} level - Log level
   * @returns {boolean} True if enabled
   */
  shouldLog(level) {
    if (!this.enabled) {
      return false;
    }

    const currentLevelValue = this.levels[this.level] || 2;
    const messageLevelValue = this.levels[level] || 2;

    return messageLevelValue <= currentLevelValue;
  }

  /**
   * Log a message
   *
   * @param {string} level - Log level
   * @param {string} message - Message to log
   * @param {any} data - Additional data
   */
  log(level, message, data = null) {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const color = this.colors ? this.levelColors[level] || "" : "";
    const reset = this.colors ? this.reset : "";

    let logMessage = `${color}${this.prefix} [${timestamp}] ${level.toUpperCase()}: ${message}${reset}`;

    if (data) {
      if (typeof data === "object") {
        logMessage += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        logMessage += ` ${data}`;
      }
    }

    console.log(logMessage);
  }

  /**
   * Log error message
   *
   * @param {string} message - Error message
   * @param {any} data - Additional data
   */
  error(message, data = null) {
    this.log("error", message, data);
  }

  /**
   * Log warning message
   *
   * @param {string} message - Warning message
   * @param {any} data - Additional data
   */
  warn(message, data = null) {
    this.log("warn", message, data);
  }

  /**
   * Log info message
   *
   * @param {string} message - Info message
   * @param {any} data - Additional data
   */
  info(message, data = null) {
    this.log("info", message, data);
  }

  /**
   * Log debug message
   *
   * @param {string} message - Debug message
   * @param {any} data - Additional data
   */
  debug(message, data = null) {
    this.log("debug", message, data);
  }

  /**
   * Log verbose message
   *
   * @param {string} message - Verbose message
   * @param {any} data - Additional data
   */
  verbose(message, data = null) {
    this.log("verbose", message, data);
  }

  /**
   * Log SQL query
   *
   * @param {string} sql - SQL query
   * @param {Array} bindings - Query bindings
   * @param {number} duration - Query duration in ms
   */
  query(sql, bindings = [], duration = null) {
    if (!this.shouldLog("debug")) {
      return;
    }

    let message = `Query: ${sql}`;

    if (bindings.length > 0) {
      message += `\nBindings: [${bindings.join(", ")}]`;
    }

    if (duration !== null) {
      message += `\nDuration: ${duration}ms`;
    }

    this.debug(message);
  }

  /**
   * Log connection event
   *
   * @param {string} event - Event type (connect, disconnect, error)
   * @param {Object} details - Event details
   */
  connection(event, details = {}) {
    const message = `Connection ${event}`;
    this.info(message, details);
  }

  /**
   * Log transaction event
   *
   * @param {string} event - Event type (begin, commit, rollback)
   * @param {Object} details - Event details
   */
  transaction(event, details = {}) {
    const message = `Transaction ${event}`;
    this.debug(message, details);
  }

  /**
   * Create a child logger with additional prefix
   *
   * @param {string} childPrefix - Additional prefix
   * @returns {Logger} Child logger
   */
  child(childPrefix) {
    return new Logger({
      enabled: this.enabled,
      level: this.level,
      prefix: `${this.prefix}:${childPrefix}`,
      colors: this.colors,
    });
  }

  /**
   * Enable logging
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable logging
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Set log level
   *
   * @param {string} level - New log level
   */
  setLevel(level) {
    if (level in this.levels) {
      this.level = level;
    } else {
      this.warn(`Unknown log level: ${level}`);
    }
  }

  /**
   * Get current log level
   *
   * @returns {string} Current log level
   */
  getLevel() {
    return this.level;
  }
}
