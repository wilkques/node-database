/**
 * PostgreSQL Grammar - PostgreSQL-specific SQL compilation and optimization
 *
 * Extends the base Grammar class to provide PostgreSQL-specific SQL generation,
 * including proper identifier quoting, parameter placeholder formatting, and
 * PostgreSQL-unique features like RETURNING clauses and array operations.
 *
 * ## PostgreSQL-Specific Features
 *
 * - **Double Quote Identifiers**: Uses double quotes for table/column quoting
 * - **$n Parameter Placeholders**: Numbered parameters ($1, $2, etc.)
 * - **RETURNING Clauses**: Support for INSERT/UPDATE RETURNING syntax
 * - **Array Data Types**: Native PostgreSQL array handling
 * - **Serial Sequences**: Auto-increment sequence support
 * - **UPSERT**: ON CONFLICT DO UPDATE syntax
 * - **Window Functions**: Advanced analytical function support
 *
 * ## Identifier Quoting
 *
 * PostgreSQL uses double quotes (") for identifier quoting:
 * - Table names: `"users"`
 * - Column names: `"email"`
 * - Aliases: `"users" AS "u"`
 *
 * ## Parameter Binding
 *
 * PostgreSQL uses numbered parameter placeholders ($1, $2, $3...)
 * instead of the standard ? placeholders used by other databases.
 *
 * ## Case Sensitivity
 *
 * - Unquoted identifiers are case-insensitive (converted to lowercase)
 * - Quoted identifiers preserve exact case
 * - SQL keywords are case-insensitive
 *
 * ## Compatibility
 *
 * Supports PostgreSQL 9.6+ with full feature compatibility.
 * Tested with pg (node-postgres) driver.
 *
 * @since 1.0.0
 */

import Grammar from "./Grammar.js";

export default class PostgreSQL extends Grammar {
  /**
   * Wrap column/table identifier using PostgreSQL double-quote syntax
   *
   * PostgreSQL uses double quotes (") to quote identifiers, which preserves
   * case sensitivity and allows the use of reserved keywords and special
   * characters in table and column names.
   *
   * ## PostgreSQL Identifier Rules
   *
   * - Double quotes preserve exact case sensitivity
   * - Unquoted identifiers are converted to lowercase
   * - Reserved words can be used as identifiers when quoted
   * - Special characters and Unicode are supported within quotes
   * - Maximum identifier length is 63 characters (NAMEDATALEN-1)
   *
   * ## Case Handling
   *
   * ```sql
   * -- These are equivalent (unquoted):
   * SELECT name FROM users;
   * SELECT NAME FROM USERS;
   *
   * -- These are different (quoted):
   * SELECT "Name" FROM "Users";  -- Exact case preserved
   * SELECT "name" FROM "users";  -- Different from above
   * ```
   *
   * @param value - Identifier to wrap with PostgreSQL double quotes
   * @returns Identifier wrapped with PostgreSQL double-quote syntax
   *
   * @example
   * ```typescript
   * // PostgreSQL-specific wrapping
   * wrap('user');           // '"user"'
   * wrap('users.email');    // '"users"."email"'
   * wrap('User');           // '"User"' (case preserved)
   * wrap('select');         // '"select"' (reserved word safely quoted)
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

    if (strValue.includes(".")) {
      return strValue
        .split(".")
        .map((part) => `"${part}"`)
        .join(".");
    }
    return `"${strValue}"`;
  }

  /**
   * Wrap value with double quotes for PostgreSQL
   */
  wrapValue(value: string): string {
    if (value === "*") return value;
    // Escape double quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }

  /**
   * Compile RETURNING clause for PostgreSQL
   */
  compileReturning(query: any, columns?: string[] | null): string {
    if (!columns || columns.length === 0) {
      return "";
    }

    if (columns.includes("*")) {
      return "RETURNING *";
    }

    const wrappedColumns = columns.map((col) => this.wrap(col));
    return `RETURNING ${wrappedColumns.join(", ")}`;
  }

  /**
   * Compile INSERT with RETURNING for PostgreSQL
   */
  compileInsert(query: any, data: object[]): string {
    const baseSql = super.compileInsert(query, data);
    return `${baseSql} RETURNING id`;
  }

  /**
   * Compile UPDATE with RETURNING for PostgreSQL
   */
  compileUpdate(query: any, data: object): string {
    const baseSql = super.compileUpdate(query, data);
    return `${baseSql} RETURNING id`;
  }

  /**
   * Compile OFFSET - public interface for testing
   */
  compileOffset(query: any, offset?: number): string {
    // If called with explicit offset parameter (test interface)
    if (arguments.length === 2 && offset !== undefined && offset !== null) {
      return `OFFSET ${offset}`;
    }

    // Otherwise use the query structure
    return super.compileOffset(query);
  }

  /**
   * Compile INSERT with RETURNING for PostgreSQL
   */
  compileInsertReturning(query: any, data: object, columns?: string[]): string {
    const baseInsertSql = this.compileInsert(query, [data]);

    if (!columns || columns.length === 0) {
      return baseInsertSql;
    }

    const returningClause = this.compileReturning(query, columns);
    return `${baseInsertSql.replace(" RETURNING id", "")} ${returningClause}`;
  }

  /**
   * Generate JSON extraction expressions for PostgreSQL
   */
  jsonExtract(column: string, path: string, operator: string = "->"): string {
    return `${this.wrap(column)} ${operator} '${path}'`;
  }

  /**
   * Compile WHERE clauses with PostgreSQL parameter placeholders
   */
  protected compileWheres(query: any): string {
    if (
      !query.queries.wheres.queries ||
      query.queries.wheres.queries.length === 0
    ) {
      return "";
    }

    let parameterIndex = 1;
    const wheres = query.queries.wheres.queries
      .map((where: any, index: number) => {
        const boolean =
          index === 0 ? "" : ` ${where.boolean?.toUpperCase() || "AND"}`;

        switch (where.type) {
          case "basic":
            return `${boolean} ${this.wrap(where.column)} ${where.operator} $${parameterIndex++}`;
          case "in":
            const placeholders = where.values
              .map(() => `$${parameterIndex++}`)
              .join(", ");
            return `${boolean} ${this.wrap(where.column)} IN (${placeholders})`;
          case "not_in":
            const notInPlaceholders = where.values
              .map(() => `$${parameterIndex++}`)
              .join(", ");
            return `${boolean} ${this.wrap(where.column)} NOT IN (${notInPlaceholders})`;
          case "between":
            return `${boolean} ${this.wrap(where.column)} BETWEEN $${parameterIndex++} AND $${parameterIndex++}`;
          case "null":
            return `${boolean} ${this.wrap(where.column)} IS NULL`;
          case "not_null":
            return `${boolean} ${this.wrap(where.column)} IS NOT NULL`;
          case "nested":
            return `${boolean} (${this.compileWheres(where.query)})`;
          default:
            return "";
        }
      })
      .filter(Boolean);

    return wheres.length > 0 ? `WHERE${wheres.join("")}` : "";
  }
}
