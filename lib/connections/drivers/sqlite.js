/**
 * SQLite Driver - SQLite database connection implementation
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import Connection from '../Connection.js';

export default class SQLiteDriver extends Connection {
    constructor() {
        super();
        this.db = null;
    }

    /**
     * Create SQLite connection
     *
     * @returns {Promise<void>}
     * @protected
     */
    async _createConnection() {
        return new Promise((resolve, reject) => {
            const dbPath = this.config.database || ':memory:';

            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(new Error(`SQLite connection failed: ${err.message}`));
                } else {
                    // Promisify database methods
                    this.db.runAsync = promisify(this.db.run.bind(this.db));
                    this.db.getAsync = promisify(this.db.get.bind(this.db));
                    this.db.allAsync = promisify(this.db.all.bind(this.db));

                    resolve();
                }
            });
        });
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
        const sqlUpper = sql.trim().toUpperCase();

        if (sqlUpper.startsWith('SELECT')) {
            const rows = await this.db.allAsync(sql, bindings);
            return {
                rows,
                rowCount: rows.length,
                command: 'SELECT'
            };
        } else if (sqlUpper.startsWith('INSERT') || sqlUpper.startsWith('UPDATE') || sqlUpper.startsWith('DELETE')) {
            const result = await this.db.runAsync(sql, bindings);
            return {
                rows: [],
                rowCount: result.changes,
                insertId: result.lastID,
                command: sqlUpper.split(' ')[0]
            };
        } else {
            // Other SQL commands
            const result = await this.db.runAsync(sql, bindings);
            return {
                rows: [],
                rowCount: result.changes || 0,
                command: sqlUpper.split(' ')[0]
            };
        }
    }

    /**
     * Close SQLite connection
     *
     * @returns {Promise<void>}
     * @protected
     */
    async _closeConnection() {
        if (this.db) {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.db = null;
                        resolve();
                    }
                });
            });
        }
    }

    /**
     * Begin transaction
     *
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        await this._executeQuery('BEGIN TRANSACTION');
    }

    /**
     * Commit transaction
     *
     * @returns {Promise<void>}
     */
    async commit() {
        await this._executeQuery('COMMIT');
    }

    /**
     * Rollback transaction
     *
     * @returns {Promise<void>}
     */
    async rollback() {
        await this._executeQuery('ROLLBACK');
    }

    /**
     * Get last inserted ID
     *
     * @returns {Promise<number>} Last insert ID
     */
    async lastInsertId() {
        const result = await this.db.getAsync('SELECT last_insert_rowid() as id');
        return result?.id || 0;
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
}