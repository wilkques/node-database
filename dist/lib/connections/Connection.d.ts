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
}
//# sourceMappingURL=Connection.d.ts.map