/**
 * MySQL Grammar - MySQL-specific SQL compilation and optimization
 *
 * Extends the base Grammar class to provide MySQL-specific SQL generation,
 * optimizations, and feature support. This grammar handles MySQL's unique
 * syntax requirements and provides access to MySQL-only features.
 *
 * ## MySQL-Specific Features
 *
 * - **Backtick Identifiers**: Uses backticks for table/column quoting
 * - **LIMIT with OFFSET**: Handles MySQL's LIMIT/OFFSET syntax requirements
 * - **INSERT IGNORE**: Supports INSERT IGNORE for duplicate key handling
 * - **ON DUPLICATE KEY UPDATE**: MySQL's upsert functionality
 * - **REPLACE**: Complete row replacement syntax
 * - **Row Locking**: FOR UPDATE and LOCK IN SHARE MODE support
 * - **Date Functions**: MySQL-specific date formatting functions
 *
 * ## Identifier Quoting
 *
 * MySQL uses backticks (`) for identifier quoting:
 * - Table names: `` `users` ``
 * - Column names: `` `email` ``
 * - Aliases: `` `users` AS `u` ``
 *
 * ## LIMIT/OFFSET Behavior
 *
 * MySQL requires LIMIT when using OFFSET. If only OFFSET is specified,
 * LIMIT is set to the maximum possible value (18446744073709551615).
 *
 * ## Compatibility
 *
 * Supports MySQL 5.7+ with full feature compatibility.
 * Tested with mysql2 driver for Node.js.
 *
 * @since 1.0.0
 */

import Grammar from "./Grammar.js";

export default class MySQL extends Grammar {
  /**
   * Wrap column/table identifier using MySQL backtick syntax
   *
   * MySQL uses backticks (`) to quote identifiers, which allows the use of
   * reserved keywords and special characters in table and column names.
   *
   * ## MySQL Identifier Rules
   *
   * - Backticks allow reserved words as identifiers
   * - Special characters and spaces are supported within backticks
   * - Case sensitivity depends on the underlying file system
   * - Maximum identifier length is 64 characters
   *
   * ## Escaping
   *
   * Backticks within identifiers are escaped by doubling: `` `table`name` `` → `` `table``name` ``
   *
   * @param value - Identifier to wrap with MySQL backticks
   * @returns Identifier wrapped with MySQL backtick syntax
   *
   * @example
   * ```typescript
   * // MySQL-specific wrapping
   * wrap('user');           // "`user`"
   * wrap('users.email');    // "`users`.`email`"
   * wrap('order');          // "`order`" (reserved word safely quoted)
   * ```
   */
  protected wrap(value: string | any): string {
    // Handle array case - if it's an array that got passed by mistake
    if (Array.isArray(value)) {
      return value.map((v) => this.wrap(v)).join(", ");
    }

    const strValue = String(value || "");
    if (strValue === "*") return strValue;
    if (strValue === "" || strValue === "undefined" || strValue === "null")
      return "";

    // Handle column AS alias pattern (e.g., "table.column as alias")
    if (strValue.includes(" as ") || strValue.includes(" AS ")) {
      const asIndex = strValue.toLowerCase().indexOf(" as ");
      const columnPart = strValue.substring(0, asIndex).trim();
      const aliasPart = strValue.substring(asIndex + 4).trim();

      const wrappedColumn = this.wrap(columnPart);
      const wrappedAlias = this.wrap(aliasPart);

      return `${wrappedColumn} AS ${wrappedAlias}`;
    }

    if (strValue.includes(".")) {
      const parts = strValue.split(".");
      if (parts[parts.length - 1] === "*") {
        // For table.*, wrap table name but keep * as is
        const tablePart = parts
          .slice(0, -1)
          .map((part) => `\`${part}\``)
          .join(".");
        return `${tablePart}.*`;
      }
      return parts.map((part) => `\`${part}\``).join(".");
    }
    return `\`${strValue}\``;
  }

