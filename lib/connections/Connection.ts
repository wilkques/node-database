/**
 * Connection - Database Connection Interface
 *
 * Provides unified interface for database connections
 * Supports MySQL, PostgreSQL, and SQLite
 */

export interface ConnectionConfig {
  driver: "mysql" | "postgres" | "sqlite";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  filename?: string;
  charset?: string;
  pool?: {
    min?: number;
    max?: number;
    acquire?: number;
    idle?: number;
  };
  ssl?: {
    require?: boolean;
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

export interface QueryResult {
  rows?: any[];
  fields?: any[];
  affectedRows?: number;
  insertId?: number;
  changes?: number;
  lastInsertRowid?: number;
}

export interface QueryLogEntry {
  sql: string;
  bindings: any[];
  timestamp: Date;
  duration?: number;
}

export interface ConnectionInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, bindings?: any[]): Promise<QueryResult>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getLastInsertId(): Promise<number>;
  escape(value: any): string;
}

export default class Connection implements ConnectionInterface {
  protected config: ConnectionConfig;
  protected client: any;
  protected inTransaction: boolean = false;

  // Query logging properties
  protected loggingQueries: boolean = false;
  protected queryLog: QueryLogEntry[] = [];

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    throw new Error("connect() method must be implemented by driver");
  }

  async disconnect(): Promise<void> {
    throw new Error("disconnect() method must be implemented by driver");
  }

  async query(sql: string, bindings: any[] = []): Promise<QueryResult> {
    throw new Error("query() method must be implemented by driver");
  }

  async beginTransaction(): Promise<void> {
    throw new Error("beginTransaction() method must be implemented by driver");
  }

  async commit(): Promise<void> {
    throw new Error("commit() method must be implemented by driver");
  }

  async rollback(): Promise<void> {
    throw new Error("rollback() method must be implemented by driver");
  }

  async getLastInsertId(): Promise<number> {
    throw new Error("getLastInsertId() method must be implemented by driver");
  }

  escape(value: any): string {
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

  getConfig(): ConnectionConfig {
    return this.config;
  }

  isInTransaction(): boolean {
    return this.inTransaction;
  }

  // Query logging methods

  /**
   * Enable query logging
   * @returns {this}
   */
  enableQueryLog(): this {
    this.loggingQueries = true;
    return this;
  }

  /**
   * Disable query logging
   * @returns {this}
   */
  disableQueryLog(): this {
    this.loggingQueries = false;
    return this;
  }

  /**
   * Check if query logging is enabled
   * @returns {boolean}
   */
  isQueryLogEnabled(): boolean {
    return this.loggingQueries;
  }

  /**
   * Get query log
   * @returns {QueryLogEntry[]}
   */
  getQueryLog(): QueryLogEntry[] {
    return [...this.queryLog]; // Return copy to prevent external modification
  }

  /**
   * Clear query log
   * @returns {this}
   */
  clearQueryLog(): this {
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
  protected _logQuery(
    sql: string,
    bindings: any[] = [],
    duration?: number,
  ): void {
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
