/**
 * SQLite Driver - SQLite database connection implementation
 */
import sqlite3 from "sqlite3";
import { promisify } from "util";
import Connection from "../Connection.js";
export default class SQLiteDriver extends Connection {
  db = null;
  constructor(config) {
    super(config);
  }
  /**
   * Create SQLite connection
   */
  async connect() {
    return new Promise((resolve, reject) => {
      const dbPath = this.config.filename || this.config.database || ":memory:";
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`SQLite connection failed: ${err.message}`));
        } else {
          // Promisify database methods
          this.db.runAsync = promisify(this.db.run.bind(this.db));
          this.db.getAsync = promisify(this.db.get.bind(this.db));
          this.db.allAsync = promisify(this.db.all.bind(this.db));
          resolve();
        }
      });
    });
  }
  /**
   * Disconnect from SQLite
   */
  async disconnect() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close((err) => {
          if (err) {
            reject(new Error(`SQLite disconnect failed: ${err.message}`));
          } else {
            this.db = null;
            resolve();
          }
        });
      });
    }
  }
  /**
   * Execute SQL query
   */
  async query(sql, bindings = []) {
    if (!this.db) {
      throw new Error("No SQLite connection available");
    }
    const startTime = Date.now();
    let result;
    try {
      // Determine query type
      const sqlType = sql.trim().toLowerCase();
      if (sqlType.startsWith("select")) {
        const rows = await this.db.allAsync(sql, ...bindings);
        result = {
          rows: rows || [],
          affectedRows: 0,
        };
      } else {
        const runResult = await this.db.runAsync(sql, ...bindings);
        result = {
          rows: [],
          affectedRows: runResult.changes || 0,
          insertId: runResult.lastID || 0,
        };
      }
      // Log query with execution time
      const duration = Date.now() - startTime;
      this._logQuery(sql, bindings, duration);
      return result;
    } catch (error) {
      throw new Error(`SQLite query failed: ${error.message}`);
    }
  }
  /**
   * Begin transaction
   */
  async beginTransaction() {
    await this.query("BEGIN TRANSACTION");
    this.inTransaction = true;
  }
  /**
   * Commit transaction
   */
  async commit() {
    await this.query("COMMIT");
    this.inTransaction = false;
  }
  /**
   * Rollback transaction
   */
  async rollback() {
    await this.query("ROLLBACK");
    this.inTransaction = false;
  }
  /**
   * Get last insert ID
   */
  async getLastInsertId() {
    const result = await this.query("SELECT last_insert_rowid() as id");
    return result.rows && result.rows[0] ? result.rows[0].id : 0;
  }
  /**
   * Escape value for SQLite
   */
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
}
//# sourceMappingURL=sqlite.js.map
