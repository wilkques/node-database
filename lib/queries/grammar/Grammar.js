/**
 * Grammar - Base SQL grammar class for query compilation
 */

export default class Grammar {
  constructor() {
    this.tablePrefix = "";
    this.selectComponents = [
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
  }

  /**
   * Compile a SELECT statement
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled SQL
   */
  compileSelect(query) {
    const sql = [];

    for (const component of this.selectComponents) {
      const compiled = this._compileComponent(query, component);
      if (compiled) {
        sql.push(compiled);
      }
    }

    return sql.join(" ");
  }

  /**
   * Compile a specific component
   *
   * @param {Builder} query - Query builder instance
   * @param {string} component - Component name
   * @returns {string|null} Compiled component SQL
   * @private
   */
  _compileComponent(query, component) {
    const methodName = `compile${component.charAt(0).toUpperCase() + component.slice(1)}`;

    if (typeof this[methodName] === "function") {
      return this[methodName](query, query.components[component]);
    }

    return null;
  }

  /**
   * Compile the SELECT columns
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} columns - Columns array
   * @returns {string} Compiled columns
   */
  compileColumns(query, columns) {
    if (columns.length === 0) {
      columns = [{ type: "column", column: "*" }];
    }

    const compiledColumns = columns.map((column) => {
      if (column.type === "column") {
        if (column.column.includes(" as ")) {
          return column.column;
        }
        return this.wrapColumn(column.column);
      } else if (column.type === "subquery") {
        return `(${this.compileSelect(column.query)})`;
      } else if (column.type === "aggregate") {
        return `${column.func.toUpperCase()}(${this.wrapColumn(column.column)}) as aggregate`;
      } else if (column.type === "raw") {
        return column.value;
      }
      return column.column;
    });

    return `SELECT ${compiledColumns.join(", ")}`;
  }

  /**
   * Compile the FROM clause
   *
   * @param {Builder} query - Query builder instance
   * @param {Object} from - From component
   * @returns {string} Compiled FROM clause
   */
  compileFrom(query, from) {
    if (!from) {
      return "";
    }

    if (from.type === "table") {
      const table = this.wrapTable(from.table);
      return `FROM ${table}${from.as ? ` AS ${this.wrapTable(from.as)}` : ""}`;
    } else if (from.type === "subquery") {
      const subquery = this.compileSelect(from.query);
      return `FROM (${subquery})${from.as ? ` AS ${this.wrapTable(from.as)}` : ""}`;
    }

    return "";
  }

  /**
   * Compile the JOIN clauses
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} joins - Joins array
   * @returns {string} Compiled JOIN clauses
   */
  compileJoins(query, joins) {
    if (joins.length === 0) {
      return "";
    }

    return joins
      .map((join) => {
        const type = join.type.toUpperCase();
        const table = this.wrapTable(join.table);

        // Handle callback-processed JOINs (already formatted)
        if (join.first === "CALLBACK_PROCESSED") {
          return `${type} JOIN ${table} ${join.operator} ${join.second}`;
        }

        // Handle regular JOINs
        const first = this.wrapColumn(join.first);
        const second = this.wrapColumn(join.second);

        return `${type} JOIN ${table} ON ${first} ${join.operator} ${second}`;
      })
      .join(" ");
  }

  /**
   * Compile the WHERE clauses
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} wheres - Wheres array
   * @returns {string} Compiled WHERE clauses
   */
  compileWheres(query, wheres) {
    if (wheres.length === 0) {
      return "";
    }

    const compiledWheres = wheres
      .map((where, index) => {
        const boolean = index === 0 ? "" : ` ${where.boolean.toUpperCase()} `;

        switch (where.type) {
          case "basic":
            return `${boolean}${this.wrapColumn(where.column)} ${where.operator} ?`;

          case "in":
            const placeholders = where.values.map(() => "?").join(", ");
            return `${boolean}${this.wrapColumn(where.column)} IN (${placeholders})`;

          case "not_in":
            const notInPlaceholders = where.values.map(() => "?").join(", ");
            return `${boolean}${this.wrapColumn(where.column)} NOT IN (${notInPlaceholders})`;

          case "null":
            return `${boolean}${this.wrapColumn(where.column)} IS NULL`;

          case "not_null":
            return `${boolean}${this.wrapColumn(where.column)} IS NOT NULL`;

          case "nested":
            const nestedWheres = this.compileWheres(
              where.query,
              where.query.components.wheres,
            );
            return `${boolean}(${nestedWheres.replace(/^WHERE\s+/, "")})`;

          default:
            return "";
        }
      })
      .join("");

    return `WHERE ${compiledWheres}`;
  }

  /**
   * Compile GROUP BY clause
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} groups - Groups array
   * @returns {string} Compiled GROUP BY clause
   */
  compileGroups(query, groups) {
    if (groups.length === 0) {
      return "";
    }

    const columns = groups.map((group) => this.wrapColumn(group)).join(", ");
    return `GROUP BY ${columns}`;
  }

  /**
   * Compile HAVING clauses
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} havings - Havings array
   * @returns {string} Compiled HAVING clauses
   */
  compileHavings(query, havings) {
    if (havings.length === 0) {
      return "";
    }

    const compiledHavings = havings
      .map((having, index) => {
        const boolean = index === 0 ? "" : ` ${having.boolean.toUpperCase()} `;

        if (having.type === "basic") {
          return `${boolean}${this.wrapColumn(having.column)} ${having.operator} ?`;
        }

        return "";
      })
      .join("");

    return `HAVING${compiledHavings}`;
  }

  /**
   * Compile ORDER BY clause
   *
   * @param {Builder} query - Query builder instance
   * @param {Array} orders - Orders array
   * @returns {string} Compiled ORDER BY clause
   */
  compileOrders(query, orders) {
    if (orders.length === 0) {
      return "";
    }

    const compiledOrders = orders
      .map((order) => {
        return `${this.wrapColumn(order.column)} ${order.direction.toUpperCase()}`;
      })
      .join(", ");

    return `ORDER BY ${compiledOrders}`;
  }

  /**
   * Compile LIMIT clause
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
   * Compile OFFSET clause
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
   * Compile an INSERT statement
   *
   * @param {Builder} query - Query builder instance
   * @param {Object|Array} data - Data to insert
   * @returns {string} Compiled INSERT SQL
   */
  compileInsert(query, data) {
    const table = this.wrapTable(query.components.from.table);

    if (Array.isArray(data)) {
      // Multiple rows
      const columns = Object.keys(data[0]);
      const columnsList = columns.map((col) => this.wrapColumn(col)).join(", ");
      const valuesList = data
        .map(() => `(${columns.map(() => "?").join(", ")})`)
        .join(", ");

      return `INSERT INTO ${table} (${columnsList}) VALUES ${valuesList}`;
    } else {
      // Single row
      const columns = Object.keys(data);
      const columnsList = columns.map((col) => this.wrapColumn(col)).join(", ");
      const placeholders = columns.map(() => "?").join(", ");

      return `INSERT INTO ${table} (${columnsList}) VALUES (${placeholders})`;
    }
  }

  /**
   * Compile an UPDATE statement
   *
   * @param {Builder} query - Query builder instance
   * @param {Object} data - Data to update
   * @returns {string} Compiled UPDATE SQL
   */
  compileUpdate(query, data) {
    const table = this.wrapTable(query.components.from.table);

    const assignments = Object.keys(data)
      .map((column) => {
        const value = data[column];
        // Handle raw SQL objects (like CASE statements)
        if (value && typeof value === "object" && value.raw === true) {
          // Add bindings from raw SQL object to query bindings (use columns since update bindings are excluded)
          if (value.bindings && value.bindings.length > 0) {
            if (!query.queries.columns) {
              query.queries.columns = { queries: [], bindings: [] };
            }
            query.queries.columns.bindings.push(...value.bindings);
          }
          return `${this.wrapColumn(column)} = ${value.value}`;
        }
        return `${this.wrapColumn(column)} = ?`;
      })
      .join(", ");

    let sql = `UPDATE ${table} SET ${assignments}`;

    const wheres = this.compileWheres(query, query.components.wheres);
    if (wheres) {
      sql += ` ${wheres}`;
    }

    return sql;
  }

  /**
   * Compile a DELETE statement
   *
   * @param {Builder} query - Query builder instance
   * @returns {string} Compiled DELETE SQL
   */
  compileDelete(query) {
    const table = this.wrapTable(query.components.from.table);

    let sql = `DELETE FROM ${table}`;

    const wheres = this.compileWheres(query, query.components.wheres);
    if (wheres) {
      sql += ` ${wheres}`;
    }

    return sql;
  }

  /**
   * Prepare bindings for INSERT
   *
   * @param {Object|Array} data - Data to insert
   * @returns {Array} Flattened bindings array
   */
  prepareBindingsForInsert(data) {
    if (Array.isArray(data)) {
      return data.flatMap((row) => Object.values(row));
    } else {
      return Object.values(data);
    }
  }

  /**
   * Wrap a column name with appropriate quotes/backticks
   *
   * @param {string} column - Column name
   * @returns {string} Wrapped column name
   */
  wrapColumn(column) {
    if (column === "*") {
      return column;
    }

    // Handle table.column format
    if (column.includes(".")) {
      const parts = column.split(".");
      return parts
        .map((part) => (part === "*" ? part : this.wrapValue(part)))
        .join(".");
    }

    return this.wrapValue(column);
  }

  /**
   * Wrap a table name with appropriate quotes/backticks
   * Handles table aliases properly (e.g., "users u" -> "users" AS "u")
   *
   * @param {string} table - Table name (may include alias)
   * @returns {string} Wrapped table name with proper alias syntax
   */
  wrapTable(table) {
    // Handle raw objects (subqueries, expressions)
    if (table && typeof table === "object" && table.raw === true) {
      return table.value;
    }

    // Handle explicit AS keyword: "users as u" -> "users" AS "u"
    if (table.includes(" as ") || table.includes(" AS ")) {
      const asMatch = table.match(/^(.+?)\s+(as|AS)\s+(.+)$/);
      if (asMatch) {
        const tableName = this.wrapValue(this.tablePrefix + asMatch[1]);
        const alias = this.wrapValue(asMatch[3]);
        return `${tableName} AS ${alias}`;
      }
    }

    // Check if table contains alias (space-separated without AS)
    const parts = table.trim().split(/\s+/);

    if (parts.length === 1) {
      // No alias, just wrap the table name
      return this.wrapValue(this.tablePrefix + parts[0]);
    } else if (parts.length === 2) {
      // Table with alias: "table alias" -> "table" AS "alias"
      const tableName = this.wrapValue(this.tablePrefix + parts[0]);
      const alias = this.wrapValue(parts[1]);
      return `${tableName} AS ${alias}`;
    } else {
      // Invalid format, just wrap as-is for backward compatibility
      return this.wrapValue(this.tablePrefix + table);
    }
  }

  /**
   * Wrap a value with database-specific quotes
   * Override in database-specific grammar classes
   *
   * @param {string} value - Value to wrap
   * @returns {string} Wrapped value
   */
  wrapValue(value) {
    if (value === "*") {
      return value;
    }
    return `"${value}"`;
  }

  /**
   * Process array with nested callback transformation
   * Mirrors PHP arrayNested functionality
   *
   * @param {Array} array - Array to process
   * @param {Function|string|null} forceValue - Transformation callback or constant value
   * @returns {Array} Processed array
   */
  arrayNested(array, forceValue = null) {
    return array.map((value) => {
      // Handle raw expressions
      if (value && typeof value === "object" && value.raw === true) {
        return value.value;
      }

      // Apply callback function if provided
      if (typeof forceValue === "function") {
        return forceValue(value);
      }

      // Apply constant value if provided
      if (forceValue !== null) {
        return forceValue;
      }

      // Return value as-is
      return value;
    });
  }

  /**
   * Format column names with backticks
   * Handles table.column notation and multiple arguments
   *
   * @param {string|Array|Object} value - Column name(s) to format
   * @returns {string} Formatted column name(s)
   */
  contactBacktick(value) {
    // Handle raw expressions
    if (value && typeof value === "object" && value.raw === true) {
      return value.value;
    }

    // Convert arguments to array if multiple arguments provided
    if (arguments.length > 1) {
      value = Array.from(arguments);
    } else if (typeof value === "string") {
      // Parse string notation like "table.column"
      const parts = value.split(".");
      if (parts.length > 1) {
        value = parts;
      } else {
        value = [value];
      }
    }

    // Ensure we have an array
    if (!Array.isArray(value)) {
      value = [value];
    }

    // Process each part: remove existing backticks and add new ones
    const processed = value.map((val) => {
      val = val.toString().trim().replace(/`/g, "");
      return `\`${val}\``;
    });

    return processed.join(".");
  }

  /**
   * Concatenate array segments with glue string
   * Filters out falsy values
   *
   * @param {Array} segments - Array of segments to concatenate
   * @param {string} glue - Separator between segments (default: space)
   * @returns {string} Concatenated string
   */
  concatenate(segments, glue = " ") {
    // Filter out falsy values and join with glue
    return segments.filter((segment) => segment).join(glue);
  }

  /**
   * Compile all SELECT components
   * Returns array of compiled component strings for flexible composition
   *
   * @param {Builder} query - Query builder instance
   * @returns {Array} Array of compiled component strings
   */
  compileComponents(query) {
    const components = [];

    for (const component of this.selectComponents) {
      const compiled = this._compileComponent(query, component);
      if (compiled) {
        components.push(compiled);
      }
    }

    return components;
  }
}
