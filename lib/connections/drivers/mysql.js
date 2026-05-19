/**
 * MySQL Driver - MySQL database connection implementation
 */

import mysql from "mysql2/promise";
import Connection from "../Connection.js";

export default class MySqlDriver extends Connection {
  constructor() {
    super();
    this.pool = null;
    this.usePool = true;
  }

  /**
   * Create MySQL connection or connection pool
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
    } else {
      // Create single connection (不包含 pool 专用配置)
      this.connection = await mysql.createConnection(connectionConfig);
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
    let connection = this.connection;

    if (this.usePool) {
      connection = await this.pool.getConnection();
    }

    try {
      const [rows, fields] = await connection.execute(sql, bindings);

      // Release connection back to pool if using pool
      if (this.usePool) {
        connection.release();
      }

      return {
        rows,
        fields,
        affectedRows: rows.affectedRows,
        insertId: rows.insertId,
        warningCount: rows.warningCount,
      };
    } catch (error) {
      // Release connection back to pool on error
      if (this.usePool && connection) {
        connection.release();
      }
      throw error;
    }
  }

  /**
   * Begin transaction
   *
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    if (this.usePool) {
      // For transactions, we need a dedicated connection
      this.transactionConnection = await this.pool.getConnection();
      await this.transactionConnection.beginTransaction();
    } else {
      await this.connection.beginTransaction();
    }
  }

  /**
   * Commit transaction
   *
   * @returns {Promise<void>}
   */
  async commit() {
    if (this.transactionConnection) {
      await this.transactionConnection.commit();
      this.transactionConnection.release();
      this.transactionConnection = null;
    } else if (this.connection) {
      await this.connection.commit();
    }
  }

  /**
   * Rollback transaction
   *
   * @returns {Promise<void>}
   */
  async rollback() {
    if (this.transactionConnection) {
      await this.transactionConnection.rollback();
      this.transactionConnection.release();
      this.transactionConnection = null;
    } else if (this.connection) {
      await this.connection.rollback();
    }
  }

  /**
   * Execute transaction query using dedicated transaction connection
   *
   * @param {string} sql - SQL query
   * @param {Array} bindings - Query bindings
   * @returns {Promise<any>} Query result
   */
  async transactionQuery(sql, bindings = []) {
    if (!this.transactionConnection) {
      throw new Error("No active transaction");
    }

    this._logQuery(sql, bindings);

    const [rows, fields] = await this.transactionConnection.execute(
      sql,
      bindings,
    );

    return {
      rows,
      fields,
      affectedRows: rows.affectedRows,
      insertId: rows.insertId,
      warningCount: rows.warningCount,
    };
  }

  /**
   * Close MySQL connection
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
   * Get last inserted ID
   *
   * @returns {Promise<number>} Last insert ID
   */
  async lastInsertId() {
    const result = await this.query("SELECT LAST_INSERT_ID() as id");
    return result.rows[0]?.id || 0;
  }

  /**
   * Escape identifier (table/column names)
   *
   * @param {string} identifier - Identifier to escape
   * @returns {string} Escaped identifier
   */
  escapeIdentifier(identifier) {
    return `\`${identifier.replace(/`/g, "``")}\``;
  }

  /**
   * Escape string value
   *
   * @param {any} value - Value to escape
   * @returns {string} Escaped value
   */
  escape(value) {
    return mysql.escape(value);
  }
}
