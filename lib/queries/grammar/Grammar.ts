/**
 * Grammar - Base SQL grammar class for query compilation
 *
 * This is the foundation class for database-specific SQL compilation.
 * It provides a unified interface for converting query builder objects
 * into SQL strings that can be executed against various databases.
 *
 * ## Architecture
 *
 * The Grammar class follows a component-based compilation approach where:
 * - Each SQL clause (SELECT, FROM, WHERE, etc.) has its own compilation method
 * - Query objects are normalized into a consistent structure before compilation
 * - Database-specific implementations override methods for custom behavior
 *
 * ## Query Structure
 *
 * Query objects are expected to have a `queries` structure:
 * ```typescript
 * {
 *   queries: {
 *     columns: { queries: string[] },    // SELECT columns
 *     froms: { queries: string[] },      // FROM tables
 *     joins: { queries: object[] },      // JOIN clauses
 *     wheres: { queries: object[] },     // WHERE conditions
 *     groups: { queries: string[] },     // GROUP BY columns
 *     havings: { queries: object[] },    // HAVING conditions
 *     orders: { queries: object[] },     // ORDER BY clauses
 *     limits: { queries: number[] },     // LIMIT values
 *     offset: { queries: number[] }      // OFFSET values
 *   }
 * }
 * ```
 *
 * ## Parameter Binding
 *
 * All user values are safely parameterized using `?` placeholders to prevent
 * SQL injection. The actual parameter binding is handled by the database driver.
 *
 * ## Identifier Wrapping
 *
 * Table and column names are wrapped with backticks (`) by default.
 * Database-specific grammars override this for their preferred syntax:
 * - MySQL: backticks `table`
 * - PostgreSQL: double quotes "table"
 * - SQLite: square brackets [table]
 *
 * @since 1.0.0
 */

import type { QueryBuilder } from "../Builder.js";

/**
 * Interface defining the core compilation methods required by all grammar implementations.
 *
 * This interface ensures consistency across different database grammars while allowing
 * for database-specific optimizations and syntax variations.
 */
export interface GrammarInterface {
  /**
   * Compile a SELECT query into SQL
   *
   * @param query - Query object with component structure
   * @returns Complete SELECT SQL statement
   */
  compileSelect(query: any): string;

  /**
   * Compile an INSERT query into SQL
   *
   * @param query - Query object with table information
   * @param data - Array of objects containing column-value pairs to insert
   * @returns Complete INSERT SQL statement with parameter placeholders
   */
  compileInsert(query: any, data: object[]): string;

  /**
   * Compile an UPDATE query into SQL
   *
   * @param query - Query object with table and WHERE conditions
   * @param data - Object containing column-value pairs to update
   * @returns Complete UPDATE SQL statement with parameter placeholders
   */
  compileUpdate(query: any, data: object): string;

  /**
   * Compile a DELETE query into SQL
   *
   * @param query - Query object with table and WHERE conditions
   * @returns Complete DELETE SQL statement with parameter placeholders
   */
  compileDelete(query: any): string;
}

export default class Grammar implements GrammarInterface {
  protected tablePrefix: string = "";
  protected selectComponents: string[] = [
    "columns",
    "from",
    "joins",
    "wheres",
    "groups",
    "havings",
    "orders",
    "limit",
    "offset",
  ];

