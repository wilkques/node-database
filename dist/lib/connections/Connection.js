/**
 * Connection - Database Connection Interface
 *
 * Provides unified interface for database connections
 * Supports MySQL, PostgreSQL, and SQLite
 */
export default class Connection {
  config;
  client;
  inTransaction = false;
  // Query logging properties
  loggingQueries = false;
  queryLog = [];
  constructor(config) {
    this.config = config;
  }
  async connect() {
    throw new Error("connect() method must be implemented by driver");
  }
  async disconnect() {
    throw new Error("disconnect() method must be implemented by driver");
  }
  async query(sql, bindings = []) {
    throw new Error("query() method must be implemented by driver");
  }
  async beginTransaction() {
    throw new Error("beginTransaction() method must be implemented by driver");
  }
  async commit() {
    throw new Error("commit() method must be implemented by driver");
  }
  async rollback() {
    throw new Error("rollback() method must be implemented by driver");
  }
  async getLastInsertId() {
    throw new Error("getLastInsertId() method must be implemented by driver");
  }
  escape(value) {
    if (value === null) return "NULL";
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value ? "1" : "0";
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return `'${String(value)}'`;
  }
  getConfig() {
    return this.config;
  }
  isInTransaction() {
    return this.inTransaction;
  }
  // Query logging methods
  /**
   * Enable query logging
   * @returns {this}
   */
  enableQueryLog() {
    this.loggingQueries = true;
    return this;
  }
  /**
   * Disable query logging
   * @returns {this}
   */
  disableQueryLog() {
    this.loggingQueries = false;
    return this;
  }
  /**
   * Check if query logging is enabled
   * @returns {boolean}
   */
  isQueryLogEnabled() {
    return this.loggingQueries;
  }
  /**
   * Get query log
   * @returns {QueryLogEntry[]}
   */
  getQueryLog() {
    return [...this.queryLog]; // Return copy to prevent external modification
  }
  /**
   * Clear query log
   * @returns {this}
   */
  clearQueryLog() {
    this.queryLog = [];
    return this;
  }
  /**
   * Log query for debugging
   * @param {string} sql - SQL query
   * @param {any[]} bindings - Query bindings
   * @param {number} duration - Query execution duration in milliseconds
   * @protected
   */
  _logQuery(sql, bindings = [], duration) {
    if (this.loggingQueries) {
      this.queryLog.push({
        sql,
        bindings: [...bindings], // Copy bindings to prevent reference issues
        timestamp: new Date(),
        duration,
      });
    }
  }
}
//# sourceMappingURL=Connection.js.map
