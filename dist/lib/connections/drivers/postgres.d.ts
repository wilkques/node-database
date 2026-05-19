/**
 * PostgreSQL Driver - PostgreSQL database connection implementation
 */
import Connection, { ConnectionConfig, QueryResult } from "../Connection.js";
interface PostgreSQLConfig extends ConnectionConfig {
    connectionTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    max?: number;
    application_name?: string;
}
export default class PostgreSQLDriver extends Connection {
    private pool;
    private connection;
    private usePool;
    constructor(config: PostgreSQLConfig);
    /**
     * Create PostgreSQL connection or connection pool
     */
    connect(): Promise<void>;
    /**
     * Disconnect from PostgreSQL
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
     * Escape value for PostgreSQL
     */
    escape(value: any): string;
    /**
     * Extract insert ID from PostgreSQL result
     */
    private extractInsertId;
}
export {};
//# sourceMappingURL=postgres.d.ts.map