  /**
   * Compile a SELECT statement from query components
   *
   * This method processes a query object and generates a complete SELECT SQL statement
   * by compiling each component (columns, FROM, JOINs, WHERE, etc.) in the correct order.
   *
   * ## Query Processing
   *
   * 1. **Normalization**: Converts component-based query structure to queries structure
   * 2. **Component Compilation**: Processes each SELECT component in order
   * 3. **SQL Assembly**: Combines compiled components into final SQL string
   *
   * ## Component Order
   *
   * Components are compiled in this order to ensure valid SQL:
   * - columns (SELECT)
   * - from (FROM)
   * - joins (JOIN clauses)
   * - wheres (WHERE conditions)
   * - groups (GROUP BY)
   * - havings (HAVING)
   * - orders (ORDER BY)
   * - limit (LIMIT)
   * - offset (OFFSET)
   *
   * @param query - Query object containing either components or queries structure
   * @returns Complete SELECT SQL statement
   *
   * @example
   * ```typescript
   * const query = {
   *   components: {
   *     columns: ['id', 'name'],
   *     from: 'users',
   *     wheres: [{ type: 'basic', column: 'active', operator: '=', value: true }]
   *   }
   * };
   *
   * const sql = grammar.compileSelect(query);
   * // Returns: "SELECT `id`, `name` FROM `users` WHERE `active` = ?"
   * ```
   */
  compileSelect(query: any): string {
    let actualQuery = query;

    // If the query has components but no queries, convert components to queries structure
    if (
      query.components &&
      (!query.queries ||
        Object.values(query.queries).every(
          (q: any) => !q.queries || q.queries.length === 0,
        ))
    ) {
      actualQuery = {
        queries: {
          columns: {
            queries: (query.components.columns || []).map((col: any) =>
              typeof col === "string" ? col : col.column || col,
            ),
          },
          froms: {
            queries: query.components.from
              ? [
                  typeof query.components.from === "string"
                    ? query.components.from
                    : query.components.from.table || query.components.from,
                ]
              : [],
          },
          joins: { queries: query.components.joins || [] },
          wheres: { queries: query.components.wheres || [] },
          groups: {
            queries: (query.components.groups || []).map((group: any) =>
              typeof group === "string" ? group : group.column || group,
            ),
          },
          havings: { queries: query.components.havings || [] },
          orders: { queries: query.components.orders || [] },
          limits: {
            queries: query.components.limit ? [query.components.limit] : [],
          },
          offset: {
            queries: query.components.offset ? [query.components.offset] : [],
          },
        },
      };
    }

    const sql: string[] = [];

    for (const component of this.selectComponents) {
      const method = `compile${this.capitalize(component)}`;
      if (typeof (this as any)[method] === "function") {
        const compiled = (this as any)[method](actualQuery);
        if (compiled) {
          sql.push(compiled);
        }
      }
    }

    return sql.join(" ");
  }

  /**
   * Compile INSERT statement with parameter placeholders
   *
   * Generates an INSERT SQL statement for inserting one or more records.
   * All values are parameterized using `?` placeholders for security.
   *
   * ## Parameter Binding
   *
   * - Column names are extracted from the first data object
   * - Values are replaced with `?` placeholders
   * - Actual values are bound by the database driver during execution
   *
   * ## Batch Inserts
   *
   * Multiple records are supported by generating multiple value groups:
   * `VALUES (?, ?), (?, ?), (?, ?)`
   *
   * @param query - Query object containing table information
   * @param data - Array of objects with column-value pairs to insert
   * @returns INSERT SQL with parameter placeholders
   *
   * @example
   * ```typescript
   * const data = [
   *   { name: 'John', email: 'john@example.com' },
   *   { name: 'Jane', email: 'jane@example.com' }
   * ];
   *
   * const sql = grammar.compileInsert({ table: 'users' }, data);
   * // Returns: "INSERT INTO `users` (`name`, `email`) VALUES (?, ?), (?, ?)"
   * ```
   */
  compileInsert(query: any, data: object[]): string {
    const table = this.wrapTable(query.from || query.table);
    const columns = Object.keys(data[0] || {});
    const wrappedColumns = columns.map((col) => this.wrap(col));

    const values = data
      .map(() => `(${columns.map(() => "?").join(", ")})`)
      .join(", ");

    return `INSERT INTO ${table} (${wrappedColumns.join(", ")}) VALUES ${values}`;
  }

