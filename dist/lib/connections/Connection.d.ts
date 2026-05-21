/**
 * Connection - Database Connection Interface
 *
 * Provides unified interface for database connections
 * Supports MySQL, PostgreSQL, and SQLite
 */
export interface ConnectionConfig {
    driver: 'mysql' | 'postgres' | 'sqlite';
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
    protected inTransaction: boolean;
    protected loggingQueries: boolean;
    protected queryLog: QueryLogEntry[];
    constructor(config: ConnectionConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(sql: string, bindings?: any[]): Promise<QueryResult>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    getLastInsertId(): Promise<number>;
    escape(value: any): string;
    getConfig(): ConnectionConfig;
    isInTransaction(): boolean;
    /**
     * Enable query logging
     * @returns {this}
     */
    enableQueryLog(): this;
    /**
     * Disable query logging
     * @returns {this}
     */
    disableQueryLog(): this;
    /**
     * Check if query logging is enabled
     * @returns {boolean}
     */
    isQueryLogEnabled(): boolean;
    /**
     * Get query log
     * @returns {QueryLogEntry[]}
     */
    getQueryLog(): QueryLogEntry[];
    /**
     * Clear query log
     * @returns {this}
     */
    clearQueryLog(): this;
    /**
     * Log query for debugging
     * @param {string} sql - SQL query
     * @param {any[]} bindings - Query bindings
     * @param {number} duration - Query execution duration in milliseconds
     * @protected
     */
    protected _logQuery(sql: string, bindings?: any[], duration?: number): void;
}
//# sourceMappingURL=Connection.d.ts.map