/**
 * Connection - Base database connection class
 *
 * Abstract base class for database connections
 */

export default class Connection {
    constructor() {
        this.config = {};
        this.connection = null;
        this.loggingQueries = false;
        this.queryLog = [];
        this.isConnected = false;
    }

    /**
     * Connect to database
     *
     * @param {object} config - Connection configuration
     * @returns {Promise<void>}
     */
    async connect(config) {
        this.config = config;
        await this._createConnection();
        this.isConnected = true;
    }

    /**
     * Execute SQL query
     *
     * @param {string} sql - SQL query
     * @param {Array} bindings - Query bindings
     * @returns {Promise<any>} Query result
     */
    async query(sql, bindings = []) {
        this._logQuery(sql, bindings);

        try {
            const result = await this._executeQuery(sql, bindings);
            return result;
        } catch (error) {
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }

    /**
     * Begin transaction
     *
     * @returns {Promise<void>}
     */
    async beginTransaction() {
        await this.query('START TRANSACTION');
    }

    /**
     * Commit transaction
     *
     * @returns {Promise<void>}
     */
    async commit() {
        await this.query('COMMIT');
    }

    /**
     * Rollback transaction
     *
     * @returns {Promise<void>}
     */
    async rollback() {
        await this.query('ROLLBACK');
    }

    /**
     * Execute transaction with automatic rollback on error
     *
     * @param {Function} callback - Transaction callback
     * @returns {Promise<any>} Transaction result
     */
    async transaction(callback) {
        await this.beginTransaction();

        try {
            const result = await callback(this);
            await this.commit();
            return result;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    /**
     * Close database connection
     *
     * @returns {Promise<void>}
     */
    async close() {
        if (this.connection && this.isConnected) {
            await this._closeConnection();
            this.isConnected = false;
        }
    }

    /**
     * Enable query logging
     *
     * @returns {this}
     */
    enableQueryLog() {
        this.loggingQueries = true;
        return this;
    }

    /**
     * Disable query logging
     *
     * @returns {this}
     */
    disableQueryLog() {
        this.loggingQueries = false;
        return this;
    }

    /**
     * Get query log
     *
     * @returns {Array} Query log
     */
    getQueryLog() {
        return this.queryLog;
    }

    /**
     * Clear query log
     *
     * @returns {this}
     */
    clearQueryLog() {
        this.queryLog = [];
        return this;
    }

    /**
     * Log query for debugging
     *
     * @param {string} sql - SQL query
     * @param {Array} bindings - Query bindings
     * @private
     */
    _logQuery(sql, bindings) {
        if (this.loggingQueries) {
            this.queryLog.push({
                sql,
                bindings,
                timestamp: new Date()
            });
        }
    }

    /**
     * Create database connection (abstract method)
     *
     * @returns {Promise<void>}
     * @protected
     */
    async _createConnection() {
        throw new Error('_createConnection must be implemented by subclass');
    }

    /**
     * Execute SQL query (abstract method)
     *
     * @param {string} sql - SQL query
     * @param {Array} bindings - Query bindings
     * @returns {Promise<any>} Query result
     * @protected
     */
    async _executeQuery(sql, bindings) {
        throw new Error('_executeQuery must be implemented by subclass');
    }

    /**
     * Close database connection (abstract method)
     *
     * @returns {Promise<void>}
     * @protected
     */
    async _closeConnection() {
        throw new Error('_closeConnection must be implemented by subclass');
    }
}