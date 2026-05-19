/**
 * PostgreSQL Grammar - PostgreSQL-specific SQL compilation
 */

import Grammar from "./Grammar.js";

export default class PostgreSQLGrammar extends Grammar {
  constructor() {
    super();
    this.parameterCounter = 0;
  }

  /**
   * Get PostgreSQL-style parameter placeholder ($1, $2, etc.)
   *
   * @returns {string} Parameter placeholder
   */
  getParameterPlaceholder() {
    return `$${++this.parameterCounter}`;
  }

  /**
   * Reset parameter counter (useful for new queries)
   */
  resetParameterCounter() {
    this.parameterCounter = 0;
  }

  /**
   * Wrap a value with PostgreSQL double quotes
   *
   * @param {string} value - Value to wrap
   * @returns {string} Wrapped value with double quotes
   */
  wrapValue(value) {
    if (value === "*") {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Compile WHERE clauses with PostgreSQL-style parameters
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} wheres - WHERE conditions
   * @returns {string} Compiled WHERE clauses
   */
  compileWheres(query, wheres) {
    if (!wheres || wheres.length === 0) {
      return "";
    }

    const compiled = wheres
      .map((where, index) => {
        const boolean =
          index === 0 ? "" : `${(where.boolean || "AND").toUpperCase()} `;

        switch (where.type) {
          case "basic":
            return `${boolean}${this.wrapColumn(where.column)} ${where.operator} ${this.getParameterPlaceholder()}`;

          case "in":
            const placeholders = where.values
              .map(() => this.getParameterPlaceholder())
              .join(", ");
            return `${boolean}${this.wrapColumn(where.column)} IN (${placeholders})`;

          case "not_in":
            const notInPlaceholders = where.values
              .map(() => this.getParameterPlaceholder())
              .join(", ");
            return `${boolean}${this.wrapColumn(where.column)} NOT IN (${notInPlaceholders})`;

          case "null":
            return `${boolean}${this.wrapColumn(where.column)} IS NULL`;

          case "not_null":
            return `${boolean}${this.wrapColumn(where.column)} IS NOT NULL`;

          case "nested":
            const nestedSql = this.compileWheres(query, where.wheres);
            return nestedSql
              ? `${boolean}(${nestedSql.replace(/^WHERE\s+/i, "")})`
              : "";

          case "between":
            return `${boolean}${this.wrapColumn(where.column)} BETWEEN ${this.getParameterPlaceholder()} AND ${this.getParameterPlaceholder()}`;

          case "not_between":
            return `${boolean}${this.wrapColumn(where.column)} NOT BETWEEN ${this.getParameterPlaceholder()} AND ${this.getParameterPlaceholder()}`;

          default:
            return "";
        }
      })
      .filter((sql) => sql)
      .join(" ");

    return compiled ? `WHERE ${compiled}` : "";
  }

  /**
   * Override the main compileSelect to reset parameter counter
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled SELECT SQL
   */
  compileSelect(query) {
    this.resetParameterCounter();
    return super.compileSelect(query);
  }

  /**
   * Compile LIMIT clause for PostgreSQL
   *
   * @param {Builder} query - Query builder instance
   * @param {number|null} limit - Limit value
   * @returns {string} Compiled LIMIT clause
   */
  compileLimit(query, limit) {
    if (limit === null) {
      return "";
    }
    return `LIMIT ${limit}`;
  }

  /**
   * Compile OFFSET clause for PostgreSQL
   *
   * @param {Builder} query - Query builder instance
   * @param {number|null} offset - Offset value
   * @returns {string} Compiled OFFSET clause
   */
  compileOffset(query, offset) {
    if (offset === null) {
      return "";
    }
    return `OFFSET ${offset}`;
  }

  /**
   * Compile INSERT with RETURNING clause (PostgreSQL-specific)
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to insert
   * @param {Array} returning - Columns to return
   * @returns {string} Compiled INSERT RETURNING SQL
   */
  compileInsertReturning(query, data, returning = ["*"]) {
    let sql = this.compileInsert(query, data);

    const columns = returning.map((col) => this.wrapColumn(col)).join(", ");
    sql += ` RETURNING ${columns}`;

    return sql;
  }

  /**
   * Compile UPDATE with RETURNING clause (PostgreSQL-specific)
   *
   * @param {Builder} query - Query builder instance
   * @param {Object} data - Data to update
   * @param {Array} returning - Columns to return
   * @returns {string} Compiled UPDATE RETURNING SQL
   */
  compileUpdateReturning(query, data, returning = ["*"]) {
    let sql = this.compileUpdate(query, data);

    const columns = returning.map((col) => this.wrapColumn(col)).join(", ");
    sql += ` RETURNING ${columns}`;

    return sql;
  }

  /**
   * Compile DELETE with RETURNING clause (PostgreSQL-specific)
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} returning - Columns to return
   * @returns {string} Compiled DELETE RETURNING SQL
   */
  compileDeleteReturning(query, returning = ["*"]) {
    let sql = this.compileDelete(query);

    const columns = returning.map((col) => this.wrapColumn(col)).join(", ");
    sql += ` RETURNING ${columns}`;

    return sql;
  }

  /**
   * Compile UPSERT (INSERT ON CONFLICT) statement
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to insert
   * @param {Array} conflicts - Conflict columns
   * @param {Object} updateData - Data to update on conflict
   * @returns {string} Compiled UPSERT SQL
   */
  compileUpsert(query, data, conflicts = [], updateData = {}) {
    let sql = this.compileInsert(query, data);

    if (conflicts.length > 0) {
      const conflictColumns = conflicts
        .map((col) => this.wrapColumn(col))
        .join(", ");
      sql += ` ON CONFLICT (${conflictColumns})`;

      if (Object.keys(updateData).length > 0) {
        const updates = Object.keys(updateData)
          .map((column) => {
            return `${this.wrapColumn(column)} = EXCLUDED.${this.wrapColumn(column)}`;
          })
          .join(", ");

        sql += ` DO UPDATE SET ${updates}`;
      } else {
        sql += " DO NOTHING";
      }
    }

    return sql;
  }

  /**
   * Compile a COPY statement for bulk operations
   *
   * @param {string} table - Table name
   * @param {Array} columns - Columns to copy
   * @param {string} source - Source (file path or STDIN)
   * @returns {string} Compiled COPY SQL
   */
  compileCopy(table, columns = [], source = "STDIN") {
    const wrappedTable = this.wrapTable(table);

    let sql = `COPY ${wrappedTable}`;

    if (columns.length > 0) {
      const columnList = columns.map((col) => this.wrapColumn(col)).join(", ");
      sql += ` (${columnList})`;
    }

    sql += ` FROM ${source} WITH (FORMAT CSV, HEADER)`;

    return sql;
  }

  /**
   * Compile a SELECT with FOR UPDATE/SHARE locks
   *
   * @param {Builder} query - Query builder instance
   * @param {string} lockMode - Lock mode (UPDATE, SHARE, KEY SHARE, etc.)
   * @param {Array} tables - Specific tables to lock
   * @param {boolean} noWait - Add NOWAIT
   * @returns {string} Compiled SELECT with lock
   */
  compileLockForUpdate(
    query,
    lockMode = "UPDATE",
    tables = [],
    noWait = false,
  ) {
    let sql = this.compileSelect(query);

    sql += ` FOR ${lockMode}`;

    if (tables.length > 0) {
      const tableList = tables.map((table) => this.wrapTable(table)).join(", ");
      sql += ` OF ${tableList}`;
    }

    if (noWait) {
      sql += " NOWAIT";
    }

    return sql;
  }

  /**
   * Get PostgreSQL-specific date format functions
   *
   * @param {string} format - Date format
   * @param {string} column - Column name
   * @returns {string} PostgreSQL date format function
   */
  dateFormat(format, column) {
    return `TO_CHAR(${this.wrapColumn(column)}, '${format}')`;
  }

  /**
   * Get PostgreSQL JSON operations
   *
   * @param {string} column - JSON column name
   * @param {string} path - JSON path
   * @param {string} operator - JSON operator (->, ->>, #>, #>>)
   * @returns {string} PostgreSQL JSON operation
   */
  jsonExtract(column, path, operator = "->") {
    return `${this.wrapColumn(column)} ${operator} '${path}'`;
  }

  /**
   * Compile RETURNING clause for PostgreSQL
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} columns - Columns to return
   * @returns {string} Compiled RETURNING clause
   */
  compileReturning(query, columns) {
    if (!columns || columns.length === 0) {
      return "";
    }
    const wrappedColumns = columns.map((col) => this.wrapValue(col)).join(", ");
    return `RETURNING ${wrappedColumns}`;
  }

  /**
   * Compile a TRUNCATE statement for PostgreSQL
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled TRUNCATE SQL
   */
  compileTruncate(query) {
    const table = this.wrapValue(this.getFrom(query));
    return `TRUNCATE TABLE ${table} RESTART IDENTITY`;
  }
}