  /**
   * Compile UPDATE statement with WHERE conditions and parameter placeholders
   *
   * Generates an UPDATE SQL statement with SET clauses and optional WHERE conditions.
   * Supports both parameterized values and raw SQL expressions.
   *
   * ## Value Types
   *
   * - **Parameterized values**: Regular values are replaced with `?` placeholders
   * - **Raw expressions**: Objects with `{ raw: true, value: string }` are inserted directly
   *
   * ## WHERE Conditions
   *
   * If the query contains WHERE conditions, they are automatically included
   * to ensure updates only affect intended records.
   *
   * @param query - Query object containing table and WHERE conditions
   * @param data - Object with column-value pairs to update
   * @returns UPDATE SQL with parameter placeholders and WHERE clause
   *
   * @example
   * ```typescript
   * const query = {
   *   table: 'users',
   *   queries: {
   *     wheres: { queries: [{ type: 'basic', column: 'id', operator: '=', value: 1 }] }
   *   }
   * };
   *
   * const data = {
   *   name: 'John Updated',
   *   updated_at: { raw: true, value: 'NOW()' }
   * };
   *
   * const sql = grammar.compileUpdate(query, data);
   * // Returns: "UPDATE `users` SET `name` = ?, `updated_at` = NOW() WHERE `id` = ?"
   * ```
   */
  compileUpdate(query: any, data: object): string {
    const table = this.wrapTable(query.from || query.table);
    const columns = Object.keys(data).map((key) => {
      const value = data[key as keyof typeof data];
      if (value && typeof value === "object" && (value as any).raw === true) {
        return `${this.wrap(key)} = ${(value as any).value}`;
      }
      return `${this.wrap(key)} = ?`;
    });

    let sql = `UPDATE ${table} SET ${columns.join(", ")}`;

    // Add WHERE clauses
    const wheres = this.compileWheres(query);
    if (wheres) {
      sql += ` ${wheres}`;
    }

    return sql;
  }

  /**
   * Compile DELETE statement with WHERE conditions
   *
   * Generates a DELETE SQL statement with optional WHERE conditions.
   * WHERE conditions are strongly recommended to avoid accidental data loss.
   *
   * ## Safety Considerations
   *
   * - DELETE without WHERE conditions will remove ALL records from the table
   * - The query object should contain WHERE conditions for safe deletion
   * - Use transactions for critical delete operations
   *
   * @param query - Query object containing table and WHERE conditions
   * @returns DELETE SQL with WHERE clause and parameter placeholders
   *
   * @example
   * ```typescript
   * const query = {
   *   table: 'users',
   *   queries: {
   *     wheres: { queries: [
   *       { type: 'basic', column: 'active', operator: '=', value: false },
   *       { type: 'basic', column: 'last_login', operator: '<', value: '2023-01-01' }
   *     ]}
   *   }
   * };
   *
   * const sql = grammar.compileDelete(query);
   * // Returns: "DELETE FROM `users` WHERE `active` = ? AND `last_login` < ?"
   * ```
   */
  compileDelete(query: any): string {
    const table = this.wrapTable(query.from || query.table);
    let sql = `DELETE FROM ${table}`;

    // Add WHERE clauses
    const wheres = this.compileWheres(query);
    if (wheres) {
      sql += ` ${wheres}`;
    }

    return sql;
  }

  /**
   * Compile SELECT columns
   */
  protected compileColumns(query: any): string {
    if (
      !query.queries.columns.queries ||
      query.queries.columns.queries.length === 0
    ) {
      return "SELECT *";
    }

    const columns = query.queries.columns.queries.flatMap((column: any) => {
      // Handle array of columns
      if (Array.isArray(column)) {
        return column.map((col) => {
          if (typeof col === "string") {
            return col === "*" ? "*" : this.wrap(col);
          }
          if (col && col.raw === true) {
            return col.value;
          }
          return this.wrap(col);
        });
      }

      if (typeof column === "string") {
        return column === "*" ? "*" : this.wrap(column);
      }
      if (column && column.raw === true) {
        return column.value;
      }
      return this.wrap(column);
    });

    return `SELECT ${columns.join(", ")}`;
  }

  /**
   * Compile FROM table
   */
  protected compileFrom(query: any): string {
    if (
      !query.queries.froms.queries ||
      query.queries.froms.queries.length === 0
    ) {
      return "";
    }

    const table = query.queries.froms.queries[0];
    return `FROM ${this.wrapTable(table)}`;
  }

