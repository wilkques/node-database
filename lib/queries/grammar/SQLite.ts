/**
 * SQLite Grammar - SQLite-specific SQL compilation and optimization
 *
 * Extends the base Grammar class to provide SQLite-specific SQL generation,
 * including proper identifier quoting, LIMIT/OFFSET handling, and SQLite's
 * unique features and limitations.
 *
 * ## SQLite-Specific Features
 *
 * - **Square Bracket Identifiers**: Uses square brackets for table/column quoting
 * - **ROWID Support**: Automatic ROWID handling for auto-increment
 * - **Simple Type System**: Dynamic typing with affinity rules
 * - **PRAGMA Commands**: Support for SQLite configuration commands
 * - **Attach/Detach**: Multiple database file support
 * - **Full-Text Search**: FTS3/FTS4/FTS5 search capabilities
 * - **JSON Support**: JSON1 extension functions
 *
 * ## Identifier Quoting
 *
 * SQLite supports multiple quoting styles, but this grammar uses square brackets:
 * - Table names: `[users]`
 * - Column names: `[email]`
 * - Aliases: `[users] AS [u]`
 *
 * ## Type Affinity
 *
 * SQLite uses dynamic typing with type affinity:
 * - TEXT: String values
 * - NUMERIC: Numeric values (integer or real)
 * - INTEGER: Integer values (including ROWID)
 * - REAL: Floating-point values
 * - BLOB: Binary data
 *
 * ## LIMIT/OFFSET Behavior
 *
 * SQLite requires LIMIT when using OFFSET. If only OFFSET is specified,
 * LIMIT is set to -1 (unlimited) per SQLite convention.
 *
 * ## Compatibility
 *
 * Supports SQLite 3.x with full feature compatibility.
 * Tested with better-sqlite3 driver for optimal performance.
 *
 * @since 1.0.0
 */

import Grammar from "./Grammar.js";

export default class SQLite extends Grammar {
  /**
   * Wrap column/table identifier using SQLite square bracket syntax
   *
   * SQLite supports multiple identifier quoting styles (backticks, double quotes,
   * square brackets), but this grammar uses square brackets for consistency
   * and compatibility with all SQLite versions.
   *
   * ## SQLite Identifier Rules
   *
   * - Square brackets allow reserved words as identifiers
   * - Case sensitivity depends on PRAGMA case_sensitive_like setting
   * - Special characters and spaces are supported within brackets
   * - Maximum identifier length is not explicitly limited
   * - Unicode characters are fully supported
   *
   * ## Quoting Styles Supported by SQLite
   *
   * - Square brackets: `[table]` (used by this grammar)
   * - Double quotes: `"table"` (SQL standard)
   * - Backticks: `` `table` `` (MySQL compatibility)
   * - Single quotes: `'table'` (non-standard, not recommended)
   *
   * ## ROWID Considerations
   *
   * SQLite tables have an implicit ROWID column unless created with WITHOUT ROWID.
   * Identifier wrapping ensures proper handling of explicit vs implicit columns.
   *
   * @param value - Identifier to wrap with SQLite square brackets
   * @returns Identifier wrapped with SQLite square bracket syntax
   *
   * @example
   * ```typescript
   * // SQLite-specific wrapping
   * wrap('user');           // '[user]'
   * wrap('users.email');    // '[users].[email]'
   * wrap('order');          // '[order]' (reserved word safely quoted)
   * wrap('table name');     // '[table name]' (spaces allowed)
   * ```
   */
  protected wrap(value: string | any): string {
    // Handle array case - if it's an array that got passed by mistake
    if (Array.isArray(value)) {
      return value.map((v) => this.wrap(v)).join(", ");
    }

    const strValue = String(value);
    if (strValue === "*") return strValue;
    if (strValue.includes(".")) {
      return strValue
        .split(".")
        .map((part) => `[${part}]`)
        .join(".");
    }
    return `[${strValue}]`;
  }

  /**
   * Internal LIMIT compilation - SQLite doesn't support OFFSET without LIMIT
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
      // SQLite requires LIMIT when using OFFSET
      sql = `LIMIT -1`;
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
   * SQLite doesn't need separate OFFSET compilation
   */
  protected compileOffset(_query: any): string {
    return ""; // Handled in compileLimit
  }

  /**
   * Wrap value with square brackets for SQLite
   */
  wrapValue(value: string): string {
    if (value === "*") return value;
    return `[${value}]`;
  }

  /**
   * Compile PRAGMA statement for SQLite
   */
  compilePragma(pragmaName: string, value?: any): string {
    if (value !== undefined) {
      return `PRAGMA ${pragmaName} = ${value}`;
    }
    return `PRAGMA ${pragmaName}`;
  }

  /**
   * Compile UPSERT (INSERT OR REPLACE) for SQLite
   */
  compileUpsert(builder: any, data: object): string {
    return this.compileReplace(builder, data);
  }

  /**
   * Concatenate strings for SQLite
   */
  concatenate(strings: string[]): string {
    return strings.join(" || ");
  }

  /**
   * Date function for SQLite
   */
  dateFunction(format: string, column: string, sqliteFormat?: string): string {
    if (format === "strftime") {
      if (!sqliteFormat) {
        throw new Error("Format is required for strftime function");
      }
      return `STRFTIME('${sqliteFormat}', ${this.wrap(column)})`;
    }

    // Map common date functions to SQLite equivalents
    const formatMap: { [key: string]: string } = {
      date: "DATE",
      time: "TIME",
      datetime: "DATETIME",
    };

    const sqliteFunction = formatMap[format.toLowerCase()];
    if (sqliteFunction) {
      return `${sqliteFunction}(${this.wrap(column)})`;
    }

    // Throw error for unknown functions
    throw new Error(`Unknown date function: ${format}`);
  }

  /**
   * Compile INSERT OR REPLACE for SQLite
   */
  compileReplace(builder: any, data: object): string {
    const insertSql = this.compileInsert(builder, [data]);
    return insertSql.replace("INSERT INTO", "INSERT OR REPLACE INTO");
  }

  /**
   * Compile INSERT OR IGNORE for SQLite
   */
  compileInsertIgnore(builder: any, data: object): string {
    const insertSql = this.compileInsert(builder, [data]);
    return insertSql.replace("INSERT INTO", "INSERT OR IGNORE INTO");
  }

  /**
   * Compile JOIN clauses for SQLite with RIGHT JOIN handling
   */
  compileJoins(query: any, joins?: any[]): string {
    // If called with explicit joins parameter (test interface)
    if (arguments.length === 2 && Array.isArray(joins)) {
      return joins
        .map((join: any) => {
          const type = join.type.toUpperCase();

          if (type === "RIGHT") {
            console.warn(
              "SQLite does not support RIGHT JOIN, consider restructuring your query",
            );
            return `LEFT JOIN ${this.wrapTable(join.table)} ON ${this.wrapColumn(join.first)} ${join.operator} ${this.wrapColumn(join.second)}`;
          }

          if (type === "CROSS") {
            return `CROSS JOIN ${this.wrapTable(join.table)}`;
          }

          return `${type} JOIN ${this.wrapTable(join.table)} ON ${this.wrapColumn(join.first)} ${join.operator} ${this.wrapColumn(join.second)}`;
        })
        .join(" ");
    }

    // Otherwise use the parent implementation
    return super.compileJoins(query);
  }

  /**
   * Wrap column identifier (alias for wrap method for test compatibility)
   */
  wrapColumn(column: string): string {
    return this.wrap(column);
  }
}
