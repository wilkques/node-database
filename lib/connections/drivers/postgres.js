/**
 * PostgreSQL Driver - PostgreSQL database connection implementation
 */

import pg from 'pg';
import Connection from '../Connection.js';

const { Pool, Client } = pg;

export default class PostgreSQLDriver extends Connection {
    constructor() {
        super();
        this.pool = null;
        this.usePool = true;
    }

    /**
     * Create PostgreSQL connection or connection pool
     *
     * @returns {Promise<void>}
     * @protected
     */
    async _createConnection() {
        const connectionConfig = {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            application_name: 'wilkques-database-node',
            connectionTimeoutMillis: 60000,
            idleTimeoutMillis: 30000,
            max: this.config.connectionLimit || 10,
            ssl: this.config.ssl || false
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
     * Execute SQL query
     *
     * @param {string} sql - SQL query
     * @param {Array} bindings - Query bindings
     * @returns {Promise<any>} Query result
     * @protected
     */
    async _executeQuery(sql, bindings = []) {
        // Convert MySQL-style ? placeholders to PostgreSQL $1, $2, etc.
        const pgSql = this._convertPlaceholders(sql);

        if (this.usePool) {
            const result = await this.pool.query(pgSql, bindings);
            return {
                rows: result.rows,
                fields: result.fields,
                rowCount: result.rowCount,
                command: result.command
            };
        } else {
            const result = await this.connection.query(pgSql, bindings);
            return {
                rows: result.rows,
                fields: result.fields,
                rowCount: result.rowCount,
                command: result.command
            };
        }
    }

    /**
     * Convert MySQL-style placeholders to PostgreSQL style
     *
     * @param {string} sql - SQL with ? placeholders
     * @returns {string} SQL with $1, $2, etc. placeholders
     * @private
     */
    _convertPlaceholders(sql) {
        let index = 1;
        return sql.replace(/\?/g, () => `$${index++}`);
    }

    /**
     * Close PostgreSQL connection
     *
     * @returns {Promise<void>}
     * @protected
     */
    async _closeConnection() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        } else if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    /**
     * Escape identifier (table/column names)
     *
     * @param {string} identifier - Identifier to escape
     * @returns {string} Escaped identifier
     */
    escapeIdentifier(identifier) {
        return `"${identifier.replace(/"/g, '""')}"`;
    }

    /**
     * Begin transaction
     *
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        if (this.usePool) {
            this.transactionClient = await this.pool.connect();
            await this.transactionClient.query('BEGIN');
        } else {
            await this.connection.query('BEGIN');
        }
    }

    /**
     * Commit transaction
     *
     * @returns {Promise<void>}
     */
    async commit() {
        if (this.transactionClient) {
            await this.transactionClient.query('COMMIT');
            this.transactionClient.release();
            this.transactionClient = null;
        } else if (this.connection) {
            await this.connection.query('COMMIT');
        }
    }

    /**
     * Rollback transaction
     *
     * @returns {Promise<void>}
     */
    async rollback() {
        if (this.transactionClient) {
            await this.transactionClient.query('ROLLBACK');
            this.transactionClient.release();
            this.transactionClient = null;
        } else if (this.connection) {
            await this.connection.query('ROLLBACK');
        }
    }
}