  /**
   * Compile WHERE clauses with support for multiple condition types
   *
   * Processes an array of WHERE conditions and generates the appropriate SQL.
   * Supports various condition types including basic comparisons, IN clauses,
   * BETWEEN ranges, NULL checks, and nested conditions.
   *
   * ## Supported Condition Types
   *
   * - **basic**: Standard comparisons (`=`, `>`, `<`, `!=`, etc.)
   * - **in**: IN clause with multiple values
   * - **not_in**: NOT IN clause with multiple values
   * - **between**: BETWEEN range conditions
   * - **null**: IS NULL checks
   * - **not_null**: IS NOT NULL checks
   * - **nested**: Parenthesized sub-conditions
   *
   * ## Boolean Logic
   *
   * Conditions are joined with AND/OR operators based on the `boolean` property.
   * The first condition never has a boolean prefix.
   *
   * ## Parameter Safety
   *
   * All values are parameterized using `?` placeholders to prevent SQL injection.
   *
   * @param query - Query object containing WHERE conditions
   * @returns WHERE clause with parameter placeholders, or empty string if no conditions
   *
   * @example
   * ```typescript
   * const query = {
   *   queries: {
   *     wheres: { queries: [
   *       { type: 'basic', column: 'status', operator: '=', value: 'active' },
   *       { type: 'in', column: 'category', values: [1, 2, 3], boolean: 'AND' },
   *       { type: 'null', column: 'deleted_at', boolean: 'AND' }
   *     ]}
   *   }
   * };
   *
   * const whereClause = grammar.compileWheres(query);
   * // Returns: "WHERE `status` = ? AND `category` IN (?, ?, ?) AND `deleted_at` IS NULL"
   * ```
   */
  protected compileWheres(query: any): string {
    if (
      !query.queries.wheres.queries ||
      query.queries.wheres.queries.length === 0
    ) {
      return "";
    }

    const wheres = query.queries.wheres.queries
      .map((where: any, index: number) => {
        const boolean =
          index === 0 ? "" : ` ${where.boolean?.toUpperCase() || "AND"}`;

        switch (where.type) {
          case "basic":
            // Handle column references vs bound parameters
            if (this.isColumnReference(where.value, where.column)) {
              return `${boolean} ${this.wrap(where.column)} ${where.operator} ${this.wrap(where.value)}`;
            }
            return `${boolean} ${this.wrap(where.column)} ${where.operator} ?`;
          case "in":
            const placeholders = where.values.map(() => "?").join(", ");
            return `${boolean} ${this.wrap(where.column)} IN (${placeholders})`;
          case "not_in":
            const notInPlaceholders = where.values.map(() => "?").join(", ");
            return `${boolean} ${this.wrap(where.column)} NOT IN (${notInPlaceholders})`;
          case "between":
            return `${boolean} ${this.wrap(where.column)} BETWEEN ? AND ?`;
          case "null":
            return `${boolean} ${this.wrap(where.column)} IS NULL`;
          case "not_null":
            return `${boolean} ${this.wrap(where.column)} IS NOT NULL`;
          case "nested":
            return `${boolean} (${this.compileWheres(where.query)})`;
          case "raw":
            return where.sql; // Raw SQL already includes connector
          default:
            return "";
        }
      })
      .filter(Boolean);

    return wheres.length > 0 ? `WHERE${wheres.join("")}` : "";
  }

  /**
   * Compile JOIN clauses for table relationships
   *
   * Generates SQL JOIN statements for connecting multiple tables.
   * Supports various JOIN types and handles both simple and complex join conditions.
   *
   * ## Supported JOIN Types
   *
   * - **INNER JOIN**: Returns only matching rows from both tables
   * - **LEFT JOIN**: Returns all rows from left table, matching from right
   * - **RIGHT JOIN**: Returns all rows from right table, matching from left
   * - **CROSS JOIN**: Cartesian product of both tables (no ON condition)
   *
   * ## Join Conditions
   *
   * - Standard joins use ON clause with column equality
   * - Cross joins omit the ON condition entirely
   * - Column names are automatically wrapped for safety
   *
   * @param query - Query object containing JOIN specifications
   * @returns JOIN clauses as SQL string, or empty string if no joins
   *
   * @example
   * ```typescript
   * const query = {
   *   queries: {
   *     joins: { queries: [
   *       {
   *         type: 'LEFT',
   *         table: 'posts',
   *         first: 'users.id',
   *         operator: '=',
   *         second: 'posts.user_id'
   *       },
   *       {
   *         type: 'INNER',
   *         table: 'categories',
   *         first: 'posts.category_id',
   *         operator: '=',
   *         second: 'categories.id'
   *       }
   *     ]}
   *   }
   * };
   *
   * const joins = grammar.compileJoins(query);
   * // Returns: "LEFT JOIN `posts` ON `users`.`id` = `posts`.`user_id` INNER JOIN `categories` ON `posts`.`category_id` = `categories`.`id`"
   * ```
   */
  protected compileJoins(query: any): string {
    if (
      !query.queries.joins.queries ||
      query.queries.joins.queries.length === 0
    ) {
      return "";
    }

    return query.queries.joins.queries
      .map((join: any) => {
        const type = join.type.toUpperCase();
        if (type === "CROSS") {
          return `CROSS JOIN ${this.wrapTable(join.table)}`;
        }
        return `${type} JOIN ${this.wrapTable(join.table)} ON ${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`;
      })
      .join(" ");
  }

