/**
 * Connection - Database Connection Interface
 *
 * Provides unified interface for database connections
 * Supports MySQL, PostgreSQL, and SQLite
 */
export default class Connection {
    config;
    client;
    inTransaction = false;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        throw new Error('connect() method must be implemented by driver');
    }
    async disconnect() {
        throw new Error('disconnect() method must be implemented by driver');
    }
    async query(sql, bindings = []) {
        throw new Error('query() method must be implemented by driver');
    }
    async beginTransaction() {
        throw new Error('beginTransaction() method must be implemented by driver');
    }
    async commit() {
        throw new Error('commit() method must be implemented by driver');
    }
    async rollback() {
        throw new Error('rollback() method must be implemented by driver');
    }
    async getLastInsertId() {
        throw new Error('getLastInsertId() method must be implemented by driver');
    }
    escape(value) {
        if (value === null)
            return 'NULL';
        if (typeof value === 'number')
            return value.toString();
        if (typeof value === 'boolean')
            return value ? '1' : '0';
        if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`;
        }
        if (value instanceof Date) {
            return `'${value.toISOString()}'`;
        }
        return `'${String(value)}'`;
    }
    getConfig() {
        return this.config;
    }
    isInTransaction() {
        return this.inTransaction;
    }
}
//# sourceMappingURL=Connection.js.map