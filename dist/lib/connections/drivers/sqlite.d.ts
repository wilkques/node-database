/**
 * SQLite Driver - SQLite database connection implementation
 */
import Connection, { ConnectionConfig, QueryResult } from "../Connection.js";
interface SQLiteConfig extends ConnectionConfig {
  mode?: number;
  verbose?: boolean;
}
export default class SQLiteDriver extends Connection {
  private db;
  constructor(config: SQLiteConfig);
  /**
   * Create SQLite connection
   */
  connect(): Promise<void>;
  /**
   * Disconnect from SQLite
   */
  disconnect(): Promise<void>;
  /**
   * Execute SQL query
   */
  query(sql: string, bindings?: any[]): Promise<QueryResult>;
  /**
   * Begin transaction
   */
  beginTransaction(): Promise<void>;
  /**
   * Commit transaction
   */
  commit(): Promise<void>;
  /**
   * Rollback transaction
   */
  rollback(): Promise<void>;
  /**
   * Get last insert ID
   */
  getLastInsertId(): Promise<number>;
  /**
   * Escape value for SQLite
   */
  escape(value: any): string;
}
export {};
//# sourceMappingURL=sqlite.d.ts.map