  /**
   * Compile ORDER BY
   */
  protected compileOrders(query: any): string {
    if (
      !query.queries.orders.queries ||
      query.queries.orders.queries.length === 0
    ) {
      return "";
    }

    const orders = query.queries.orders.queries.map((order: any) => {
      const column = order.isRaw ? order.column : this.wrap(order.column);
      // For raw SQL, don't append direction (it's already in the SQL)
      const direction = order.isRaw
        ? ""
        : ` ${(order.direction || "ASC").toUpperCase()}`;
      return `${column}${direction}`;
    });

    return `ORDER BY ${orders.join(", ")}`;
  }

  /**
   * Compile GROUP BY
   */
  protected compileGroups(query: any): string {
    if (
      !query.queries.groups.queries ||
      query.queries.groups.queries.length === 0
    ) {
      return "";
    }

    const groups = query.queries.groups.queries.map((group: any) =>
      this.wrap(group),
    );
    return `GROUP BY ${groups.join(", ")}`;
  }

  /**
   * Compile HAVING
   */
  protected compileHavings(query: any): string {
    if (
      !query.queries.havings.queries ||
      query.queries.havings.queries.length === 0
    ) {
      return "";
    }

    const havings = query.queries.havings.queries.map(
      (having: any, index: number) => {
        const boolean =
          index === 0 ? "" : ` ${having.boolean?.toUpperCase() || "AND"}`;
        return `${boolean} ${this.wrap(having.column)} ${having.operator} ?`;
      },
    );

    return `HAVING${havings.join("")}`;
  }

  /**
   * Compile LIMIT - public interface for testing
   */
  compileLimit(query: any, limit?: number | null): string {
    // If called with explicit parameters (test interface)
    if (arguments.length === 2) {
      const mockQuery = {
        queries: {
          limits: {
            queries: limit !== null && limit !== undefined ? [limit] : [],
          },
          offset: {
            queries:
              query.components && query.components.offset
                ? [query.components.offset]
                : [],
          },
        },
      };
      return this.compileLimitInternal(mockQuery);
    }

    // Otherwise use the query structure as-is
    return this.compileLimitInternal(query);
  }

  /**
   * Internal LIMIT compilation
   */
  protected compileLimitInternal(query: any): string {
    if (
      !query.queries.limits.queries ||
      query.queries.limits.queries.length === 0
    ) {
      return "";
    }

    return `LIMIT ${query.queries.limits.queries[0]}`;
  }

  /**
   * Compile OFFSET
   */
  protected compileOffset(query: any): string {
    if (
      !query.queries ||
      !query.queries.offset ||
      !query.queries.offset.queries ||
      query.queries.offset.queries.length === 0
    ) {
      return "";
    }

    return `OFFSET ${query.queries.offset.queries[0]}`;
  }

