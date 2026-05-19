/**
 * MySQL Grammar - MySQL-specific SQL compilation
 */

import Grammar from "./Grammar.js";

export default class MySQLGrammar extends Grammar {
  /**
   * Wrap a value with MySQL backticks
   *
   * @param {string} value - Value to wrap
   * @returns {string} Wrapped value with backticks
   */
  wrapValue(value) {
    if (value === "*") {
      return value;
    }
    return `\`${value.replace(/`/g, "``")}\``;
  }

  /**
   * Compile LIMIT clause for MySQL
   *
   * @param {Builder} query - Query builder instance
   * @param {number|null} limit - Limit value
   * @returns {string} Compiled LIMIT clause
   */
  compileLimit(query, limit) {
    if (limit === null && query.components.offset === null) {
      return "";
    }

    let sql = "";

    if (limit === null) {
      // MySQL requires a limit when using offset
      sql = "LIMIT 18446744073709551615"; // MySQL max limit
    } else {
      sql = `LIMIT ${limit}`;
    }

    if (query.components.offset !== null) {
      sql += ` OFFSET ${query.components.offset}`;
    }

    return sql;
  }

  /**
   * Compile OFFSET clause for MySQL (handled in LIMIT)
   *
   * @param {Builder} query - Query builder instance
   * @param {number|null} offset - Offset value
   * @returns {string} Empty string (handled in LIMIT clause)
   */
  compileOffset(query, offset) {
    // MySQL handles OFFSET in LIMIT clause
    return "";
  }

  /**
   * Compile INSERT statement with MySQL-specific features
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to insert
   * @returns {string} Compiled INSERT SQL
   */
  compileInsert(query, data) {
    const sql = super.compileInsert(query, data);

    // Add MySQL-specific options if needed
    // For example, INSERT IGNORE or ON DUPLICATE KEY UPDATE
    return sql;
  }

  /**
   * Compile an INSERT IGNORE statement
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to insert
   * @returns {string} Compiled INSERT IGNORE SQL
   */
  compileInsertIgnore(query, data) {
    const sql = this.compileInsert(query, data);
    return sql.replace("INSERT INTO", "INSERT IGNORE INTO");
  }

  /**
   * Compile INSERT with ON DUPLICATE KEY UPDATE
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to insert
   * @param {Object} updateData - Data to update on duplicate
   * @returns {string} Compiled INSERT ON DUPLICATE KEY UPDATE SQL
   */
  compileInsertOnDuplicateKeyUpdate(query, data, updateData) {
    let sql = this.compileInsert(query, data);

    if (updateData && Object.keys(updateData).length > 0) {
      const updates = Object.keys(updateData)
        .map((column) => {
          return `${this.wrapColumn(column)} = VALUES(${this.wrapColumn(column)})`;
        })
        .join(", ");

      sql += ` ON DUPLICATE KEY UPDATE ${updates}`;
    }

    return sql;
  }

  /**
   * Compile a REPLACE statement (MySQL-specific)
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to replace
   * @returns {string} Compiled REPLACE SQL
   */
  compileReplace(query, data) {
    const sql = this.compileInsert(query, data);
    return sql.replace("INSERT INTO", "REPLACE INTO");
  }

  /**
   * Compile an UPDATE with JOIN (MySQL-specific)
   *
   * @param {Builder} query - Query builder instance
   * @param {Object} data - Data to update
   * @returns {string} Compiled UPDATE with JOIN SQL
   */
  compileUpdateWithJoin(query, data) {
    const table = this.wrapTable(query.components.from.table);

    let sql = `UPDATE ${table}`;

    // Add JOINs
    const joins = this.compileJoins(query, query.components.joins);
    if (joins) {
      sql += ` ${joins}`;
    }

    // Add SET clause
    const assignments = Object.keys(data)
      .map((column) => {
        return `${this.wrapColumn(column)} = ?`;
      })
      .join(", ");

    sql += ` SET ${assignments}`;

    // Add WHERE clause
    const wheres = this.compileWheres(query, query.components.wheres);
    if (wheres) {
      sql += ` ${wheres}`;
    }

    return sql;
  }

  /**
   * Compile a DELETE with JOIN (MySQL-specific)
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled DELETE with JOIN SQL
   */
  compileDeleteWithJoin(query) {
    const table = this.wrapTable(query.components.from.table);

    let sql = `DELETE ${table} FROM ${table}`;

    // Add JOINs
    const joins = this.compileJoins(query, query.components.joins);
    if (joins) {
      sql += ` ${joins}`;
    }

    // Add WHERE clause
    const wheres = this.compileWheres(query, query.components.wheres);
    if (wheres) {
      sql += ` ${wheres}`;
    }

    return sql;
  }

  /**
   * Compile a TRUNCATE statement
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled TRUNCATE SQL
   */
  compileTruncate(query) {
    const table = this.wrapTable(query.components.from.table);
    return `TRUNCATE TABLE ${table}`;
  }

  /**
   * Compile a SELECT with LOCK IN SHARE MODE
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled SELECT with lock
   */
  compileSharedLock(query) {
    const sql = this.compileSelect(query);
    return `${sql} LOCK IN SHARE MODE`;
  }

  /**
   * Compile a SELECT with FOR UPDATE
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled SELECT FOR UPDATE
   */
  compileExclusiveLock(query) {
    const sql = this.compileSelect(query);
    return `${sql} FOR UPDATE`;
  }

  /**
   * Get MySQL-specific date format functions
   *
   * @param {string} format - Date format
   * @param {string} column - Column name
   * @returns {string} MySQL date format function
   */
  dateFormat(format, column) {
    return `DATE_FORMAT(${this.wrapColumn(column)}, '${format}')`;
  }

  /**
   * Get the lock string for UPDATE locks
   *
   * @returns {string} MySQL FOR UPDATE clause
   */
  lockForUpdate() {
    return "FOR UPDATE";
  }

  /**
   * Get the lock string for shared locks
   *
   * @returns {string} MySQL LOCK IN SHARE MODE clause
   */
  sharedLock() {
    return "LOCK IN SHARE MODE";
  }
}
