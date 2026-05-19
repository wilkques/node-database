/**
 * MySQL Driver - MySQL database connection implementation
 */
import Connection, { ConnectionConfig, QueryResult } from "../Connection.js";
interface MySQLConfig extends ConnectionConfig {
    connectionLimit?: number;
    queueLimit?: number;
    timezone?: string;
    supportBigNumbers?: boolean;
    bigNumberStrings?: boolean;
    dateStrings?: boolean;
}
export default class MySqlDriver extends Connection {
    private pool;
    private connection;
    private usePool;
    constructor(config: MySQLConfig);
    /**
     * Create MySQL connection or connection pool
     */
    connect(): Promise<void>;
    /**
     * Disconnect from MySQL
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
     * Escape value for MySQL
     */
    escape(value: any): string;
    /**
     * Get connection instance
     */
    private getConnection;
}
export {};
//# sourceMappingURL=mysql.d.ts.map