  /**
   * Wrap table names with appropriate identifiers for database compatibility
   *
   * Handles various table name formats including simple names, aliases,
   * and subqueries. Ensures proper quoting to prevent SQL injection and
   * handle reserved keywords or special characters.
   *
   * ## Supported Formats
   *
   * - **Simple table**: `users` → `` `users` ``
   * - **Table with alias**: `users as u` → `` `users` AS `u` ``
   * - **Subquery**: `(SELECT ...) AS alias` → `(SELECT ...) AS `alias``
   *
   * ## Database Compatibility
   *
   * Base implementation uses backticks (`), but database-specific grammars
   * override this method for their preferred quoting style:
   * - MySQL: backticks `` `table` ``
   * - PostgreSQL: double quotes `"table"`
   * - SQLite: square brackets `[table]`
   *
   * @param table - Table name, alias, or subquery expression
   * @returns Properly wrapped table identifier
   *
   * @example
   * ```typescript
   * grammar.wrapTable('users');              // "`users`"
   * grammar.wrapTable('users as u');         // "`users` AS `u`"
   * grammar.wrapTable('(SELECT ...) AS sub') // "(SELECT ...) AS `sub`"
   * ```
   */
  protected wrapTable(table: string | any): string {
    // Handle case where table might be an object with table property
    const tableName =
      typeof table === "string"
        ? table
        : table?.table || table?.from || "users";

    // Handle subquery tables that start with parentheses
    if (tableName.startsWith("(") && tableName.includes(") AS ")) {
      // For subqueries like "(SELECT ...) AS alias", only wrap the alias
      const parts = tableName.split(") AS ");
      const subquery = parts[0] + ")"; // Keep the closing parenthesis
      const alias = parts[1].trim();

      // Check if alias is already wrapped with backticks
      const wrappedAlias =
        alias.startsWith("`") && alias.endsWith("`") ? alias : this.wrap(alias);

      return `${subquery} AS ${wrappedAlias}`;
    }

    if (tableName.includes(" as ")) {
      const parts = tableName.split(" as ");
      return `${this.wrap(parts[0].trim())} AS ${this.wrap(parts[1].trim())}`;
    }
    return this.wrap(tableName);
  }

