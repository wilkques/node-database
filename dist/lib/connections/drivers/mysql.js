/**
 * MySQL Driver - MySQL database connection implementation
 */
import mysql from "mysql2/promise";
import Connection from "../Connection.js";
export default class MySqlDriver extends Connection {
    pool = null;
    connection = null;
    usePool = true;
    constructor(config) {
        super(config);
    }
    /**
     * Create MySQL connection or connection pool
     */
    async connect() {
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
                connectionLimit: this.config.connectionLimit || 10,
                queueLimit: 0,
            };
            this.pool = mysql.createPool(poolConfig);
            // Test pool connection
            const testConnection = await this.pool.getConnection();
            await testConnection.release();
        }
        else {
            // Create single connection
            this.connection = await mysql.createConnection(connectionConfig);
        }
    }
    /**
     * Disconnect from MySQL
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
        const connection = this.pool || this.connection;
        if (!connection) {
            throw new Error('No MySQL connection available');
        }
        try {
            const [results, fields] = await connection.execute(sql, bindings);
            return {
                rows: Array.isArray(results) ? results : [results],
                fields,
                affectedRows: results.affectedRows,
                insertId: results.insertId
            };
        }
        catch (error) {
            throw new Error(`MySQL query failed: ${error.message}`);
        }
    }
    /**
     * Begin transaction
     */
    async beginTransaction() {
        const connection = this.getConnection();
        await connection.beginTransaction();
        this.inTransaction = true;
    }
    /**
     * Commit transaction
     */
    async commit() {
        const connection = this.getConnection();
        await connection.commit();
        this.inTransaction = false;
    }
    /**
     * Rollback transaction
     */
    async rollback() {
        const connection = this.getConnection();
        await connection.rollback();
        this.inTransaction = false;
    }
    /**
     * Get last insert ID
     */
    async getLastInsertId() {
        const result = await this.query('SELECT LAST_INSERT_ID() as id');
        return (result.rows && result.rows[0]) ? result.rows[0].id : 0;
    }
    /**
     * Escape value for MySQL
     */
    escape(value) {
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
    getConnection() {
        if (this.pool)
            return this.pool;
        if (this.connection)
            return this.connection;
        throw new Error('No MySQL connection available');
    }
}
//# sourceMappingURL=mysql.js.map