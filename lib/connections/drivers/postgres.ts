/**
 * PostgreSQL Driver - PostgreSQL database connection implementation
 */

import pg from "pg";
import Connection, { ConnectionConfig, QueryResult } from "../Connection.js";

const { Pool, Client } = pg;

interface PostgreSQLConfig extends ConnectionConfig {
    connectionTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    max?: number;
    application_name?: string;
}

export default class PostgreSQLDriver extends Connection {
    private pool: pg.Pool | null = null;
    private connection: pg.Client | null = null;
    private usePool: boolean = true;

    constructor(config: PostgreSQLConfig) {
        super(config);
    }

    /**
     * Create PostgreSQL connection or connection pool
     */
    async connect(): Promise<void> {
        const connectionConfig = {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            application_name: "wilkques-database",
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 30000,
            max: (this.config as PostgreSQLConfig).max || 10,
            ssl: this.config.ssl || false,
        };

        if (this.usePool) {
            this.pool = new Pool(connectionConfig);

            // Test connection
            const client = await this.pool.connect();
            client.release();
        } else {
            this.connection = new Client(connectionConfig);
            await this.connection.connect();
        }
    }

    /**
     * Disconnect from PostgreSQL
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
        const client = this.pool || this.connection;
        if (!client) {
            throw new Error('No PostgreSQL connection available');
        }

        const startTime = Date.now();

        try {
            const result = await client.query(sql, bindings);

            // Log query with execution time
            const duration = Date.now() - startTime;
            this._logQuery(sql, bindings, duration);

            return {
                rows: result.rows,
                fields: result.fields,
                affectedRows: result.rowCount || 0,
                insertId: this.extractInsertId(result.rows)
            };
        } catch (error: any) {
            throw new Error(`PostgreSQL query failed: ${error.message}`);
        }
    }

    /**
     * Begin transaction
     */
    async beginTransaction(): Promise<void> {
        await this.query('BEGIN');
        this.inTransaction = true;
    }

    /**
     * Commit transaction
     */
    async commit(): Promise<void> {
        await this.query('COMMIT');
        this.inTransaction = false;
    }

    /**
     * Rollback transaction
     */
    async rollback(): Promise<void> {
        await this.query('ROLLBACK');
        this.inTransaction = false;
    }

    /**
     * Get last insert ID
     */
    async getLastInsertId(): Promise<number> {
        // PostgreSQL doesn't have LAST_INSERT_ID like MySQL
        // This should be handled at the grammar level with RETURNING clause
        return 0;
    }

    /**
     * Escape value for PostgreSQL
     */
    escape(value: any): string {
        if (value === null) return 'NULL';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (value instanceof Date) {
            return `'${value.toISOString()}'`;
        }
        return `'${String(value)}'`;
    }

    /**
     * Extract insert ID from PostgreSQL result
     */
    private extractInsertId(rows: any[]): number {
        if (rows && rows.length > 0 && rows[0].id) {
            return parseInt(rows[0].id) || 0;
        }
        return 0;
    }
}