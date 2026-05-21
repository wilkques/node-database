/**
 * PostgreSQL Driver - PostgreSQL database connection implementation
 */
import pg from "pg";
import Connection from "../Connection.js";
const { Pool, Client } = pg;
export default class PostgreSQLDriver extends Connection {
    pool = null;
    connection = null;
    usePool = true;
    constructor(config) {
        super(config);
    }
    /**
     * Create PostgreSQL connection or connection pool
     */
    async connect() {
        const connectionConfig = {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            application_name: "wilkques-database",
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 30000,
            max: this.config.max || 10,
            ssl: this.config.ssl || false,
        };
        if (this.usePool) {
            this.pool = new Pool(connectionConfig);
            // Test connection
            const client = await this.pool.connect();
            client.release();
        }
        else {
            this.connection = new Client(connectionConfig);
            await this.connection.connect();
        }
    }
    /**
     * Disconnect from PostgreSQL
     */
    async disconnect() {
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
    async query(sql, bindings = []) {
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
        }
        catch (error) {
            throw new Error(`PostgreSQL query failed: ${error.message}`);
        }
    }
    /**
     * Begin transaction
     */
    async beginTransaction() {
        await this.query('BEGIN');
        this.inTransaction = true;
    }
    /**
     * Commit transaction
     */
    async commit() {
        await this.query('COMMIT');
        this.inTransaction = false;
    }
    /**
     * Rollback transaction
     */
    async rollback() {
        await this.query('ROLLBACK');
        this.inTransaction = false;
    }
    /**
     * Get last insert ID
     */
    async getLastInsertId() {
        // PostgreSQL doesn't have LAST_INSERT_ID like MySQL
        // This should be handled at the grammar level with RETURNING clause
        return 0;
    }
    /**
     * Escape value for PostgreSQL
     */
    escape(value) {
        if (value === null)
            return 'NULL';
        if (typeof value === 'number')
            return value.toString();
        if (typeof value === 'boolean')
            return value ? 'true' : 'false';
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
    extractInsertId(rows) {
        if (rows && rows.length > 0 && rows[0].id) {
            return parseInt(rows[0].id) || 0;
        }
        return 0;
    }
}
//# sourceMappingURL=postgres.js.map