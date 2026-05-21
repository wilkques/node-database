/**
 * MySQL Driver - MySQL database connection implementation
 */

import mysql from "mysql2/promise";
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
    private pool: mysql.Pool | null = null;
    private connection: mysql.Connection | null = null;
    private usePool: boolean = true;

    constructor(config: MySQLConfig) {
        super(config);
    }

    /**
     * Create MySQL connection or connection pool
     */
    async connect(): Promise<void> {
        const connectionConfig = {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            charset: this.config.charset || "utf8mb4",
            timezone: "+00:00",
            supportBigNumbers: true,
            bigNumberStrings: true,
            dateStrings: false,
        };

        if (this.usePool) {
            // Create connection pool
            const poolConfig = {
                ...connectionConfig,
                connectionLimit: (this.config as MySQLConfig).connectionLimit || 10,
                queueLimit: 0,
            };
            this.pool = mysql.createPool(poolConfig);

            // Test pool connection
            const testConnection = await this.pool.getConnection();
            await testConnection.release();
        } else {
            // Create single connection
            this.connection = await mysql.createConnection(connectionConfig);
        }
    }

    /**
     * Disconnect from MySQL
     */
    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    /**
     * Execute SQL query
     */
    async query(sql: string, bindings: any[] = []): Promise<QueryResult> {
        const connection = this.pool || this.connection;
        if (!connection) {
            throw new Error('No MySQL connection available');
        }

        const startTime = Date.now();

        try {
            const [results, fields] = await connection.execute(sql, bindings);

            // Log query with execution time
            const duration = Date.now() - startTime;
            this._logQuery(sql, bindings, duration);

            return {
                rows: Array.isArray(results) ? results : [results],
                fields,
                affectedRows: (results as any).affectedRows,
                insertId: (results as any).insertId
            };
        } catch (error: any) {
            throw new Error(`MySQL query failed: ${error.message}`);
        }
    }

    /**
     * Begin transaction
     */
    async beginTransaction(): Promise<void> {
        const connection = this.getConnection();
        await connection.beginTransaction();
        this.inTransaction = true;
    }

    /**
     * Commit transaction
     */
    async commit(): Promise<void> {
        const connection = this.getConnection();
        await connection.commit();
        this.inTransaction = false;
    }

    /**
     * Rollback transaction
     */
    async rollback(): Promise<void> {
        const connection = this.getConnection();
        await connection.rollback();
        this.inTransaction = false;
    }

    /**
     * Get last insert ID
     */
    async getLastInsertId(): Promise<number> {
        const result = await this.query('SELECT LAST_INSERT_ID() as id');
        return (result.rows && result.rows[0]) ? result.rows[0].id : 0;
    }

    /**
     * Escape value for MySQL
     */
    escape(value: any): string {
        if (this.pool) {
            return this.pool.escape(value);
        }
        if (this.connection) {
            return this.connection.escape(value);
        }
        return super.escape(value);
    }

    /**
     * Get connection instance
     */
    private getConnection(): mysql.Connection | mysql.Pool {
        if (this.pool) return this.pool;
        if (this.connection) return this.connection;
        throw new Error('No MySQL connection available');
    }
}