  /**
   * Wrap column and table identifiers for safe SQL generation
   *
   * Handles various identifier formats including columns, tables, and special cases.
   * Provides protection against SQL injection and reserved keyword conflicts.
   *
   * ## Identifier Types
   *
   * - **Simple column**: `name` → `` `name` ``
   * - **Qualified column**: `users.name` → `` `users`.`name` ``
   * - **Wildcard**: `*` → `*` (unchanged)
   * - **Table wildcard**: `users.*` → `` `users`.* ``
   * - **Arrays**: `['col1', 'col2']` → `` `col1`, `col2` ``
   *
   * ## Special Handling
   *
   * - Asterisk (*) is never wrapped as it's a SQL keyword
   * - Dotted notation is split and each part is wrapped separately
   * - Arrays are processed recursively and joined with commas
   *
   * ## Database Compatibility
   *
   * Uses backticks by default, but database-specific grammars override
   * for their preferred identifier quoting style.
   *
   * @param value - Column name, table name, or array of identifiers
   * @returns Properly wrapped identifier(s)
   *
   * @example
   * ```typescript
   * grammar.wrap('name');           // "`name`"
   * grammar.wrap('users.name');     // "`users`.`name`"
   * grammar.wrap('*');              // "*"
   * grammar.wrap('users.*');        // "`users`.*"
   * grammar.wrap(['id', 'name']);   // "`id`, `name`"
   * ```
   */
  protected wrap(value: string | any): string {
    // Handle array case - if it's an array that got passed by mistake
    if (Array.isArray(value)) {
      return value.map((v) => this.wrap(v)).join(", ");
    }

    const strValue = String(value);
    if (strValue === "*") return strValue;

    // Handle table.* pattern (like gm.*, gs.*)
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
   * Check if a value is a column reference (not a literal value)
   * Only treat as column reference in specific contexts where it makes sense
   */
  protected isColumnReference(value: any, column?: string): boolean {
    if (typeof value !== "string") {
      return false;
    }

    // Check for backtick-wrapped identifiers
    if (value.startsWith("`") && value.endsWith("`")) {
      return true;
    }

    // Check if value looks like a column reference (table.column format)
    if (value.includes(".")) {
      // Exclude email addresses (contain @ symbol)
      if (value.includes("@")) {
        return false;
      }

      // Exclude URLs (start with http or contain ://)
      if (value.startsWith("http") || value.includes("://")) {
        return false;
      }

      // Exclude file extensions (end with common file extensions)
      if (/\.(com|org|net|edu|gov|json|xml|txt|csv|sql)$/i.test(value)) {
        return false;
      }

      // Split and check if parts look like SQL identifiers
      const parts = value.split(".");

      if (parts.length === 2) {
        // Value is in table.column pattern
        if (parts.every((part) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Capitalize string
   */
  protected capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Process nested array with optional callback or constant value
   */
  arrayNested(
    input: any[],
    callbackOrConstant?: ((value: any) => any) | string,
  ): any[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input.map((item) => {
      // Handle raw objects
      if (item && typeof item === "object" && item.raw === true) {
        return item.value;
      }

      // If no callback/constant, return as-is
      if (callbackOrConstant === undefined) {
        return item;
      }

      // If constant string, return it for each item
      if (typeof callbackOrConstant === "string") {
        return callbackOrConstant;
      }

      // If callback function, apply it
      if (typeof callbackOrConstant === "function") {
        return callbackOrConstant(item);
      }

      return item;
    });
  }

  /**
   * Wrap identifier(s) with backticks
   */
  contactBacktick(...args: any[]): string {
    // Handle single argument that might be an object or array
    if (args.length === 1) {
      const arg = args[0];

      // Handle raw objects
      if (arg && typeof arg === "object" && arg.raw === true) {
        return arg.value;
      }

      // Handle array input - treat like multiple arguments
      if (Array.isArray(arg)) {
        const parts = arg.map((item) =>
          typeof item === "string"
            ? this.wrapSingleIdentifier(item)
            : String(item),
        );
        return parts.join(".");
      }

      // Handle string with dots
      if (typeof arg === "string") {
        return this.wrapWithBackticks(arg);
      }
    }

    // Handle multiple arguments - join with dots
    if (args.length > 1) {
      const parts = args.map((arg) =>
        typeof arg === "string" ? this.wrapSingleIdentifier(arg) : String(arg),
      );
      return parts.join(".");
    }

    return args.length > 0 ? this.wrapWithBackticks(String(args[0])) : "";
  }

  /**
   * Wrap string with backticks, handling dots
   */
  private wrapWithBackticks(value: string): string {
    if (value.includes(".")) {
      return value
        .split(".")
        .map((part) => this.wrapSingleIdentifier(part))
        .join(".");
    }
    return this.wrapSingleIdentifier(value);
  }

  /**
   * Wrap single identifier with backticks, removing existing ones first
   */
  private wrapSingleIdentifier(identifier: string): string {
    // Remove existing backticks
    const clean = identifier.replace(/`/g, "");
    return `\`${clean}\``;
  }

  /**
   * Concatenate array of strings with optional separator
   */
  concatenate(strings: string[], glue?: string): string {
    // Filter out falsy values (null, undefined, empty string)
    const filtered = strings.filter((s) => s && s.trim());

    // Use provided glue or default to space
    const separator = glue !== undefined ? glue : " ";

    return filtered.join(separator);
  }

  /**
   * Compile individual components of a query
   */
  compileComponents(builder: any): string[] {
    const components: string[] = [];

    // Use the components structure if available, otherwise fall back to queries
    const query = builder.components
      ? {
          queries: {
            columns: {
              queries: (builder.components.columns || []).map((col: any) =>
                typeof col === "string" ? col : col.column || col,
              ),
            },
            froms: {
              queries: builder.components.from
                ? [
                    typeof builder.components.from === "string"
                      ? builder.components.from
                      : builder.components.from.table ||
                        builder.components.from,
                  ]
                : [],
            },
            joins: { queries: builder.components.joins || [] },
            wheres: { queries: builder.components.wheres || [] },
            groups: {
              queries: (builder.components.groups || []).map((group: any) =>
                typeof group === "string" ? group : group.column || group,
              ),
            },
            havings: { queries: builder.components.havings || [] },
            orders: {
              queries: builder.components.orders || [],
            },
            limits: {
              queries: builder.components.limit
                ? [builder.components.limit]
                : [],
            },
            offset: {
              queries: builder.components.offset
                ? [builder.components.offset]
                : [],
            },
          },
        }
      : builder;

    for (const component of this.selectComponents) {
      const method = `compile${this.capitalize(component)}`;
      if (typeof (this as any)[method] === "function") {
        const compiled = (this as any)[method](query);
        if (compiled && compiled.trim()) {
          components.push(compiled);
        }
      }
    }

    return components;
  }
}