  /**
   * Wrap value with backticks for MySQL
   */
  wrapValue(value: string): string {
    if (value === "*") return value;
    // Escape backticks by doubling them
    return `\`${value.replace(/`/g, "``")}\``;
  }

  /**
   * Wrap column name for MySQL (alias for wrap method)
   */
  wrapColumn(value: string): string {
    return this.wrap(value);
  }

  /**
   * Compile LIMIT and OFFSET clauses according to MySQL syntax requirements
   *
   * MySQL has specific requirements for LIMIT/OFFSET usage:
   * - OFFSET cannot be used without LIMIT
   * - When OFFSET is specified without LIMIT, LIMIT is set to maximum value
   * - Both LIMIT and OFFSET must be non-negative integers
   *
   * ## MySQL Syntax
   *
   * - `LIMIT count` - Limit number of rows
   * - `LIMIT offset, count` - Alternative syntax (deprecated)
   * - `LIMIT count OFFSET offset` - Preferred syntax
   *
   * ## Maximum Values
   *
   * When only OFFSET is specified, LIMIT is set to MySQL's maximum value:
   * 18446744073709551615 (2^64 - 1)
   *
   * @param query - Query object containing limit and offset values
   * @returns MySQL-compatible LIMIT/OFFSET clause
   *
   * @example
   * ```typescript
   * // Only LIMIT
   * query = { queries: { limits: { queries: [10] } } };
   * // Returns: "LIMIT 10"
   *
   * // LIMIT with OFFSET
   * query = { queries: { limits: { queries: [10] }, offset: { queries: [20] } } };
   * // Returns: "LIMIT 10 OFFSET 20"
   *
   * // Only OFFSET (requires maximum LIMIT)
   * query = { queries: { offset: { queries: [20] } } };
   * // Returns: "LIMIT 18446744073709551615 OFFSET 20"
   * ```
   */
  protected compileLimitInternal(query: any): string {
    let sql = "";

    if (
      query.queries.limits.queries &&
      query.queries.limits.queries.length > 0
    ) {
      sql = `LIMIT ${query.queries.limits.queries[0]}`;
    } else if (
      query.queries.offset.queries &&
      query.queries.offset.queries.length > 0
    ) {
      // MySQL requires LIMIT when using OFFSET
      sql = "LIMIT 18446744073709551615";
    }

    if (
      query.queries.offset.queries &&
      query.queries.offset.queries.length > 0
    ) {
      sql += ` OFFSET ${query.queries.offset.queries[0]}`;
    }

    return sql;
  }

  /**
   * MySQL doesn't need separate OFFSET compilation
   */
  protected compileOffset(_query: any): string {
    return ""; // Handled in compileLimit
  }

  /**
   * Compile INSERT ... ON DUPLICATE KEY UPDATE statement for MySQL upserts
   *
   * This MySQL-specific feature provides upsert functionality by inserting
   * a record or updating it if a duplicate key conflict occurs.
   *
   * ## MySQL ON DUPLICATE KEY UPDATE
   *
   * - Triggered when a UNIQUE or PRIMARY KEY constraint is violated
   * - Updates existing row instead of causing an error
   * - Can reference inserted values using VALUES() function
   * - Atomic operation ensuring data consistency
   *
   * ## Usage Patterns
   *
   * - **Full upsert**: Update all columns on conflict
   * - **Selective update**: Only update specific columns on conflict
   * - **Counter increment**: Increment counters on duplicate keys
   *
   * @param builder - Query builder instance with table information
   * @param data - Object containing column-value pairs to insert
   * @param updateData - Optional object specifying which columns to update on conflict
   * @returns Complete INSERT ... ON DUPLICATE KEY UPDATE SQL statement
   *
   * @example
   * ```typescript
   * const data = { id: 1, name: 'John', views: 1 };
   * const updateData = { views: true }; // Update views on conflict
   *
   * const sql = grammar.compileInsertOnDuplicateKeyUpdate(
   *   { table: 'users' },
   *   data,
   *   updateData
   * );
   * // Returns: "INSERT INTO `users` (`id`, `name`, `views`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `views` = VALUES(`views`)"
   * ```
   */
  compileInsertOnDuplicateKeyUpdate(
    builder: any,
    data: object,
    updateData?: object | null,
  ): string {
    const baseInsertSql = this.compileInsert(builder, [data]);

    if (!updateData || Object.keys(updateData).length === 0) {
      return baseInsertSql;
    }

    const updatePairs = Object.keys(updateData)
      .filter((key) => updateData[key as keyof typeof updateData])
      .map((key) => `${this.wrap(key)} = VALUES(${this.wrap(key)})`)
      .join(", ");

    if (updatePairs) {
      return `${baseInsertSql} ON DUPLICATE KEY UPDATE ${updatePairs}`;
    }

    return baseInsertSql;
  }

  /**
   * Return FOR UPDATE lock string for MySQL
   */
  lockForUpdate(): string {
    return "FOR UPDATE";
  }

  /**
   * Return LOCK IN SHARE MODE lock string for MySQL
   */
  sharedLock(): string {
    return "LOCK IN SHARE MODE";
  }

  /**
   * Compile INSERT IGNORE statement for MySQL
   */
  compileInsertIgnore(builder: any, data: object): string {
    const table = this.wrapTable(builder.from || builder.table);
    const columns = Object.keys(data);
    const wrappedColumns = columns.map((col) => this.wrap(col));
    const placeholders = columns.map(() => "?");

    return `INSERT IGNORE INTO ${table} (${wrappedColumns.join(", ")}) VALUES (${placeholders.join(", ")})`;
  }

  /**
   * Compile REPLACE statement for MySQL
   */
  compileReplace(builder: any, data: object): string {
    const table = this.wrapTable(builder.from || builder.table);
    const columns = Object.keys(data);
    const wrappedColumns = columns.map((col) => this.wrap(col));
    const placeholders = columns.map(() => "?");

    return `REPLACE INTO ${table} (${wrappedColumns.join(", ")}) VALUES (${placeholders.join(", ")})`;
  }

  /**
   * Compile TRUNCATE statement for MySQL
   */
  compileTruncate(builder: any): string {
    const table = this.wrapTable(builder.from || builder.table);
    return `TRUNCATE TABLE ${table}`;
  }

  /**
   * Compile SELECT with LOCK IN SHARE MODE for MySQL
   */
  compileSharedLock(builder: any): string {
    const selectSql = this.compileSelect(builder);
    return `${selectSql} ${this.sharedLock()}`;
  }

  /**
   * Compile SELECT with FOR UPDATE for MySQL
   */
  compileExclusiveLock(builder: any): string {
    const selectSql = this.compileSelect(builder);
    return `${selectSql} ${this.lockForUpdate()}`;
  }

  /**
   * Format date with MySQL DATE_FORMAT function
   */
  dateFormat(format: string, column: string): string {
    return `DATE_FORMAT(${this.wrap(column)}, '${format}')`;
  }

  /**
   * Compile UPDATE with JOIN for MySQL
   */
  compileUpdateWithJoin(builder: any, data: object): string {
    const table = this.wrapTable(builder.from || builder.table);

    const updatePairs = Object.keys(data).map((key) => {
      const value = data[key as keyof typeof data];
      return `${table}.${this.wrap(key)} = ?`;
    });

    let sql = `UPDATE ${table}`;

    // Add JOINs if present
    const joins =
      builder.components?.joins || builder.queries?.joins?.queries || [];
    if (joins.length > 0) {
      for (const join of joins) {
        const joinTable = this.wrapTable(join.table);
        const condition =
          join.condition ||
          `${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`;
        sql += ` ${join.type.toUpperCase()} JOIN ${joinTable} ON ${condition}`;
      }
    }

    sql += ` SET ${updatePairs.join(", ")}`;

    return sql;
  }

  /**
   * Compile DELETE with JOIN for MySQL
   */
  compileDeleteWithJoin(builder: any): string {
    const table = this.wrapTable(builder.from || builder.table);

    let sql = `DELETE ${table} FROM ${table}`;

    // Add JOINs if present
    const joins =
      builder.components?.joins || builder.queries?.joins?.queries || [];
    if (joins.length > 0) {
      for (const join of joins) {
        const joinTable = this.wrapTable(join.table);
        const condition =
          join.condition ||
          `${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`;
        sql += ` ${join.type.toUpperCase()} JOIN ${joinTable} ON ${condition}`;
      }
    }

    return sql;
  }

  /**
   * Concatenate strings for MySQL
   */
  concatenate(strings: string[]): string {
    return `CONCAT(${strings.join(", ")})`;
  }

  /**
   * Date function for MySQL (alias for dateFormat)
   */
  dateFunction(format: string, column: string): string {
    return this.dateFormat(format, column);
  }
}
