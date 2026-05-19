/**
 * Builder - Query Builder class with fluent interface
 *
 * Complete implementation based on PHP Builder functionality
 * Provides chainable methods for building SQL queries
 */

export default class Builder {
  constructor(connection, grammar = null, processor = null) {
    // Core dependencies
    this.setConnection(connection).setGrammar(grammar).setProcessor(processor);

    // Query storage structure (matches PHP structure)
    this.queries = {
      columns: { queries: [], bindings: [] },
      froms: { queries: [], bindings: [] },
      joins: { queries: [], bindings: [] },
      wheres: { queries: [], bindings: [] },
      groups: { queries: [], bindings: [] },
      havings: { queries: [], bindings: [] },
      orders: { queries: [], bindings: [] },
      limits: { queries: [], bindings: [] },
      offset: { queries: [], bindings: [] },
      insert: { queries: [], bindings: [] },
      update: { queries: [], bindings: [] },
      unions: { queries: [], bindings: [] },
    };

    // Method categorization for dynamic calls
    this.methods = {
      set: ["table", "username", "password", "database", "host", "raw", "from"],
      process: ["insertGetId"],
      get: [
        "parseQueryLog",
        "lastParseQuery",
        "lastInsertId",
        "queryLog",
        "lastQueryLog",
      ],
    };

    // Complete operators list (matches PHP version)
    this.operators = [
      "=",
      "<",
      ">",
      "<=",
      ">=",
      "<>",
      "!=",
      "<=>",
      "like",
      "like binary",
      "not like",
      "ilike",
      "&",
      "|",
      "^",
      "<<",
      ">>",
      "&~",
      "rlike",
      "not rlike",
      "regexp",
      "not regexp",
      "~",
      "~*",
      "!~",
      "!~*",
      "similar to",
      "not similar to",
      "not ilike",
      "~~*",
      "!~~*",
      "is not",
      "is",
      "not in",
      "in",
      "exists",
      "not exists",
      "between",
      "not between",
    ];

    // Binding components that store parameters
    this.bindingComponents = [
      "columns",
      "froms",
      "joins",
      "insert",
      "update",
      "wheres",
      "groups",
      "havings",
      "orders",
      "limits",
      "unions",
    ];

    // Legacy components structure for backward compatibility
    this.components = {
      columns: [],
      from: null,
      joins: [],
      wheres: [],
      groups: [],
      havings: [],
      orders: [],
      limit: null,
      offset: null,
      unions: [],
    };

    // Legacy bindings for backward compatibility
    this.bindings = {
      select: [],
      from: [],
      join: [],
      where: [],
      groupBy: [],
      having: [],
      order: [],
      union: [],
      insert: [],
      update: [],
    };

    // Aggregate functions
    this.aggregates = ["count", "min", "max", "avg", "sum"];
  }

  /**
   * Set database connection with auto-detection of grammar and processor
   *
   * @param {Connection} connection - Database connection instance
   * @returns {Builder} This builder instance
   */
  setConnection(connection) {
    this.connection = connection;

    // Auto-select appropriate grammar and processor based on driver
    // Only if grammar and processor are not already set
    if (connection && connection.config && !this.grammar && !this.processor) {
      const driver = connection.config.driver;
      // Start loading components asynchronously but return immediately for backward compatibility
      this._setDatabaseSpecificComponents(driver).catch((error) => {
        console.warn("Failed to auto-load database components:", error.message);
      });
    }

    return this;
  }

  /**
   * Get database connection
   *
   * @returns {Connection} Database connection
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Set SQL grammar
   *
   * @param {Grammar} grammar - SQL grammar instance
   * @returns {Builder} This builder instance
   */
  setGrammar(grammar = null) {
    this.grammar = grammar;
    return this;
  }

  /**
   * Get SQL grammar
   *
   * @returns {Grammar} SQL grammar instance
   */
  getGrammar() {
    return this.grammar;
  }

  /**
   * Set result processor
   *
   * @param {Processor} processor - Result processor
   * @returns {Builder} This builder instance
   */
  setProcessor(processor = null) {
    this.processor = processor;
    return this;
  }

  /**
   * Get result processor
   *
   * @returns {Processor} Result processor
   */
  getProcessor() {
    return this.processor;
  }

  /**
   * Set database-specific grammar and processor components
   *
   * @param {string} driver - Database driver name
   * @private
   */
  async _setDatabaseSpecificComponents(driver) {
    try {
      switch (driver) {
        case "mysql":
        case "mysql2":
          {
            const { default: MySQLGrammar } =
              await import("./grammar/MySQL.js");
            const { default: MySQLProcessor } =
              await import("./processors/MySQLProcessor.js");
            this.grammar = new MySQLGrammar();
            this.processor = new MySQLProcessor();
          }
          break;

        case "postgres":
        case "postgresql":
        case "pg":
          {
            const { default: PostgreSQLGrammar } =
              await import("./grammar/PostgreSQL.js");
            const { default: PostgreSQLProcessor } =
              await import("./processors/PostgreSQLProcessor.js");
            this.grammar = new PostgreSQLGrammar();
            this.processor = new PostgreSQLProcessor();
          }
          break;

        case "sqlite":
        case "sqlite3":
          {
            const { default: SQLiteGrammar } =
              await import("./grammar/SQLite.js");
            const { default: SQLiteProcessor } =
              await import("./processors/SQLiteProcessor.js");
            this.grammar = new SQLiteGrammar();
            this.processor = new SQLiteProcessor();
          }
          break;

        default: // Use base classes as fallback
        {
          const { default: Grammar } = await import("./grammar/Grammar.js");
          const { default: Processor } =
            await import("./processors/Processor.js");
          this.grammar = new Grammar();
          this.processor = new Processor();
        }
      }
    } catch (error) {
      // Fallback to base classes if imports fail
      console.warn(
        `Failed to load database-specific components for driver "${driver}":`,
        error.message,
      );

      try {
        const { default: Grammar } = await import("./grammar/Grammar.js");
        const { default: Processor } =
          await import("./processors/Processor.js");
        this.grammar = new Grammar();
        this.processor = new Processor();
      } catch (fallbackError) {
        console.error(
          "Failed to load fallback grammar/processor:",
          fallbackError.message,
        );
        // Set to null if all attempts fail
        this.grammar = null;
        this.processor = null;
      }
    }
  }

  /**
   * Set queries object
   *
   * @param {object} queries - Queries object
   * @returns {Builder} This builder instance
   */
  setQueries(queries) {
    this.queries = queries;
    return this;
  }

  /**
   * Get queries object
   *
   * @returns {object} Queries object
   */
  getQueries() {
    return this.queries;
  }

  /**
   * Set a specific query component
   *
   * @param {string|object} key - Component key or object
   * @param {any} value - Component value
   * @returns {Builder} This builder instance
   */
  setQuery(key, value = null) {
    if (typeof key === "object") {
      Object.assign(this.queries, key);
    } else {
      this.queries[key] = value;
    }
    return this;
  }

  /**
   * Get a specific query component
   *
   * @param {string} key - Component key (supports dot notation)
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Component value
   */
  getQuery(key, defaultValue = null) {
    const keys = key.split(".");
    let current = this.queries;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * Create a new query instance
   *
   * @returns {Builder} New builder instance
   */
  newQuery() {
    return new this.constructor(this.connection, this.grammar, this.processor);
  }

  /**
   * Add a query component with bindings
   *
   * @param {string} component - Component name
   * @param {any} query - Query data
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  addQuery(component, query, bindings = []) {
    if (!this.queries[component]) {
      this.queries[component] = { queries: [], bindings: [] };
    }

    this.queries[component].queries.push(query);
    if (bindings.length > 0) {
      this.queries[component].bindings.push(...bindings);
    }

    return this;
  }

  /**
   * Get all bindings for specific components
   *
   * @param {array} except - Components to exclude
   * @returns {array} Flattened bindings array
   */
  getBindings(except = []) {
    const bindings = [];

    for (const component of this.bindingComponents) {
      if (!except.includes(component) && this.queries[component]) {
        bindings.push(...(this.queries[component].bindings || []));
      }
    }

    return bindings;
  }

  /**
   * Add binding values to a component
   *
   * @param {array|any} value - Binding value(s)
   * @param {string} type - Component type
   * @returns {Builder} This builder instance
   */
  addBinding(value, type = "where") {
    if (!this.queries[type]) {
      this.queries[type] = { queries: [], bindings: [] };
    }

    if (Array.isArray(value)) {
      this.queries[type].bindings.push(...value);
    } else {
      this.queries[type].bindings.push(value);
    }

    return this;
  }

  /**
   * Create a raw query expression
   *
   * @param {string} value - Raw SQL expression
   * @returns {object} Raw expression object
   */
  raw(value) {
    return { raw: true, value: value };
  }

  /**
   * Check if a value is a raw expression
   *
   * @param {any} value - Value to check
   * @returns {boolean} True if raw expression
   */
  isRaw(value) {
    return value && typeof value === "object" && value.raw === true;
  }

  /**
   * Compile the query to SQL
   *
   * @returns {string} Compiled SQL query
   */
  toSql() {
    if (!this.grammar) {
      throw new Error("Grammar not set. Cannot compile query.");
    }

    return this.grammar.compileSelect(this);
  }

  /**
   * Check if an operator is valid
   *
   * @param {string} operator - Operator to check
   * @returns {boolean} True if valid operator
   */
  invalidOperator(operator) {
    return !this.operators.includes(operator.toLowerCase());
  }

  /**
   * Prepare value and operator for where conditions
   *
   * @param {any} value - Value
   * @param {string} operator - Operator
   * @param {boolean} useDefault - Use default operator
   * @returns {array} [value, operator]
   */
  prepareValueAndOperator(value, operator, useDefault = false) {
    if (useDefault) {
      return [operator, "="];
    }

    if (this.invalidOperator(operator)) {
      return [operator, "="];
    }

    return [value, operator];
  }

  // === SELECT METHODS (PHP Builder compatibility) ===

  /**
   * Add raw SELECT expression
   *
   * @param {string} expression - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  selectRaw(expression, bindings = []) {
    return this.addQueryBindings(this.raw(expression), bindings, "columns");
  }

  /**
   * Add a subquery to SELECT
   *
   * @param {Function|Builder|string} column - Subquery callback or builder
   * @param {string} as - Alias for subquery
   * @returns {Builder} This builder instance
   */
  selectSub(column, as = null) {
    if (Array.isArray(column)) {
      return this.select(column);
    }

    const [query, bindings] = this.createSub(column);
    return this.selectRaw(this.subQueryAsContactBacktick(query, as), bindings);
  }

  // === FROM METHODS (PHP Builder compatibility) ===

  /**
   * Set the FROM clause with raw expression
   *
   * @param {string} expression - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  fromRaw(expression, bindings = []) {
    return this.addQueryBindings(expression, bindings, "froms");
  }

  /**
   * Set FROM tables
   *
   * @param {string|array|Function} froms - Table name(s) or subquery
   * @param {string} as - Alias for table
   * @returns {Builder} This builder instance
   */
  from(froms, as = null) {
    if (!Array.isArray(froms)) {
      if (as) {
        froms = { [as]: froms };
      } else {
        froms = [froms];
      }
    }

    if (Array.isArray(froms)) {
      // Convert array to object for consistent processing
      const fromsObj = {};
      froms.forEach((from, index) => {
        if (
          typeof from === "object" &&
          !Array.isArray(from) &&
          typeof from !== "function"
        ) {
          Object.assign(fromsObj, from);
        } else {
          fromsObj[index] = from;
        }
      });
      froms = fromsObj;
    }

    for (const [alias, from] of Object.entries(froms)) {
      const tableAs = isNaN(alias) ? alias : null;

      if (typeof from === "function") {
        this.fromSub(from, tableAs);
      } else {
        this.fromRaw(this.queryAsContactBacktick(from, tableAs));
      }
    }

    // Update legacy components for compatibility
    const fromQueries = this.getQuery("froms.queries", []);
    if (fromQueries.length > 0) {
      this.components.from = {
        type: "table",
        table: fromQueries[0],
        as: as,
      };
    }

    return this;
  }

  /**
   * Add subquery to FROM clause
   *
   * @param {Function|Builder|array} from - Subquery callback or builder
   * @param {string} as - Alias for subquery
   * @returns {Builder} This builder instance
   */
  fromSub(from, as = null) {
    if (Array.isArray(from)) {
      return this.from(from);
    }

    const [query, bindings] = this.createSub(from);
    return this.fromRaw(this.subQueryAsContactBacktick(query, as), bindings);
  }

  /**
   * Get FROM tables
   *
   * @returns {array} FROM queries
   */
  getFrom() {
    return this.getQuery("froms.queries", []);
  }

  /**
   * Set table (alias for from)
   *
   * @param {string|Function} table - Table name or subquery
   * @param {string} as - Alias for table
   * @returns {Builder} This builder instance
   */
  setTable(table, as = null) {
    return this.from(table, as);
  }

  /**
   * Get table name
   *
   * @returns {string} Table name
   */
  getTable() {
    const from = this.getFrom();
    return from.length > 0 ? from[0] : null;
  }

  // === HELPER METHODS ===

  /**
   * Add query with bindings
   *
   * @param {any} query - Query data
   * @param {array} bindings - Parameter bindings
   * @param {string} type - Query type
   * @returns {Builder} This builder instance
   */
  addQueryBindings(query, bindings = [], type) {
    this.addQuery(type, query);

    if (bindings.length > 0) {
      this.addBinding(bindings, type);
    }

    return this;
  }

  /**
   * Create subquery from callback or builder
   *
   * @param {Function|Builder} callback - Subquery callback or builder instance
   * @returns {array} [query, bindings]
   */
  createSub(callback) {
    let query, bindings;

    if (typeof callback === "function") {
      const subBuilder = this.newQuery();
      callback(subBuilder);
      query = subBuilder.toSql();
      bindings = subBuilder.getBindings();
    } else if (callback instanceof Builder) {
      query = callback.toSql();
      bindings = callback.getBindings();
    } else {
      throw new Error(
        "Invalid subquery type. Expected function or Builder instance.",
      );
    }

    return [query, bindings];
  }

  /**
   * Format query with alias and backticks
   *
   * @param {string} query - Query string
   * @param {string} as - Alias
   * @returns {string} Formatted query
   */
  queryAsContactBacktick(query, as = null) {
    if (!query) {
      return query;
    }

    // If it's already a raw expression, return as is
    if (this.isRaw(query)) {
      return query.value;
    }

    // Handle table.column format
    if (query.includes(".") && !query.includes(" ")) {
      return query; // Let grammar handle the backticks
    }

    // Handle alias
    if (as && typeof as === "string") {
      return `${query} AS ${as}`;
    }

    return query;
  }

  /**
   * Format subquery with alias and parentheses
   *
   * @param {string} query - Query string
   * @param {string} as - Alias
   * @returns {string} Formatted subquery
   */
  subQueryAsContactBacktick(query, as = null) {
    let formatted = `(${query})`;

    if (as) {
      formatted += ` AS ${as}`;
    }

    return formatted;
  }

  // === LEGACY COMPATIBILITY METHODS ===

  /**
   * Set the table for the query (legacy method)
   *
   * @param {string|Function} table - Table name or subquery
   * @param {string} as - Alias for the table
   * @returns {this}
   */
  table(table, as = null) {
    return this.from(table, as);
  }

  // === WHERE METHODS (Complete PHP Builder compatibility) ===

  /**
   * Add a WHERE clause with raw SQL
   *
   * @param {string} sql - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @param {string} andOr - Boolean operator (and/or)
   * @returns {Builder} This builder instance
   */
  whereRaw(sql, bindings = [], andOr = "and") {
    const andOrUpper = andOr.toUpperCase();
    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : ` ${andOrUpper} `;

    return this.addQueryBindings(`${prefix}${sql}`, bindings, "wheres");
  }

  /**
   * Add a WHERE clause with OR
   *
   * @param {string} sql - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  orWhereRaw(sql, bindings = []) {
    return this.whereRaw(sql, bindings, "or");
  }

  /**
   * Add a WHERE clause with flexible parameter handling
   *
   * Adds conditional filters to the query. This method supports multiple calling
   * styles including simple comparisons, nested conditions, and subqueries for
   * powerful and expressive query building.
   *
   * @param {string|Array|Function|Builder} column - Filter specification. Can be:
   *   - String: Column name for comparison (e.g., 'email', 'age')
   *   - Array: Multiple conditions [['col1', '=', 'val1'], ['col2', '>', 'val2']]
   *   - Function: Nested conditions callback for grouping with AND/OR logic
   *   - Builder: Subquery as column or condition
   *
   * @param {string} [operator=null] - Comparison operator. Supports:
   *   - Equality: '=', '<>', '!='
   *   - Comparison: '>', '>=', '<', '<='
   *   - Pattern: 'LIKE', 'NOT LIKE'
   *   - Range: 'IN', 'NOT IN', 'BETWEEN'
   *   - Null: 'IS NULL', 'IS NOT NULL'
   *   - Omit for implicit '=' operator (2-parameter calls only)
   *
   * @param {any} [value=null] - Value to compare. Can be:
   *   - Primitive: string, number, boolean, null
   *   - Builder: Subquery
   *   - Function: Callback for subquery
   *   - db.raw(): Raw SQL expression
   *
   * @param {string} [andOr='and'] - Logical operator ('and' or 'or') to combine with previous conditions
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If operator is invalid
   *
   * @example
   * // Simple equality
   * db.table('users').where('status', '=', 'active').get();
   *
   * @example
   * // Implicit equality operator (when only 2 parameters)
   * db.table('users').where('status', 'active').get();
   *
   * @example
   * // Comparison operators
   * db.table('products')
   *   .where('price', '>', 100)
   *   .where('stock', '>=', 10)
   *   .get();
   *
   * @example
   * // Array of multiple conditions (AND)
   * db.table('users').where([
   *   ['status', '=', 'active'],
   *   ['role', '=', 'admin'],
   *   ['verified', '=', true]
   * ]).get();
   *
   * @example
   * // Nested conditions with callback (grouping)
   * db.table('orders')
   *   .where('paid', true)
   *   .where(q => {
   *     q.where('shipped', true)
   *      .orWhere('processing', true);
   *   })
   *   .get();
   *
   * @example
   * // Subquery as condition
   * db.table('users')
   *   .where('id', '=', db.table('admins').select('user_id'))
   *   .get();
   *
   * @example
   * // OR condition
   * db.table('users')
   *   .where('status', 'active')
   *   .orWhere('premium', true)
   *   .get();
   */
  where(column, operator = null, value = null, andOr = "and") {
    // Handle array of conditions: [['col1', '=', 'val1'], ['col2', '>', 'val2']]
    if (Array.isArray(column)) {
      return this.arrayNested(column, andOr);
    }

    // Prepare value and operator (handle 2-parameter calls)
    [value, operator] = this.prepareValueAndOperator(
      value,
      operator,
      arguments.length === 2,
    );

    // Handle nested closures: where(function($query) { ... })
    if (typeof column === "function" && operator === null) {
      return this.whereNested(column, andOr);
    }

    // Handle subquery as column: where(subBuilder, '=', 'value')
    if (column instanceof Builder && operator !== null) {
      const [sub, bindings] = this.createSub(column);

      if (bindings.length > 0) {
        this.addBinding(bindings);
      }

      return this.where(this.raw(`(${sub})`), operator, value, andOr);
    }

    // Handle invalid operators
    if (this.invalidOperator(operator)) {
      [value, operator] = [operator, "="];
    }

    // Handle exists check: where(subBuilder)
    if (value === null && column instanceof Builder) {
      return this.whereExists(column, andOr);
    }

    // Handle subquery as value: where('col', '=', subBuilder)
    if (value instanceof Builder || typeof value === "function") {
      return this.whereSub(column, operator, value, andOr);
    }

    // Handle raw expressions
    if (this.isRaw(value)) {
      const andOrUpper = andOr.toUpperCase();
      const operatorUpper = operator.toUpperCase();
      return this.whereRaw(
        `${this.contactBacktick(column)} ${operatorUpper} ${value.value}`,
        [],
        andOrUpper,
      );
    }

    // Standard WHERE condition
    const andOrUpper = andOr.toUpperCase();
    const operatorUpper = operator.toUpperCase();
    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : ` ${andOrUpper} `;

    const whereClause = `${prefix}${this.contactBacktick(column)} ${operatorUpper} ?`;

    this.addQuery("wheres", whereClause, [value]);

    // Update legacy components for compatibility
    this.components.wheres.push({
      type: "basic",
      column: column,
      operator: operator,
      value: value,
      boolean: andOr,
    });

    this.bindings.where.push(value);

    return this;
  }

  /**
   * Add a WHERE clause with OR
   *
   * @param {string|array} column - Column name or array of conditions
   * @param {string} operator - Comparison operator
   * @param {any} value - Value to compare
   * @returns {Builder} This builder instance
   */
  orWhere(column, operator = null, value = null) {
    return this.where(column, operator, value, "or");
  }

  /**
   * Add a subquery WHERE clause
   *
   * @param {string} column - Column name
   * @param {string} operator - Comparison operator
   * @param {Function|Builder} callback - Subquery callback or builder
   * @param {string} andOr - Boolean operator (and/or)
   * @returns {Builder} This builder instance
   */
  whereSub(column, operator, callback = null, andOr = "and") {
    if (typeof operator === "string") {
      operator = operator.toLowerCase();
    }

    // Prepare callback and operator
    [callback, operator] = this.prepareValueAndOperator(
      callback,
      operator,
      arguments.length === 2,
    );

    const andOrUpper = andOr.toUpperCase();
    const operatorUpper = operator.toUpperCase();

    const [sql, bindings] = this.createSub(callback);

    return this.whereRaw(
      `${this.contactBacktick(column)} ${operatorUpper} (${sql})`,
      bindings,
      andOrUpper,
    );
  }

  /**
   * Add a subquery WHERE clause with OR
   *
   * @param {string} column - Column name
   * @param {string} operator - Comparison operator
   * @param {Function|Builder} callback - Subquery callback or builder
   * @returns {Builder} This builder instance
   */
  orWhereSub(column, operator, callback = null) {
    [callback, operator] = this.prepareValueAndOperator(
      callback,
      operator,
      arguments.length === 2,
    );

    return this.whereSub(column, operator, callback, "or");
  }

  /**
   * Add a WHERE NULL clause
   *
   * @param {string|array} column - Column name or array of columns
   * @param {string} operator - IS/IS NOT
   * @param {string} andOr - Boolean operator (and/or)
   * @param {boolean} not - Whether to use NOT NULL
   * @returns {Builder} This builder instance
   */
  whereNull(column, operator = "is", andOr = "and", not = false) {
    if (Array.isArray(column)) {
      return this.arrayNested(column, andOr, "whereNull");
    }

    const nullOperator = not ? "IS NOT NULL" : "IS NULL";
    const andOrUpper = andOr.toUpperCase();
    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : ` ${andOrUpper} `;

    return this.addQuery(
      "wheres",
      `${prefix}${this.contactBacktick(column)} ${nullOperator}`,
    );
  }

  /**
   * Add a WHERE NULL clause with OR
   *
   * @param {string} column - Column name
   * @param {string} operator - IS/IS NOT
   * @param {boolean} not - Whether to use NOT NULL
   * @returns {Builder} This builder instance
   */
  orWhereNull(column, operator = "is", not = false) {
    return this.whereNull(column, operator, "or", not);
  }

  /**
   * Add a WHERE NOT NULL clause
   *
   * @param {string} column - Column name
   * @returns {Builder} This builder instance
   */
  whereNotNull(column) {
    return this.whereNull(column, "is", "and", true);
  }

  /**
   * Add a WHERE NOT NULL clause with OR
   *
   * @param {string} column - Column name
   * @returns {Builder} This builder instance
   */
  orWhereNotNull(column) {
    return this.whereNull(column, "is", "or", true);
  }

  /**
   * Add a WHERE IN clause
   *
   * @param {string} column - Column name
   * @param {array|Builder|Function} values - Values array or subquery
   * @param {string} operator - IN/NOT IN
   * @returns {Builder} This builder instance
   */
  whereIn(column, values = null, operator = "in") {
    if (values instanceof Builder || typeof values === "function") {
      const [sql, bindings] = this.createSub(values);
      return this.whereRaw(
        `${this.contactBacktick(column)} ${operator.toUpperCase()} (${sql})`,
        bindings,
      );
    }

    if (!Array.isArray(values)) {
      values = [values];
    }

    const placeholders = values.map(() => "?").join(", ");
    const whereClause = `${this.contactBacktick(column)} ${operator.toUpperCase()} (${placeholders})`;

    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : " AND ";

    // Update legacy components for compatibility
    const whereType = operator.toLowerCase().replace(" ", "_");
    this.components.wheres.push({
      type: whereType, // 'in' or 'not_in'
      column: column,
      values: values,
      boolean: "and",
    });

    // Update legacy bindings for compatibility
    this.bindings.where.push(...values);

    return this.addQuery("wheres", `${prefix}${whereClause}`, values);
  }

  /**
   * Add a WHERE IN clause with OR
   *
   * @param {string} column - Column name
   * @param {array|Builder|Function} values - Values array or subquery
   * @param {string} operator - IN/NOT IN
   * @returns {Builder} This builder instance
   */
  orWhereIn(column, values = null, operator = "in") {
    if (values instanceof Builder || typeof values === "function") {
      const [sql, bindings] = this.createSub(values);
      return this.whereRaw(
        `${this.contactBacktick(column)} ${operator.toUpperCase()} (${sql})`,
        bindings,
        "or",
      );
    }

    if (!Array.isArray(values)) {
      values = [values];
    }

    const placeholders = values.map(() => "?").join(", ");
    const whereClause = `${this.contactBacktick(column)} ${operator.toUpperCase()} (${placeholders})`;

    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : " OR ";

    // Update legacy components for compatibility
    const whereType = operator.toLowerCase().replace(" ", "_");
    this.components.wheres.push({
      type: whereType, // 'in' or 'not_in'
      column: column,
      values: values,
      boolean: "or",
    });

    // Update legacy bindings for compatibility
    this.bindings.where.push(...values);

    return this.addQuery("wheres", `${prefix}${whereClause}`, values);
  }

  /**
   * Add a WHERE NOT IN clause
   *
   * @param {string} column - Column name
   * @param {array} values - Values array
   * @returns {Builder} This builder instance
   */
  whereNotIn(column, values = null) {
    return this.whereIn(column, values, "not in");
  }

  /**
   * Add a WHERE NOT IN clause with OR
   *
   * @param {string} column - Column name
   * @param {array} values - Values array
   * @returns {Builder} This builder instance
   */
  orWhereNotIn(column, values = null) {
    return this.orWhereIn(column, values, "not in");
  }

  /**
   * Add a WHERE LIKE clause
   *
   * @param {string} column - Column name
   * @param {string} value - LIKE pattern
   * @param {string} andOr - Boolean operator (and/or)
   * @returns {Builder} This builder instance
   */
  whereLike(column, value = null, andOr = "and") {
    if (Array.isArray(column)) {
      return this.arrayNested(column, andOr, "whereLike");
    }

    return this.where(column, "like", value, andOr);
  }

  /**
   * Add a WHERE LIKE clause with OR
   *
   * @param {string} column - Column name
   * @param {string} value - LIKE pattern
   * @returns {Builder} This builder instance
   */
  orWhereLike(column, value = null) {
    return this.whereLike(column, value, "or");
  }

  /**
   * Add a WHERE EXISTS clause
   *
   * @param {Function|Builder} callback - Subquery callback or builder
   * @param {string} andOr - Boolean operator (and/or)
   * @param {boolean} not - Whether to use NOT EXISTS
   * @returns {Builder} This builder instance
   */
  whereExists(callback, andOr = "and", not = false) {
    const [sql, bindings] = this.createSub(callback);
    const existsOperator = not ? "NOT EXISTS" : "EXISTS";

    return this.whereRaw(`${existsOperator} (${sql})`, bindings, andOr);
  }

  /**
   * Add a WHERE NOT EXISTS clause
   *
   * @param {Function|Builder} callback - Subquery callback or builder
   * @returns {Builder} This builder instance
   */
  whereNotExists(callback) {
    return this.whereExists(callback, "and", true);
  }

  /**
   * Add a WHERE EXISTS clause with OR
   *
   * @param {Function|Builder} callback - Subquery callback or builder
   * @param {boolean} not - Whether to use NOT EXISTS
   * @returns {Builder} This builder instance
   */
  orWhereExists(callback, not = false) {
    return this.whereExists(callback, "or", not);
  }

  /**
   * Add a WHERE NOT EXISTS clause with OR
   *
   * @param {Function|Builder} callback - Subquery callback or builder
   * @returns {Builder} This builder instance
   */
  orWhereNotExists(callback) {
    return this.whereExists(callback, "or", true);
  }

  /**
   * Add a WHERE BETWEEN clause
   *
   * @param {string} column - Column name
   * @param {array} values - [min, max] values
   * @param {boolean} not - Whether to use NOT BETWEEN
   * @returns {Builder} This builder instance
   */
  whereBetween(column, values, not = false) {
    if (!Array.isArray(values) || values.length !== 2) {
      throw new Error(
        "Between values must be an array with exactly 2 elements",
      );
    }

    const betweenOperator = not ? "NOT BETWEEN" : "BETWEEN";
    const whereClause = `${this.contactBacktick(column)} ${betweenOperator} ? AND ?`;

    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : " AND ";

    return this.addQuery("wheres", `${prefix}${whereClause}`, values);
  }

  /**
   * Add a WHERE BETWEEN clause with OR
   *
   * @param {string} column - Column name
   * @param {array} values - [min, max] values
   * @param {boolean} not - Whether to use NOT BETWEEN
   * @returns {Builder} This builder instance
   */
  orWhereBetween(column, values, not = false) {
    if (!Array.isArray(values) || values.length !== 2) {
      throw new Error(
        "Between values must be an array with exactly 2 elements",
      );
    }

    const betweenOperator = not ? "NOT BETWEEN" : "BETWEEN";
    const whereClause = `${this.contactBacktick(column)} ${betweenOperator} ? AND ?`;

    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : " OR ";

    return this.addQuery("wheres", `${prefix}${whereClause}`, values);
  }

  /**
   * Add a WHERE NOT BETWEEN clause
   *
   * @param {string} column - Column name
   * @param {array} values - [min, max] values
   * @returns {Builder} This builder instance
   */
  whereNotBetween(column, values) {
    return this.whereBetween(column, values, true);
  }

  /**
   * Add a WHERE NOT BETWEEN clause with OR
   *
   * @param {string} column - Column name
   * @param {array} values - [min, max] values
   * @returns {Builder} This builder instance
   */
  orWhereNotBetween(column, values) {
    return this.orWhereBetween(column, values, true);
  }

  /**
   * Add nested WHERE conditions
   *
   * @param {Function} callback - Nested conditions callback
   * @param {string} andOr - Boolean operator (and/or)
   * @returns {Builder} This builder instance
   */
  whereNested(callback, andOr = "and") {
    const nestedQuery = this.newQuery();
    callback(nestedQuery);

    const nestedWheres = nestedQuery.getQuery("wheres.queries", []);
    if (nestedWheres.length > 0) {
      const nestedSql = nestedWheres.join("");
      const nestedBindings = nestedQuery.getQuery("wheres.bindings", []);

      const existingWheres = this.getQuery("wheres.queries", []);
      const prefix =
        existingWheres.length === 0 ? "" : ` ${andOr.toUpperCase()} `;

      return this.addQuery("wheres", `${prefix}(${nestedSql})`, nestedBindings);
    }

    return this;
  }

  // === HELPER METHODS FOR WHERE ===

  /**
   * Handle array nested conditions
   *
   * @param {array} conditions - Array of condition arrays
   * @param {string} andOr - Boolean operator
   * @param {string} method - Method name to call
   * @returns {Builder} This builder instance
   */
  arrayNested(conditions, andOr = "and", method = "where") {
    for (const condition of conditions) {
      if (Array.isArray(condition)) {
        const [column, operator, value, conditionAndOr] = condition;
        this[method](column, operator, value, conditionAndOr || andOr);
      }
    }
    return this;
  }

  /**
   * Add backticks to column names
   *
   * @param {string} column - Column name
   * @returns {string} Column with backticks
   */
  contactBacktick(column) {
    if (!column || this.isRaw(column)) {
      return this.isRaw(column) ? column.value : column;
    }

    // Handle table.column format
    if (column.includes(".")) {
      const parts = column.split(".");
      return parts.map((part) => `\`${part.trim()}\``).join(".");
    }

    return `\`${column.trim()}\``;
  }

  /**
   * Set the FROM clause (legacy method)
   *
   * @param {string|Function} table - Table name or subquery
   * @param {string} as - Alias for the table
   * @returns {this}
   */
  from(table, as = null) {
    if (typeof table === "function") {
      // Handle subquery
      const subBuilder = new Builder(
        this.connection,
        this.grammar,
        this.processor,
      );
      table(subBuilder);

      this.components.from = {
        type: "subquery",
        query: subBuilder,
        as: as,
      };
    } else {
      this.components.from = {
        type: "table",
        table: table,
        as: as,
      };
    }

    return this;
  }

  // === JOIN METHODS (Complete PHP Builder compatibility with Node.js enhancements) ===

  /**
   * Add a JOIN clause with advanced Node.js features
   *
   * Creates an INNER JOIN (or other specified type) between the current table and another table,
   * allowing you to combine rows from multiple tables based on join conditions. Supports callback-based
   * complex joins, string-based conditions, and various parameter combinations.
   *
   * @param {string|Function|Builder} table - Table name, subquery callback, or Builder instance
   * @param {string|Function} first - First join condition or callback:
   *                                    - `string`: Left column name for comparison
   *                                    - `Function`: Callback to define complex join conditions
   * @param {string} [operator] - Comparison operator (=, <, >, <=, >=, !=, like, etc.)
   *                               Defaults to '=' if omitted
   * @param {string|number|boolean|null} [second] - Right column/value for comparison
   * @param {string} [type='inner'] - Join type: 'inner', 'left', 'right', 'full', 'cross'
   * @param {boolean} [isWhere=false] - If true, uses WHERE instead of ON clause
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If operator is invalid or join syntax is incorrect
   *
   * @example
   * // Simple join with explicit columns
   * db.table('users')
   *   .select('users.id', 'users.name', 'posts.title')
   *   .join('posts', 'users.id', '=', 'posts.user_id')
   *   .get();
   *
   * @example
   * // Join with 2 parameters (assumes '=' operator)
   * db.table('orders')
   *   .join('customers', 'orders.customer_id', 'customers.id')
   *   .select(['orders.*', 'customers.name'])
   *   .get();
   *
   * @example
   * // Callback-based join for complex conditions
   * db.table('users')
   *   .join('posts', (join) => {
   *     join.on('users.id', '=', 'posts.user_id')
   *         .on('posts.status', '=', 'published');
   *   })
   *   .select(['users.*', 'posts.*'])
   *   .get();
   *
   * @example
   * // Join with additional WHERE clause
   * db.table('orders')
   *   .join('customers', 'orders.customer_id', 'customers.id')
   *   .where('orders.total', '>', 100)
   *   .get();
   */
  join(
    table,
    first,
    operator = null,
    second = null,
    type = "inner",
    isWhere = false,
  ) {
    // Use JoinBuilder for cleaner architecture
    const joinBuilder = new JoinBuilder(this, table, type);

    // Handle callback-based joins
    if (typeof first === "function") {
      first(joinBuilder);
      return this; // The callback already called finalize via on(), just return builder
    }

    // Handle different parameter combinations like original join method
    const actualFirst = first;
    let actualOperator = operator;
    let actualSecond = second;

    // Handle 2-parameter calls: join(table, condition)
    if (arguments.length === 2) {
      actualSecond = first;
      actualOperator = "=";
    }

    // Handle 3-parameter calls: join(table, first, second)
    if (arguments.length === 3) {
      actualSecond = operator;
      actualOperator = "=";
    }

    // Validate operator (use the same logic as original join)
    if (this.invalidOperator(actualOperator)) {
      actualSecond = actualOperator;
      actualOperator = "=";
    }

    return joinBuilder.on(actualFirst, actualOperator, actualSecond);
  }

  /**
   * Add a LEFT JOIN clause
   *
   * Creates a LEFT JOIN between tables, including all rows from the left table even if
   * there are no matching rows in the right table. Non-matching right table columns will be NULL.
   *
   * @param {string} table - Right table name to join with
   * @param {string|Function} first - Join condition:
   *                                   - `string`: Left table column name
   *                                   - `Function`: Callback for complex conditions
   * @param {string} [operator] - Comparison operator (defaults to '=')
   * @param {string|number|boolean} [second] - Right table column name or value
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If join condition syntax is invalid
   *
   * @example
   * // Basic LEFT JOIN - all users with their posts (if any)
   * db.table('users')
   *   .leftJoin('posts', 'users.id', 'posts.user_id')
   *   .select(['users.id', 'users.name', 'posts.title'])
   *   .get();
   *
   * @example
   * // LEFT JOIN with WHERE clause
   * db.table('customers')
   *   .leftJoin('orders', 'customers.id', 'orders.customer_id')
   *   .where('customers.status', 'active')
   *   .select(['customers.name', 'COUNT(orders.id) as order_count'])
   *   .groupBy('customers.id')
   *   .get();
   *
   * @example
   * // Multiple LEFT JOINs
   * db.table('users')
   *   .leftJoin('profiles', 'users.id', 'profiles.user_id')
   *   .leftJoin('settings', 'users.id', 'settings.user_id')
   *   .select(['users.*', 'profiles.bio', 'settings.theme'])
   *   .get();
   */
  leftJoin(table, first, operator = null, second = null) {
    return this.join(table, first, operator, second, "left");
  }

  /**
   * Add a RIGHT JOIN clause
   *
   * Creates a RIGHT JOIN between tables, including all rows from the right table even if
   * there are no matching rows in the left table. Non-matching left table columns will be NULL.
   *
   * @param {string} table - Right table name to join with
   * @param {string|Function} first - Join condition:
   *                                   - `string`: Left table column name
   *                                   - `Function`: Callback for complex conditions
   * @param {string} [operator] - Comparison operator (defaults to '=')
   * @param {string|number|boolean} [second] - Right table column name or value
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If join condition syntax is invalid
   *
   * @example
   * // Basic RIGHT JOIN - all posts with their users (if any)
   * db.table('users')
   *   .rightJoin('posts', 'users.id', 'posts.user_id')
   *   .select(['users.name', 'posts.title', 'posts.content'])
   *   .get();
   *
   * @example
   * // RIGHT JOIN with conditions
   * db.table('employees')
   *   .rightJoin('departments', 'employees.dept_id', 'departments.id')
   *   .where('departments.active', 1)
   *   .select(['departments.name', 'employees.name', 'employees.salary'])
   *   .orderBy('departments.name')
   *   .get();
   */
  rightJoin(table, first, operator = null, second = null) {
    return this.join(table, first, operator, second, "right");
  }

  /**
   * Add a FULL JOIN clause (Node.js enhancement)
   *
   * @param {string} table - Table name
   * @param {string|Function} first - First condition or callback
   * @param {string} operator - Join operator
   * @param {string} second - Second condition
   * @returns {Builder} This builder instance
   */
  fullJoin(table, first, operator = null, second = null) {
    return this.join(table, first, operator, second, "full");
  }

  /**
   * Add a CROSS JOIN clause
   *
   * Creates a CROSS JOIN which returns the Cartesian product of two tables - combining each row
   * from the left table with every row from the right table. No join condition is needed.
   * Warning: CROSS JOINs can produce very large result sets when joining large tables.
   *
   * @param {string} table - Table name to cross join with
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @example
   * // CROSS JOIN to create all combinations
   * db.table('sizes')
   *   .crossJoin('colors')
   *   .select(['sizes.name as size', 'colors.name as color'])
   *   .get();
   * // Results in: every size paired with every color (sizes.length × colors.length rows)
   *
   * @example
   * // CROSS JOIN with limited data
   * db.table('days')
   *   .crossJoin('shifts')
   *   .select(['days.date', 'shifts.start_time', 'shifts.end_time'])
   *   .where('days.date', '>=', '2024-01-01')
   *   .limit(100)
   *   .get();
   */
  crossJoin(table) {
    const joinClause = `CROSS JOIN ${table}`;

    this.components.joins.push({
      type: "cross",
      table: table,
      first: null,
      operator: null,
      second: null,
    });

    return this.addQuery("joins", joinClause);
  }

  /**
   * Add a JOIN clause with WHERE condition
   *
   * @param {string} table - Table name
   * @param {string|Function} first - First condition or callback
   * @param {string} operator - Join operator
   * @param {string} second - Second condition
   * @param {string} type - Join type
   * @returns {Builder} This builder instance
   */
  joinWhere(table, first, operator = null, second = null, type = "inner") {
    return this.join(table, first, operator, second, type, true);
  }

  /**
   * Add a subquery JOIN clause
   *
   * Joins the current table with a subquery as if it were a regular table. This allows you to
   * join with filtered or aggregated data without creating a separate database view.
   * The subquery can be defined using a callback function or a Builder instance.
   *
   * @param {Function|Builder|string} table - Subquery definition:
   *                                          - `Function`: Callback receiving a Builder to define subquery
   *                                          - `Builder`: Pre-constructed query builder instance
   *                                          - `string`: Raw SQL subquery string
   * @param {string} as - Table alias for the subquery in the join
   * @param {string|Function} first - Join condition:
   *                                   - `string`: Column name from main table
   *                                   - `Function`: Callback for complex join conditions
   * @param {string} [operator] - Comparison operator (defaults to '=')
   * @param {string|number|boolean} [second] - Column from subquery or constant value
   * @param {string} [type='inner'] - Join type: 'inner', 'left', 'right', 'full'
   * @param {boolean} [isWhere=false] - If true, uses WHERE instead of ON clause
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If subquery or join condition is invalid
   *
   * @example
   * // Join with subquery callback
   * db.table('users')
   *   .joinSub(
   *     (q) => q.table('orders')
   *              .select('user_id', db.raw('COUNT(*) as total'))
   *              .where('status', 'completed')
   *              .groupBy('user_id'),
   *     'order_summary',
   *     'users.id', '=', 'order_summary.user_id'
   *   )
   *   .select(['users.name', 'order_summary.total'])
   *   .get();
   *
   * @example
   * // Join with Builder instance subquery
   * const recentOrders = db.table('orders')
   *   .where('created_at', '>', '2024-01-01')
   *   .select('id', 'user_id', 'total');
   *
   * db.table('users')
   *   .joinSub(recentOrders, 'recent', 'users.id', 'recent.user_id')
   *   .get();
   */
  joinSub(
    table,
    as,
    first,
    operator = null,
    second = null,
    type = "inner",
    isWhere = false,
  ) {
    const [query, bindings] = this.createSub(table);

    if (bindings.length > 0) {
      this.addBinding(bindings, "joins");
    }

    const subqueryTable = `(${query}) AS ${this.contactBacktick(as)}`;

    const rawTable = this.raw(subqueryTable);

    return this.join(rawTable, first, operator, second, type, isWhere);
  }

  /**
   * Add a subquery JOIN clause with WHERE condition
   *
   * @param {Function|Builder|string} table - Subquery callback, builder, or SQL
   * @param {string} as - Alias for subquery
   * @param {string|Function} first - First condition or callback
   * @param {string} operator - Join operator
   * @param {string} second - Second condition
   * @param {string} type - Join type
   * @returns {Builder} This builder instance
   */
  joinWhereSub(
    table,
    as,
    first,
    operator = null,
    second = null,
    type = "inner",
  ) {
    return this.joinSub(table, as, first, operator, second, type, true);
  }

  /**
   * Add a LEFT JOIN with subquery
   *
   * Performs a LEFT JOIN with a subquery, retaining all rows from the main table
   * even if there are no matches in the subquery result.
   *
   * @param {Function|Builder|string} table - Subquery definition
   * @param {string} as - Table alias for the subquery
   * @param {string|Function} first - Join condition (left table column or callback)
   * @param {string} [operator] - Comparison operator (defaults to '=')
   * @param {string|number|boolean} [second] - Subquery column or value to compare
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If subquery or join condition is invalid
   *
   * @example
   * // LEFT JOIN with subquery - all users with their order counts
   * db.table('users')
   *   .leftJoinSub(
   *     (q) => q.table('orders')
   *             .select('user_id', db.raw('COUNT(*) as count'))
   *             .groupBy('user_id'),
   *     'order_count',
   *     'users.id', 'order_count.user_id'
   *   )
   *   .select(['users.name', db.raw('COALESCE(order_count.count, 0) as total_orders')])
   *   .orderBy('total_orders', 'desc')
   *   .get();
   */
  leftJoinSub(table, as, first, operator = null, second = null) {
    return this.joinSub(table, as, first, operator, second, "left");
  }

  /**
   * Add a RIGHT JOIN with subquery
   *
   * Performs a RIGHT JOIN with a subquery, retaining all rows from the subquery result
   * even if there are no matches in the main table.
   *
   * @param {Function|Builder|string} table - Subquery definition
   * @param {string} as - Table alias for the subquery
   * @param {string|Function} first - Join condition (left table column or callback)
   * @param {string} [operator] - Comparison operator (defaults to '=')
   * @param {string|number|boolean} [second] - Subquery column or value to compare
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If subquery or join condition is invalid
   *
   * @example
   * // RIGHT JOIN with subquery - all records from subquery with matching users
   * db.table('users')
   *   .rightJoinSub(
   *     (q) => q.table('archived_posts')
   *             .where('year', 2023),
   *     'archive',
   *     'users.id', '=', 'archive.user_id'
   *   )
   *   .select(['users.name', 'archive.title', 'archive.created_at'])
   *   .get();
   */
  rightJoinSub(table, as, first, operator = null, second = null) {
    return this.joinSub(table, as, first, operator, second, "right");
  }

  /**
   * Add a LEFT JOIN with subquery
   *
   * @param {Function|Builder|string} table - Subquery
   * @param {string} as - Alias
   * @param {string|Function} first - First condition
   * @param {string} operator - Join operator
   * @param {string} second - Second condition
   * @returns {Builder} This builder instance
   */
  leftJoinWhereSub(table, as, first, operator = null, second = null) {
    return this.joinWhereSub(table, as, first, operator, second, "left");
  }

  /**
   * Add a RIGHT JOIN with subquery
   *
   * @param {Function|Builder|string} table - Subquery
   * @param {string} as - Alias
   * @param {string|Function} first - First condition
   * @param {string} operator - Join operator
   * @param {string} second - Second condition
   * @returns {Builder} This builder instance
   */
  rightJoinWhereSub(table, as, first, operator = null, second = null) {
    return this.joinWhereSub(table, as, first, operator, second, "right");
  }

  /**
   * Add an async JOIN clause (Node.js enhancement)
   *
   * @param {string} table - Table name
   * @param {Function} asyncCallback - Async callback for complex join conditions
   * @param {string} type - Join type
   * @returns {Promise<Builder>} This builder instance
   */
  async joinAsync(table, asyncCallback, type = "inner") {
    const joinClause = this.newJoinClause(this, type, table);

    // Execute async callback
    await asyncCallback(joinClause);

    const queries = joinClause.getQuery("joins.queries", []);
    const bindings = joinClause.getQuery("joins.bindings", []);

    if (bindings.length > 0) {
      this.addBinding(bindings, "joins");
    }

    const sql = queries.join(" ");
    const processedSql = this.firstJoinReplace(sql);

    const typeUpper = type.toUpperCase();
    this.addQuery("joins", `${typeUpper} JOIN ${table} ON ${processedSql}`);

    return this;
  }

  /**
   * Add conditional JOIN based on runtime conditions (Node.js enhancement)
   *
   * @param {boolean|Function} condition - Condition to check
   * @param {Function} joinCallback - JOIN callback when condition is true
   * @param {Function} elseCallback - Optional else callback
   * @returns {Builder} This builder instance
   */
  joinWhen(condition, joinCallback, elseCallback = null) {
    const shouldJoin =
      typeof condition === "function" ? condition() : condition;

    if (shouldJoin) {
      joinCallback(this);
    } else if (elseCallback) {
      elseCallback(this);
    }

    return this;
  }

  /**
   * Add multiple JOINs with array configuration (Node.js enhancement)
   *
   * @param {Array} joinsConfig - Array of join configurations
   * @returns {Builder} This builder instance
   */
  joinMultiple(joinsConfig) {
    for (const config of joinsConfig) {
      const {
        table,
        first,
        operator = "=",
        second,
        type = "inner",
        isWhere = false,
      } = config;

      this.join(table, first, operator, second, type, isWhere);
    }

    return this;
  }

  // === JOIN HELPER METHODS ===

  /**
   * Create a new JOIN clause builder
   *
   * @param {Builder} parentQuery - Parent query builder
   * @param {string} type - Join type
   * @param {string} table - Table name
   * @returns {JoinClause} Join clause builder
   */
  newJoinClause(parentQuery, type, table) {
    // For now, return a simplified join clause
    // In a full implementation, this would return a specialized JoinClause class
    const joinClause = this.newQuery();
    joinClause.joinType = type;
    joinClause.joinTable = table;

    // Add on() method for join conditions
    joinClause.on = (first, operator, second, boolean = "and") => {
      // Handle 2-parameter case: on('col1', 'col2')
      if (arguments.length === 2) {
        second = operator; // second column
        operator = "="; // default operator
      }
      // Handle 3-parameter case: on('col1', '=', 'col2') or on('col1', 'operator', 'col2')
      else if (arguments.length === 3) {
        // If operator is not a valid operator, treat it as second column
        if (
          operator &&
          operator !== "=" &&
          operator !== "!=" &&
          operator !== "<" &&
          operator !== ">" &&
          operator !== "<=" &&
          operator !== ">=" &&
          operator !== "<>"
        ) {
          boolean = second; // third param is boolean
          second = operator; // second param is second column
          operator = "="; // default operator
        }
      }

      const booleanUpper = boolean ? boolean.toUpperCase() : "AND";
      const existingJoins = joinClause.getQuery("joins.queries", []);
      const prefix = existingJoins.length === 0 ? "" : ` ${booleanUpper} `;

      const wrappedFirst = this.contactBacktick(first);
      const wrappedSecond = this.contactBacktick(second);

      const condition = `${prefix}${wrappedFirst} ${operator} ${wrappedSecond}`;

      joinClause.addQuery("joins", condition);

      return joinClause;
    };

    // Add orOn() method
    joinClause.orOn = (first, operator = "=", second = null) => {
      return joinClause.on(first, operator, second, "or");
    };

    return joinClause;
  }

  /**
   * Replace first AND/OR in join conditions
   *
   * @param {string} query - Query string
   * @returns {string} Processed query
   */
  firstJoinReplace(query) {
    return query.replace(/^(\s*)(AND|OR)(\s+)/i, "");
  }

  /**
   * Set the columns to SELECT
   *
   * Specifies which columns to retrieve from the database. This method can accept
   * multiple input formats for flexibility and supports raw SQL expressions.
   *
   * @param {Array|string|...string} columns - Columns to select. Can be:
   *   - String: 'col1, col2, col3' (comma-separated list)
   *   - Array: ['col1', 'col2', 'col3']
   *   - Multiple arguments: .select('col1', 'col2', 'col3')
   *   - Raw expressions: .select(db.raw('COUNT(*) as total'))
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If columns parameter is invalid
   *
   * @example
   * // String format with comma-separated list
   * db.table('users').select('id, name, email').get();
   *
   * @example
   * // Array format (recommended)
   * db.table('users').select(['id', 'name', 'email']).get();
   *
   * @example
   * // Multiple arguments
   * db.table('users').select('id', 'name', 'email').get();
   *
   * @example
   * // With raw SQL expressions
   * db.table('orders')
   *   .select('id', db.raw('COUNT(*) as total'))
   *   .groupBy('user_id')
   *   .get();
   */
  select(columns) {
    if (arguments.length == 1 && typeof columns === "string") {
      columns = columns.split(",").map((column) => column.trim());
    }

    if (!Array.isArray(columns)) {
      columns = Array.from(arguments);
    }

    this.components.columns = columns.map((column) => {
      // Handle raw objects (like CASE statements)
      if (column && typeof column === "object" && column.raw === true) {
        return column; // Return raw object as-is
      }
      return { type: "column", column: column };
    });

    return this;
  }

  // === GROUP BY METHODS (PHP Builder compatibility with Node.js enhancements) ===

  /**
   * Add a GROUP BY clause with raw SQL
   *
   * @param {string} sql - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  groupByRaw(sql, bindings = []) {
    return this.addQueryBindings(sql, bindings, "groups");
  }

  /**
   * Add a GROUP BY clause
   *
   * Groups rows by one or more columns, aggregating data for analysis. Often used with
   * aggregate functions like COUNT(), SUM(), AVG(), MIN(), MAX(). Supports single columns,
   * multiple columns via array, and subqueries.
   *
   * @param {string|Array|Function|Builder} column - Column(s) to group by:
   *                                                  - `string`: Single column name
   *                                                  - `Array`: Multiple columns like [['col1', 'ASC'], ['col2', 'DESC']]
   *                                                  - `Function`: Callback for subquery grouping
   *                                                  - `Builder`: Pre-constructed subquery builder
   * @param {string} [sort='ASC'] - Sort direction within grouping: 'ASC' or 'DESC'
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If column name is invalid or sorting direction is not ASC/DESC
   *
   * @example
   * // Group by single column with aggregate
   * db.table('orders')
   *   .select(['customer_id', db.raw('COUNT(*) as order_count')])
   *   .groupBy('customer_id')
   *   .get();
   *
   * @example
   * // Group by multiple columns
   * db.table('sales')
   *   .select(['region', 'product', db.raw('SUM(amount) as total')])
   *   .groupBy([['region', 'ASC'], ['product', 'ASC']])
   *   .orderBy('total', 'desc')
   *   .get();
   *
   * @example
   * // Group by with HAVING clause (filter aggregated results)
   * db.table('orders')
   *   .select(['user_id', db.raw('COUNT(*) as count')])
   *   .groupBy('user_id')
   *   .having('count', '>', 5)
   *   .get();
   *
   * @example
   * // Group by with subquery
   * db.table('transactions')
   *   .select(['month', db.raw('SUM(amount) as monthly_total')])
   *   .groupBy((q) => q.raw('DATE_FORMAT(created_at, "%Y-%m")'))
   *   .get();
   */
  groupBy(column, sort = "ASC") {
    // Handle array of columns: [['col1', 'ASC'], ['col2', 'DESC']]
    if (Array.isArray(column)) {
      return this.arrayNested(column, "", "groupBy");
    }

    const sortUpper = sort.toUpperCase();

    // Handle subquery or callback
    if (typeof column === "function" || column instanceof Builder) {
      return this.groupBySub(column, sortUpper);
    }

    // Standard column grouping
    const groupClause = `${this.contactBacktick(column)} ${sortUpper}`;

    // Update legacy components for compatibility
    this.components.groups.push(column);

    return this.addQuery("groups", groupClause);
  }

  /**
   * Add a GROUP BY clause with subquery
   *
   * @param {Function|Builder} column - Subquery callback or builder
   * @param {string} sort - Sort direction
   * @returns {Builder} This builder instance
   */
  groupBySub(column, sort = "ASC") {
    const [sub, bindings] = this.createSub(column);
    return this.groupByRaw(`(${sub}) ${sort}`, bindings);
  }

  /**
   * Add GROUP BY in ascending order
   *
   * @param {string} column - Column name
   * @returns {Builder} This builder instance
   */
  groupByAsc(column) {
    return this.groupBy(column, "ASC");
  }

  /**
   * Add GROUP BY in descending order
   *
   * @param {string} column - Column name
   * @returns {Builder} This builder instance
   */
  groupByDesc(column) {
    return this.groupBy(column, "DESC");
  }

  /**
   * Add nested GROUP BY conditions (Node.js enhancement)
   *
   * @param {Function} callback - Nested conditions callback
   * @param {string} join - Join type (not used in GROUP BY)
   * @returns {Builder} This builder instance
   */
  groupByNested(callback, join = "") {
    const nestedQuery = this.newQuery();
    callback(nestedQuery);

    const nestedGroups = nestedQuery.getQuery("groups.queries", []);
    if (nestedGroups.length > 0) {
      const nestedBindings = nestedQuery.getQuery("groups.bindings", []);

      for (const group of nestedGroups) {
        this.addQuery("groups", group);
      }

      if (nestedBindings.length > 0) {
        this.addBinding(nestedBindings, "groups");
      }
    }

    return this;
  }

  // === HAVING METHODS (PHP Builder compatibility with Node.js enhancements) ===

  /**
   * Add a HAVING clause with raw SQL
   *
   * @param {string} sql - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @param {string} andOr - Boolean operator (and/or)
   * @returns {Builder} This builder instance
   */
  havingRaw(sql, bindings = [], andOr = "and") {
    const andOrUpper = andOr.toUpperCase();
    const existingHavings = this.getQuery("havings.queries", []);
    const prefix = existingHavings.length === 0 ? "" : ` ${andOrUpper} `;

    return this.addQueryBindings(`${prefix}${sql}`, bindings, "havings");
  }

  /**
   * Add a HAVING clause with OR
   *
   * @param {string} sql - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  orHavingRaw(sql, bindings = []) {
    return this.havingRaw(sql, bindings, "or");
  }

  /**
   * Add a HAVING clause
   *
   * Filters grouped results based on aggregate function conditions. Similar to WHERE,
   * but operates on grouped data after aggregation. Must be used with GROUP BY and
   * typically with aggregate functions like COUNT(), SUM(), AVG(), etc.
   *
   * @param {string|Array|Function|Builder} column - Aggregate expression to filter:
   *                                                  - `string`: Column name with aggregate function
   *                                                  - `Array`: Multiple conditions like [['col', '>', 5], ['status', 'active']]
   *                                                  - `Function`: Callback for nested conditions
   *                                                  - `Builder`: Subquery for complex conditions
   * @param {string} [operator] - Comparison operator (=, <, >, <=, >=, !=, like, etc.)
   * @param {any} [value] - Value to compare against (can be number, string, null, Builder)
   * @param {string} [andOr='and'] - Logical operator between conditions: 'and' or 'or'
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If operator is invalid or conditions are malformed
   *
   * @example
   * // Simple HAVING clause with COUNT
   * db.table('orders')
   *   .select(['customer_id', db.raw('COUNT(*) as order_count')])
   *   .groupBy('customer_id')
   *   .having('order_count', '>', 5)
   *   .get();
   *
   * @example
   * // HAVING with aggregate function in condition
   * db.table('products')
   *   .select(['category', db.raw('AVG(price) as avg_price')])
   *   .groupBy('category')
   *   .having(db.raw('AVG(price)'), '>', 100)
   *   .orderBy('avg_price', 'desc')
   *   .get();
   *
   * @example
   * // Multiple HAVING conditions
   * db.table('sales')
   *   .select(['region', db.raw('SUM(amount) as total')])
   *   .groupBy('region')
   *   .having('total', '>', 1000)
   *   .having('total', '<', 5000)
   *   .get();
   *
   * @example
   * // HAVING with OR condition
   * db.table('users')
   *   .select(['country', db.raw('COUNT(*) as count')])
   *   .groupBy('country')
   *   .having('count', '>', 100)
   *   .orHaving('country', 'US')
   *   .get();
   */
  having(column, operator = null, value = null, andOr = "and") {
    // Handle array of conditions
    if (Array.isArray(column)) {
      return this.arrayNested(column, andOr, "having");
    }

    // Prepare value and operator
    [value, operator] = this.prepareValueAndOperator(
      value,
      operator,
      arguments.length === 2,
    );

    // Handle nested closures
    if (typeof column === "function" && operator === null) {
      return this.havingNested(column, andOr);
    }

    // Handle subquery as column
    if (column instanceof Builder && operator !== null) {
      const [sub, bindings] = this.createSub(column);

      if (bindings.length > 0) {
        this.addBinding(bindings, "havings");
      }

      return this.having(this.raw(`(${sub})`), operator, value, andOr);
    }

    // Handle invalid operators
    if (this.invalidOperator(operator)) {
      [value, operator] = [operator, "="];
    }

    // Handle subquery as value
    if (value instanceof Builder || typeof value === "function") {
      const [sub, bindings] = this.createSub(value);

      if (bindings.length > 0) {
        this.addBinding(bindings, "havings");
      }

      return this.having(column, operator, this.raw(`(${sub})`), andOr);
    }

    // Handle raw expressions
    if (this.isRaw(value)) {
      const andOrUpper = andOr.toUpperCase();
      const operatorUpper = operator.toUpperCase();
      return this.havingRaw(
        `${this.contactBacktick(column)} ${operatorUpper} ${value.value}`,
        [],
        andOrUpper,
      );
    }

    // Standard HAVING condition
    const andOrUpper = andOr.toUpperCase();
    const operatorUpper = operator.toUpperCase();
    const existingHavings = this.getQuery("havings.queries", []);
    const prefix = existingHavings.length === 0 ? "" : ` ${andOrUpper} `;

    const havingClause = `${prefix}${this.contactBacktick(column)} ${operatorUpper} ?`;

    this.addQuery("havings", havingClause, [value]);

    // Update legacy components for compatibility
    this.components.havings.push({
      type: "basic",
      column: column,
      operator: operator,
      value: value,
      boolean: andOr,
    });

    this.bindings.having.push(value);

    return this;
  }

  /**
   * Add a HAVING clause with OR
   *
   * @param {string|array} column - Column name or array
   * @param {string} operator - Comparison operator
   * @param {any} value - Value to compare
   * @returns {Builder} This builder instance
   */
  orHaving(column, operator = null, value = null) {
    return this.having(column, operator, value, "or");
  }

  /**
   * Add nested HAVING conditions
   *
   * @param {Function} callback - Nested conditions callback
   * @param {string} andOr - Boolean operator (and/or)
   * @returns {Builder} This builder instance
   */
  havingNested(callback, andOr = "and") {
    const nestedQuery = this.newQuery();
    callback(nestedQuery);

    const nestedHavings = nestedQuery.getQuery("havings.queries", []);
    if (nestedHavings.length > 0) {
      const nestedSql = nestedHavings.join("");
      const nestedBindings = nestedQuery.getQuery("havings.bindings", []);

      const existingHavings = this.getQuery("havings.queries", []);
      const prefix =
        existingHavings.length === 0 ? "" : ` ${andOr.toUpperCase()} `;

      return this.addQuery(
        "havings",
        `${prefix}(${nestedSql})`,
        nestedBindings,
      );
    }

    return this;
  }

  // === NODE.JS ENHANCED GROUP/HAVING FEATURES ===

  /**
   * Add conditional GROUP BY (Node.js enhancement)
   *
   * @param {boolean|Function} condition - Condition to check
   * @param {Function} groupCallback - GROUP BY callback when true
   * @param {Function} elseCallback - Optional else callback
   * @returns {Builder} This builder instance
   */
  groupByWhen(condition, groupCallback, elseCallback = null) {
    const shouldGroup =
      typeof condition === "function" ? condition() : condition;

    if (shouldGroup) {
      groupCallback(this);
    } else if (elseCallback) {
      elseCallback(this);
    }

    return this;
  }

  /**
   * Add conditional HAVING (Node.js enhancement)
   *
   * @param {boolean|Function} condition - Condition to check
   * @param {Function} havingCallback - HAVING callback when true
   * @param {Function} elseCallback - Optional else callback
   * @returns {Builder} This builder instance
   */
  havingWhen(condition, havingCallback, elseCallback = null) {
    const shouldHave =
      typeof condition === "function" ? condition() : condition;

    if (shouldHave) {
      havingCallback(this);
    } else if (elseCallback) {
      elseCallback(this);
    }

    return this;
  }

  /**
   * Add multiple GROUP BY columns (Node.js enhancement)
   *
   * @param {Array} columns - Array of column configurations
   * @returns {Builder} This builder instance
   */
  groupByMultiple(columns) {
    for (const column of columns) {
      if (typeof column === "string") {
        this.groupBy(column);
      } else if (typeof column === "object") {
        const { name, direction = "ASC" } = column;
        this.groupBy(name, direction);
      }
    }

    return this;
  }

  // === ORDER BY METHODS (PHP Builder compatibility with Node.js enhancements) ===

  /**
   * Add an ORDER BY clause with raw SQL
   *
   * @param {string} sql - Raw SQL expression
   * @param {array} bindings - Parameter bindings
   * @returns {Builder} This builder instance
   */
  orderByRaw(sql, bindings = []) {
    return this.addQueryBindings(sql, bindings, "orders");
  }

  /**
   * Add an ORDER BY clause to sort query results
   *
   * Specifies the sorting order for query results. Supports sorting by single or
   * multiple columns in ascending or descending order, including subqueries.
   *
   * @param {string|Array|Function|Builder} column - Sorting specification. Can be:
   *   - String: Column name (e.g., 'created_at', 'name')
   *   - Array: Multiple columns [['col1', 'ASC'], ['col2', 'DESC']]
   *   - Function: Nested ordering callback
   *   - Builder: Subquery for ordering
   *
   * @param {string} [direction='asc'] - Sort direction. Options:
   *   - 'asc' or 'ASC': Ascending order (default)
   *   - 'desc' or 'DESC': Descending order
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If invalid direction is provided
   *
   * @example
   * // Single column ascending
   * db.table('users')
   *   .where('status', 'active')
   *   .orderBy('created_at')
   *   .get();
   *
   * @example
   * // Single column descending
   * db.table('posts')
   *   .orderBy('created_at', 'desc')
   *   .limit(10)
   *   .get();
   *
   * @example
   * // Multiple columns with different directions
   * db.table('orders')
   *   .orderBy([
   *     ['status', 'ASC'],
   *     ['total', 'DESC'],
   *     ['created_at', 'DESC']
   *   ])
   *   .get();
   *
   * @example
   * // Case-insensitive direction parameter
   * db.table('products')
   *   .where('category', 'electronics')
   *   .orderBy('price', 'DESC')
   *   .get();
   *
   * @example
   * // With helper methods
   * db.table('posts')
   *   .orderByAsc('created_at')
   *   .orderByDesc('views')
   *   .get();
   */
  orderBy(column, direction = "asc") {
    // Handle array of columns: [['col1', 'ASC'], ['col2', 'DESC']]
    if (Array.isArray(column)) {
      return this.arrayNested(column, "", "orderBy");
    }

    const directionUpper = direction.toUpperCase();

    // Handle subquery or callback
    if (typeof column === "function" || column instanceof Builder) {
      return this.orderBySub(column, directionUpper);
    }

    // Standard column ordering
    const orderClause = `${this.contactBacktick(column)} ${directionUpper}`;

    // Update legacy components for compatibility
    this.components.orders.push({
      column: column,
      direction: direction.toLowerCase(),
    });

    return this.addQuery("orders", orderClause);
  }

  /**
   * Add an ORDER BY clause with subquery
   *
   * @param {Function|Builder} column - Subquery callback or builder
   * @param {string} direction - Sort direction
   * @returns {Builder} This builder instance
   */
  orderBySub(column, direction = "ASC") {
    const [sub, bindings] = this.createSub(column);
    return this.orderByRaw(`(${sub}) ${direction}`, bindings);
  }

  /**
   * Add ORDER BY in ascending order
   *
   * @param {string} column - Column name
   * @returns {Builder} This builder instance
   */
  orderByAsc(column) {
    return this.orderBy(column, "ASC");
  }

  /**
   * Add ORDER BY in descending order
   *
   * @param {string} column - Column name
   * @returns {Builder} This builder instance
   */
  orderByDesc(column) {
    return this.orderBy(column, "DESC");
  }

  /**
   * Add nested ORDER BY conditions (Node.js enhancement)
   *
   * @param {Function} callback - Nested conditions callback
   * @param {string} join - Join type (not used in ORDER BY)
   * @returns {Builder} This builder instance
   */
  orderByNested(callback, join = "") {
    const nestedQuery = this.newQuery();
    callback(nestedQuery);

    const nestedOrders = nestedQuery.getQuery("orders.queries", []);
    if (nestedOrders.length > 0) {
      const nestedBindings = nestedQuery.getQuery("orders.bindings", []);

      for (const order of nestedOrders) {
        this.addQuery("orders", order);
      }

      if (nestedBindings.length > 0) {
        this.addBinding(nestedBindings, "orders");
      }
    }

    return this;
  }

  /**
   * Add random ORDER BY (Node.js enhancement)
   *
   * @returns {Builder} This builder instance
   */
  orderByRandom() {
    // Different databases have different random functions
    const randomFunction = this.grammar?.randomFunction || "RAND()";
    return this.orderByRaw(randomFunction);
  }

  /**
   * Add multiple ORDER BY columns (Node.js enhancement)
   *
   * @param {Array} columns - Array of column configurations
   * @returns {Builder} This builder instance
   */
  orderByMultiple(columns) {
    for (const column of columns) {
      if (typeof column === "string") {
        this.orderBy(column);
      } else if (typeof column === "object") {
        const { name, direction = "ASC" } = column;
        this.orderBy(name, direction);
      }
    }

    return this;
  }

  // === LIMIT AND OFFSET METHODS (PHP Builder compatibility with Node.js enhancements) ===

  /**
   * Set LIMIT clause to restrict the number of results
   *
   * Limits the number of records returned by the query. Commonly used with
   * offset() for pagination or with orderBy() for fetching top N records.
   *
   * @param {number} limit - Maximum number of records to return. Must be:
   *   - Positive integer: Number of records to retrieve
   *   - null or undefined: Removes limit constraint
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If limit is a negative number
   *
   * @example
   * // Get first 10 records
   * db.table('users').limit(10).get();
   *
   * @example
   * // Get top 5 most recent posts
   * db.table('posts')
   *   .orderBy('created_at', 'desc')
   *   .limit(5)
   *   .get();
   *
   * @example
   * // Pagination: Skip 20 records, get next 10
   * db.table('products')
   *   .offset(20)
   *   .limit(10)
   *   .orderBy('id')
   *   .get();
   *
   * @example
   * // Single record (limit 1)
   * db.table('users')
   *   .where('email', 'user@example.com')
   *   .limit(1)
   *   .first(); // Or use first() instead
   *
   * @example
   * // Chain with other methods
   * db.table('orders')
   *   .where('status', 'pending')
   *   .orderBy('created_at', 'desc')
   *   .limit(100)
   *   .get();
   */
  limit(limit) {
    if (limit !== null && limit !== undefined) {
      this.addQuery("limits", limit.toString());
      this.components.limit = limit; // Legacy compatibility
    }

    return this;
  }

  /**
   * Set OFFSET clause
   *
   * @param {number} offset - Number of records to skip
   * @returns {Builder} This builder instance
   */
  offset(offset) {
    if (offset !== null && offset !== undefined) {
      this.addQuery("offset", offset.toString());
      this.components.offset = offset; // Legacy compatibility
    }

    return this;
  }

  /**
   * Skip records (alias for offset)
   *
   * @param {number} count - Number of records to skip
   * @returns {Builder} This builder instance
   */
  skip(count) {
    return this.offset(count);
  }

  /**
   * Take records (alias for limit)
   *
   * @param {number} count - Number of records to take
   * @returns {Builder} This builder instance
   */
  take(count) {
    return this.limit(count);
  }

  /**
   * Set pagination (Node.js enhancement)
   *
   * @param {number} page - Page number (1-based)
   * @param {number} perPage - Records per page
   * @returns {Builder} This builder instance
   */
  paginate(page = 1, perPage = 15) {
    const offset = (page - 1) * perPage;
    return this.offset(offset).limit(perPage);
  }

  /**
   * Get records for specific page (Node.js enhancement)
   *
   * @param {number} perPage - Records per page
   * @param {number} currentPage - Current page number
   * @returns {Builder} This builder instance
   */
  getForPage(perPage = 10, currentPage = 1) {
    return this.paginate(currentPage, perPage);
  }

  // === NODE.JS ENHANCED ORDER/LIMIT FEATURES ===

  /**
   * Add conditional ORDER BY (Node.js enhancement)
   *
   * @param {boolean|Function} condition - Condition to check
   * @param {Function} orderCallback - ORDER BY callback when true
   * @param {Function} elseCallback - Optional else callback
   * @returns {Builder} This builder instance
   */
  orderByWhen(condition, orderCallback, elseCallback = null) {
    const shouldOrder =
      typeof condition === "function" ? condition() : condition;

    if (shouldOrder) {
      orderCallback(this);
    } else if (elseCallback) {
      elseCallback(this);
    }

    return this;
  }

  /**
   * Add conditional LIMIT (Node.js enhancement)
   *
   * @param {boolean|Function} condition - Condition to check
   * @param {number} limitValue - Limit value when true
   * @param {number} elseLimitValue - Optional else limit value
   * @returns {Builder} This builder instance
   */
  limitWhen(condition, limitValue, elseLimitValue = null) {
    const shouldLimit =
      typeof condition === "function" ? condition() : condition;

    if (shouldLimit) {
      this.limit(limitValue);
    } else if (elseLimitValue !== null) {
      this.limit(elseLimitValue);
    }

    return this;
  }

  /**
   * Set latest records (ORDER BY id DESC + LIMIT)
   *
   * @param {string} column - Column to order by (default: 'id')
   * @param {number} count - Number of records
   * @returns {Builder} This builder instance
   */
  latest(column = "id", count = null) {
    this.orderByDesc(column);

    if (count !== null) {
      this.limit(count);
    }

    return this;
  }

  /**
   * Set oldest records (ORDER BY id ASC + LIMIT)
   *
   * @param {string} column - Column to order by (default: 'id')
   * @param {number} count - Number of records
   * @returns {Builder} This builder instance
   */
  oldest(column = "id", count = null) {
    this.orderByAsc(column);

    if (count !== null) {
      this.limit(count);
    }

    return this;
  }

  /**
   * Add ORDER BY clause (legacy method)
   *
   * @param {string} column - Column to order by
   * @param {string} direction - Order direction (ASC/DESC)
   * @returns {this}
   */
  orderBy(column, direction = "asc") {
    this.components.orders.push({
      column: column,
      direction: direction.toLowerCase(),
    });

    return this;
  }

  // === ADVANCED FEATURES AND UTILITIES (Node.js enhanced) ===

  /**
   * Execute transaction with automatic rollback on error
   *
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    if (!this.connection.beginTransaction) {
      throw new Error("Connection does not support transactions");
    }

    try {
      await this.connection.beginTransaction();
      const result = await callback(this);
      await this.connection.commit();
      return result;
    } catch (error) {
      await this.connection.rollback();
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  /**
   * Execute batch operations efficiently (Node.js enhancement)
   *
   * @param {Array} operations - Array of operation objects
   * @returns {Promise<Array>} Results array
   */
  async batch(operations) {
    const results = [];

    try {
      await this.connection.beginTransaction();

      for (const operation of operations) {
        const { type, data, where } = operation;
        let result;

        switch (type.toLowerCase()) {
          case "insert":
            result = await this.clone().insert(data);
            break;
          case "update":
            result = await this.clone()
              .where(where || {})
              .update(data);
            break;
          case "delete":
            result = await this.clone()
              .where(where || {})
              .delete();
            break;
          default:
            throw new Error(`Unsupported batch operation: ${type}`);
        }

        results.push({ operation, result });
      }

      await this.connection.commit();
      return results;
    } catch (error) {
      await this.connection.rollback();
      throw new Error(`Batch operation failed: ${error.message}`);
    }
  }

  /**
   * Insert multiple records in chunks (Node.js enhancement)
   *
   * @param {Array} data - Data to insert
   * @param {number} chunkSize - Chunk size (default: 1000)
   * @returns {Promise<number>} Total affected rows
   */
  async insertInChunks(data, chunkSize = 1000) {
    let totalAffected = 0;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const affected = await this.clone().insert(chunk);
      totalAffected += affected;
    }

    return totalAffected;
  }

  /**
   * Create UNION query
   *
   * Combines results from two or more SELECT queries into a single result set, automatically
   * removing duplicate rows. Both queries must have the same number of columns with compatible
   * data types. Use UNION ALL to keep duplicates for better performance.
   *
   * @param {Builder|Function} query - Query to union with current query:
   *                                    - `Builder`: Pre-constructed query builder
   *                                    - `Function`: Callback receiving a Builder to construct the query
   * @param {boolean} [all=false] - If true, uses UNION ALL (keeps duplicates); if false, removes duplicates
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If union query has incompatible column count or types
   *
   * @example
   * // Basic UNION - combines queries and removes duplicates
   * db.table('customers')
   *   .select(['name', 'email'])
   *   .where('country', 'US')
   *   .union(
   *     (q) => q.table('vendors')
   *             .select(['name', 'email'])
   *             .where('country', 'US')
   *   )
   *   .get();
   *
   * @example
   * // UNION ALL - keeps duplicates for better performance
   * const activeUsers = db.table('users')
   *   .select(['id', 'name', 'status'])
   *   .where('status', 'active');
   *
   * const recentUsers = db.table('users')
   *   .select(['id', 'name', 'status'])
   *   .where('created_at', '>', '2024-01-01');
   *
   * activeUsers.unionAll(recentUsers).get();
   *
   * @example
   * // UNION with ordering (order by must be on entire result)
   * const unionQuery = db.table('current_sales')
   *   .select(['product_id', 'quarter', 'amount'])
   *   .union(
   *     (q) => q.table('archived_sales')
   *             .select(['product_id', 'quarter', 'amount'])
   *   )
   *   .orderBy('amount', 'desc')
   *   .limit(10);
   *
   * unionQuery.get();
   */
  union(query, all = false) {
    const [sql, bindings] = this.createSub(query);
    const unionType = all ? "UNION ALL" : "UNION";

    this.addQuery("unions", `${unionType} (${sql})`, bindings);

    return this;
  }

  /**
   * Create UNION ALL query
   *
   * Combines results from two queries keeping all rows including duplicates.
   * Generally faster than UNION since it doesn't need to remove duplicates.
   *
   * @param {Builder|Function} query - Query to union with current query
   *
   * @returns {Builder} This builder instance for method chaining
   *
   * @throws {Error} If union query has incompatible column count or types
   *
   * @example
   * // UNION ALL - keeps duplicate results
   * db.table('logs')
   *   .select(['event', 'timestamp', 'user_id'])
   *   .where('level', 'error')
   *   .unionAll(
   *     (q) => q.table('archived_logs')
   *             .select(['event', 'timestamp', 'user_id'])
   *             .where('level', 'error')
   *   )
   *   .orderBy('timestamp', 'desc')
   *   .get();
   */
  unionAll(query) {
    return this.union(query, true);
  }

  /**
   * Add query logging (Node.js enhancement)
   *
   * @param {boolean} enable - Enable/disable logging
   * @returns {Builder} This builder instance
   */
  enableQueryLog(enable = true) {
    if (!this.queryLog) {
      this.queryLog = [];
    }
    this.queryLogging = enable;
    return this;
  }

  /**
   * Get query log
   *
   * @returns {Array} Query log entries
   */
  getQueryLog() {
    return this.queryLog || [];
  }

  /**
   * Log a query execution (Node.js enhancement)
   *
   * @param {string} sql - SQL query
   * @param {Array} bindings - Parameter bindings
   * @param {number} duration - Execution duration in ms
   */
  logQuery(sql, bindings, duration) {
    if (this.queryLogging) {
      if (!this.queryLog) {
        this.queryLog = [];
      }

      this.queryLog.push({
        sql,
        bindings,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Execute query with logging (Node.js enhancement)
   *
   * @param {string} sql - SQL query
   * @param {Array} bindings - Parameter bindings
   * @returns {Promise<any>} Query result
   */
  async executeWithLogging(sql, bindings = []) {
    const startTime = Date.now();

    try {
      const result = await this.connection.query(sql, bindings);
      const duration = Date.now() - startTime;

      this.logQuery(sql, bindings, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logQuery(sql, bindings, duration);

      throw error;
    }
  }

  /**
   * Add query performance monitoring (Node.js enhancement)
   *
   * @param {Function} callback - Monitoring callback
   * @returns {Builder} This builder instance
   */
  monitor(callback) {
    this.monitorCallback = callback;
    return this;
  }

  /**
   * Create database indexes (Node.js enhancement)
   *
   * @param {string} indexName - Index name
   * @param {Array} columns - Columns to index
   * @param {Object} options - Index options
   * @returns {Promise<void>}
   */
  async createIndex(indexName, columns, options = {}) {
    const { unique = false, type = "" } = options;
    const tableName = this.getTable() || this.components.from?.table;

    if (!tableName) {
      throw new Error("Table name required for index creation");
    }

    const uniqueClause = unique ? "UNIQUE" : "";
    const typeClause = type ? `USING ${type}` : "";
    const columnsStr = columns
      .map((col) => this.contactBacktick(col))
      .join(", ");

    const sql =
      `CREATE ${uniqueClause} INDEX ${this.contactBacktick(indexName)} ON ${this.contactBacktick(tableName)} (${columnsStr}) ${typeClause}`.trim();

    await this.connection.query(sql);
  }

  /**
   * Drop database index (Node.js enhancement)
   *
   * @param {string} indexName - Index name
   * @returns {Promise<void>}
   */
  async dropIndex(indexName) {
    const sql = `DROP INDEX ${this.contactBacktick(indexName)}`;
    await this.connection.query(sql);
  }

  /**
   * Explain query execution plan (Node.js enhancement)
   *
   * @returns {Promise<Array>} Execution plan
   */
  async explain() {
    const sql = `EXPLAIN ${this.toSql()}`;
    const bindings = this.getBindings();

    const result = await this.connection.query(sql, bindings);
    return result.rows || [];
  }

  /**
   * Stream large result sets (Node.js enhancement)
   *
   * @param {Object} options - Stream options
   * @returns {Promise<ReadableStream>} Result stream
   */
  async stream(options = {}) {
    const { batchSize = 1000 } = options;

    if (!this.connection.stream) {
      throw new Error("Connection does not support streaming");
    }

    const sql = this.toSql();
    const bindings = this.getBindings();

    return this.connection.stream(sql, bindings, { batchSize });
  }

  /**
   * Get query statistics (Node.js enhancement)
   *
   * @returns {Object} Query statistics
   */
  getStatistics() {
    const logs = this.getQueryLog();

    if (logs.length === 0) {
      return { totalQueries: 0, totalDuration: 0, averageDuration: 0 };
    }

    const totalDuration = logs.reduce((sum, log) => sum + log.duration, 0);
    const averageDuration = totalDuration / logs.length;

    return {
      totalQueries: logs.length,
      totalDuration,
      averageDuration,
      slowestQuery: logs.reduce((max, log) =>
        log.duration > max.duration ? log : max,
      ),
      fastestQuery: logs.reduce((min, log) =>
        log.duration < min.duration ? log : min,
      ),
    };
  }

  /**
   * Convert to different database dialect (Node.js enhancement)
   *
   * @param {string} dialect - Target dialect (mysql, postgres, sqlite)
   * @returns {string} Converted SQL
   */
  toDialect(dialect) {
    const dialectGrammar = this.getDialectGrammar(dialect);
    const originalGrammar = this.grammar;

    this.grammar = dialectGrammar;
    const sql = this.toSql();
    this.grammar = originalGrammar;

    return sql;
  }

  /**
   * Get dialect-specific grammar
   *
   * @param {string} dialect - Database dialect
   * @returns {Grammar} Grammar instance
   */
  getDialectGrammar(dialect) {
    // This would return appropriate grammar based on dialect
    // For now, return current grammar
    return this.grammar;
  }

  /**
   * Create prepared statement (Node.js enhancement)
   *
   * @returns {Object} Prepared statement object
   */
  prepare() {
    const sql = this.toSql();
    const bindings = this.getBindings();

    return {
      sql,
      bindings,
      execute: async (params = []) => {
        const finalBindings = params.length > 0 ? params : bindings;
        return this.connection.query(sql, finalBindings);
      },
    };
  }

  /**
   * Cache query results (Node.js enhancement)
   *
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Builder} This builder instance
   */
  cache(key, ttl = 3600) {
    this.cacheKey = key;
    this.cacheTtl = ttl;
    return this;
  }

  /**
   * Disable cache for this query (Node.js enhancement)
   *
   * @returns {Builder} This builder instance
   */
  noCache() {
    this.cacheKey = null;
    this.cacheTtl = null;
    return this;
  }

  /**
   * Set query timeout (Node.js enhancement)
   *
   * @param {number} seconds - Timeout in seconds
   * @returns {Builder} This builder instance
   */
  timeout(seconds) {
    this.queryTimeout = seconds * 1000; // Convert to milliseconds
    return this;
  }

  /**
   * Set query priority (Node.js enhancement)
   *
   * @param {string} priority - Priority level (high, normal, low)
   * @returns {Builder} This builder instance
   */
  priority(priority = "normal") {
    this.queryPriority = priority;
    return this;
  }

  /**
   * Get debug information (Node.js enhancement)
   *
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      sql: this.toSql(),
      bindings: this.getBindings(),
      queries: this.queries,
      components: this.components,
      statistics: this.getStatistics(),
      cacheKey: this.cacheKey,
      timeout: this.queryTimeout,
      priority: this.queryPriority,
    };
  }

  /**
   * Set LIMIT clause (legacy method)
   *
   * @param {number} limit - Number of records to limit
   * @returns {this}
   */
  limit(limit) {
    this.components.limit = limit;
    return this;
  }

  // === CRUD OPERATIONS (PHP Builder compatibility with Node.js async enhancements) ===

  /**
   * Execute SELECT query and retrieve all results
   *
   * Executes the query with all accumulated conditions and returns an array of
   * matching records. This is the primary method for retrieving data from the database.
   * Automatically selects all columns ('*') if not specified.
   *
   * @param {Array} [columns=['*']] - Columns to select. Options:
   *   - ['*']: Select all columns (default)
   *   - ['col1', 'col2']: Select specific columns
   *   - Can be combined with select() method
   *
   * @returns {Promise<Array<Object>>} Array of record objects:
   *   - Empty array [] if no records match
   *   - Array of objects where each object is a database record
   *   - Each object has properties for selected columns
   *
   * @throws {Error} If query execution fails at the database level
   *   - Database connection error
   *   - Invalid SQL syntax
   *   - Permission denied
   *
   * @example
   * // Get all users
   * const users = await db.table('users').get();
   * // Result: [{id: 1, name: 'John', ...}, {id: 2, name: 'Jane', ...}]
   *
   * @example
   * // Get specific columns
   * const names = await db.table('users')
   *   .select(['id', 'name', 'email'])
   *   .get();
   *
   * @example
   * // With WHERE condition
   * const active = await db.table('users')
   *   .where('status', 'active')
   *   .get();
   *
   * @example
   * // Complex query with multiple clauses
   * const results = await db.table('orders')
   *   .select(['id', 'customer_id', 'total', 'created_at'])
   *   .where('status', 'completed')
   *   .where('total', '>', 100)
   *   .orderBy('created_at', 'desc')
   *   .limit(50)
   *   .get();
   *
   * @example
   * // Check if results exist
   * const records = await db.table('users')
   *   .where('email', 'test@example.com')
   *   .get();
   * if (records.length > 0) {
   *   console.log('Found:', records[0]);
   * }
   */
  async get(columns = ["*"]) {
    if (
      !this.getQuery("columns.queries") ||
      !this.arraysEqual(columns, ["*"])
    ) {
      this.select(columns);
    }

    const sql = this.toSql();
    const bindings = this.getBindings(["insert", "update"]);

    try {
      const result = await this.connection.query(sql, bindings);
      return result.rows || [];
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Execute SELECT query and retrieve the first matching record
   *
   * Convenience method for fetching a single record. Automatically applies LIMIT 1
   * to the query for efficiency and returns the first matching record or null if
   * no records match. Ideal for fetching a single user, post, or other entity.
   *
   * @param {Array} [columns=['*']] - Columns to select. Options:
   *   - ['*']: Select all columns (default)
   *   - ['col1', 'col2']: Select specific columns
   *
   * @returns {Promise<Object|null>} First matching record or null:
   *   - Object: The first record matching the query conditions
   *   - null: If no records match the conditions
   *
   * @throws {Error} If query execution fails at the database level
   *   - Database connection error
   *   - Invalid SQL syntax
   *   - Permission denied
   *
   * @example
   * // Get first user
   * const user = await db.table('users').first();
   * if (user) {
   *   console.log('First user:', user.name);
   * }
   *
   * @example
   * // Get specific user by email
   * const user = await db.table('users')
   *   .where('email', 'john@example.com')
   *   .first();
   * if (!user) {
   *   console.log('User not found');
   * }
   *
   * @example
   * // Get first record with specific columns
   * const user = await db.table('users')
   *   .where('status', 'active')
   *   .orderBy('created_at', 'desc')
   *   .first(['id', 'name', 'email']);
   *
   * @example
   * // Get most recent post
   * const latestPost = await db.table('posts')
   *   .orderBy('published_at', 'desc')
   *   .first();
   *
   * @example
   * // With complex WHERE conditions
   * const admin = await db.table('users')
   *   .where('role', 'admin')
   *   .where('active', true)
   *   .first(['id', 'name']);
   *
   * @see get() - For retrieving multiple records
   * @see find() - For finding records by column value
   */
  async first(columns = ["*"]) {
    this.limit(1);
    const results = await this.get(columns);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find a record by column value
   *
   * @param {string} column - Column name
   * @param {any} value - Value to find
   * @param {Array} columns - Columns to select
   * @returns {Promise<Object|null>} Found record or null
   */
  async find(column, value, columns = ["*"]) {
    return this.where(column, value).first(columns);
  }

  /**
   * Update records with given data
   *
   * Updates one or more records matching the current query conditions with the provided data.
   * Supports regular values, raw SQL expressions, and subqueries. The method applies WHERE
   * conditions to determine which records to update. Always include explicit WHERE conditions
   * to avoid accidentally updating all records in the table.
   *
   * @param {Object} data - Data to update. Object with column names as keys and values to set.
   *   Supports multiple value types:
   *   - Regular values: strings, numbers, booleans, null
   *   - Raw SQL: db.raw('column + 5'), db.raw('NOW()')
   *   - Subqueries: Builder instance or callback function
   *   - Functions returning Builder instances for complex expressions
   *
   * @returns {Promise<number>} Number of affected rows:
   *   - Integer >= 0: Number of records successfully updated
   *   - 0: No records matched the WHERE conditions
   *
   * @throws {Error} If update query fails:
   *   - Database connection error
   *   - Invalid column names
   *   - Type mismatch for column values
   *   - Permission denied
   *
   * @example
   * // Update single record with simple values
   * const affected = await db.table('users')
   *   .where('id', 1)
   *   .update({ name: 'John', email: 'john@example.com' });
   * console.log(`Updated ${affected} record(s)`);
   *
   * @example
   * // Update multiple records with WHERE condition
   * const affected = await db.table('users')
   *   .where('status', 'pending')
   *   .update({ status: 'active', verified_at: new Date() });
   *
   * @example
   * // Update with raw SQL expressions
   * const affected = await db.table('users')
   *   .where('id', 10)
   *   .update({
   *     name: 'Updated',
   *     login_count: db.raw('login_count + 1'),
   *     last_login: db.raw('NOW()')
   *   });
   *
   * @example
   * // Conditional update with CASE expression
   * const affected = await db.table('orders')
   *   .where('status', 'pending')
   *   .update({
   *     status: 'processing',
   *     updated_at: new Date()
   *   });
   *
   * @example
   * // Safe update - always use WHERE conditions
   * // ❌ DON'T: This updates ALL records!
   * // await db.table('users').update({ active: false });
   *
   * // ✅ DO: Specify clear conditions
   * const affected = await db.table('users')
   *   .where('created_at', '<', '2020-01-01')
   *   .update({ active: false });
   *
   * @see insert() - Insert new records
   * @see delete() - Delete records
   * @see increment() - Increment column values
   * @see decrement() - Decrement column values
   * @see upsert() - Update or insert records
   */
  async update(data) {
    const values = [];
    const columns = [];

    for (const [column, value] of Object.entries(data)) {
      if (typeof value === "function" || value instanceof Builder) {
        // Handle subquery values
        const [sql, bindings] = this.createSub(value);
        columns.push(this.raw(`${this.contactBacktick(column)} = (${sql})`));
        values.push(...bindings);
      } else if (this.isRaw(value)) {
        // Handle raw expressions
        if (isNaN(column)) {
          columns.push(
            this.raw(`${this.contactBacktick(column)} = (${value.value})`),
          );
        } else {
          columns.push(value);
        }
      } else {
        // Handle regular values
        columns.push(this.contactBacktick(column));
        values.push(value);
      }
    }

    this.addBinding(values, "update");

    const sql = this.grammar.compileUpdate(this, data);
    const allBindings = this.getBindings();

    try {
      const result = await this.connection.query(sql, allBindings);
      return result.affectedRows || 0;
    } catch (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  /**
   * Insert new records into the table
   *
   * Inserts one or more new records into the table. Supports both single record insertion
   * and bulk inserts. For bulk operations, the method efficiently handles multiple rows
   * in a single INSERT statement. Automatically processes nested bindings and handles
   * type conversions for NULL values.
   *
   * @param {Object|Array<Object>} data - Data to insert. Can be:
   *   - Single object: { column1: value1, column2: value2 }
   *   - Array of objects: [{ ... }, { ... }] for bulk insert
   *   - Empty object {} inserts a record with default values
   *   - Supports various value types: strings, numbers, booleans, dates, null
   *
   * @returns {Promise<number>} Number of inserted rows:
   *   - 1 or more: Number of records successfully inserted
   *   - 0: Insert failed but no exception thrown (rare)
   *
   * @throws {Error} If insert query fails:
   *   - Database connection error
   *   - Invalid column names
   *   - Unique constraint violation (duplicate primary/unique key)
   *   - Foreign key constraint violation
   *   - NULL constraint violation (NOT NULL columns)
   *   - Permission denied
   *
   * @example
   * // Insert single record
   * const inserted = await db.table('users').insert({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   created_at: new Date()
   * });
   * console.log(`Inserted ${inserted} record(s)`);
   *
   * @example
   * // Bulk insert multiple records
   * const inserted = await db.table('products').insert([
   *   { name: 'Product A', price: 29.99, stock: 100 },
   *   { name: 'Product B', price: 49.99, stock: 50 },
   *   { name: 'Product C', price: 99.99, stock: 25 }
   * ]);
   * console.log(`Inserted ${inserted} products`);
   *
   * @example
   * // Insert with NULL values
   * const inserted = await db.table('users').insert({
   *   name: 'Jane Doe',
   *   email: 'jane@example.com',
   *   phone: null,
   *   bio: null
   * });
   *
   * @example
   * // Bulk insert from data source
   * const records = fetchFromExternalAPI();
   * const inserted = await db.table('imports')
   *   .insert(records.map(r => ({
   *     external_id: r.id,
   *     data: JSON.stringify(r),
   *     imported_at: new Date()
   *   })));
   *
   * @example
   * // Insert with default values (dates, etc.)
   * const inserted = await db.table('orders').insert({
   *   customer_id: 123,
   *   total: 299.99,
   *   status: 'pending',
   *   notes: 'Rush delivery'
   *   // created_at, updated_at handled by database defaults
   * });
   *
   * @example
   * // Insert with type conversion
   * const inserted = await db.table('logs').insert({
   *   event: 'user_login',
   *   user_id: 456,
   *   timestamp: new Date(),
   *   data: JSON.stringify({ ip: '192.168.1.1' })
   * });
   *
   * @see insertGetId() - Insert and get last insert ID
   * @see insertSub() - Insert from subquery results
   * @see update() - Update existing records
   * @see upsert() - Insert or update records
   */
  async insert(data = {}) {
    // Convert single object to array
    if (!Array.isArray(data)) {
      data = [data];
    }

    // Process bindings for each row
    const bindings = [];
    for (const row of data) {
      const rowBindings = this.bindingsNested(row);
      bindings.push(...Object.values(rowBindings));
    }

    this.addBinding(bindings, "insert");

    const sql = this.grammar.compileInsert(this, data);
    const allBindings = this.getBindings();

    try {
      const result = await this.connection.query(sql, allBindings);
      return result.affectedRows || 0;
    } catch (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  /**
   * Insert records and get the last insert ID
   *
   * Inserts one or more records and returns the ID of the last inserted record.
   * Useful for capturing auto-generated primary keys after insertion. Works best
   * with single inserts; for bulk operations, returns the last ID of the batch.
   *
   * @param {Object|Array<Object>} data - Data to insert. Supports same formats as insert():
   *   - Single object: { column: value, ... }
   *   - Array of objects: [{ ... }, { ... }]
   *
   * @returns {Promise<number>} The last insert ID (auto-generated primary key):
   *   - Positive integer: The ID of the newly inserted record
   *   - For bulk inserts: ID of the last record in the batch
   *
   * @throws {Error} If insert fails or ID retrieval fails:
   *   - Database connection error
   *   - Insert constraint violation (duplicate key, foreign key, etc.)
   *   - Failed to retrieve last insert ID
   *   - Table has no auto-increment primary key
   *
   * @example
   * // Insert user and get the ID
   * const userId = await db.table('users').insertGetId({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   * console.log(`Created user with ID: ${userId}`);
   *
   * @example
   * // Create related records using returned ID
   * const userId = await db.table('users').insertGetId({
   *   name: 'Jane Doe',
   *   email: 'jane@example.com'
   * });
   *
   * // Use the ID to create related profile
   * await db.table('profiles').insert({
   *   user_id: userId,
   *   bio: 'Profile for ' + userId,
   *   created_at: new Date()
   * });
   *
   * @example
   * // Bulk insert and get last ID
   * const lastId = await db.table('orders').insertGetId([
   *   { customer_id: 1, total: 99.99, status: 'pending' },
   *   { customer_id: 2, total: 199.99, status: 'pending' },
   *   { customer_id: 3, total: 299.99, status: 'pending' }
   * ]);
   * console.log(`Last inserted order ID: ${lastId}`);
   *
   * @example
   * // ID sequence pattern for single insert
   * const recordId = await db.table('transactions').insertGetId({
   *   account_id: 42,
   *   amount: 150.00,
   *   type: 'debit',
   *   processed_at: new Date()
   * });
   * // recordId is guaranteed unique if primary key is AUTOINCREMENT
   *
   * @see insert() - Insert without getting ID
   * @see update() - Update existing records
   * @see upsert() - Insert or update with ID
   */
  async insertGetId(data = {}) {
    await this.insert(data);

    try {
      return await this.connection.lastInsertId();
    } catch (error) {
      throw new Error(`Failed to get insert ID: ${error.message}`);
    }
  }

  /**
   * Insert records from subquery results
   *
   * Inserts records into the current table using data from a subquery. This is useful
   * for copying or transforming data from other tables, applying filters, or combining
   * data from multiple sources without loading everything into memory. The subquery
   * results are inserted directly at the database level.
   *
   * @param {Array<string>} columns - Target column names in the current table where
   *   the subquery results will be inserted. Order matters - must match subquery output.
   *   Example: ['id', 'name', 'email'] expects subquery to return 3 columns in that order.
   *
   * @param {Function|Builder|string} query - The data source to insert from. Can be:
   *   - Callback: (q) => q.table('source').select(['col1', 'col2', 'col3'])
   *   - Builder: db.table('source').select(['col1', 'col2', 'col3'])
   *   - Raw SQL: Only callback/Builder recommended for safety
   *
   * @returns {Promise<number>} Number of inserted rows:
   *   - 0 or more: Number of records successfully inserted from subquery
   *   - 0: Subquery returned no results
   *
   * @throws {Error} If insert fails:
   *   - Column count mismatch (subquery columns != target columns)
   *   - Database connection error
   *   - Constraint violations (unique, foreign key, NOT NULL)
   *   - Type incompatibility
   *   - Permission denied
   *
   * @example
   * // Copy all active users to an archive table
   * const inserted = await db.table('users_archive').insertSub(
   *   ['id', 'name', 'email', 'created_at'],
   *   (q) => q.table('users')
   *          .select(['id', 'name', 'email', 'created_at'])
   *          .where('status', 'inactive')
   * );
   * console.log(`Archived ${inserted} users`);
   *
   * @example
   * // Insert from multiple tables joined together
   * const inserted = await db.table('user_reports').insertSub(
   *   ['user_id', 'total_orders', 'total_spent', 'report_date'],
   *   (q) => q.table('users')
   *          .join('orders', 'users.id', 'orders.user_id')
   *          .select([
   *            'users.id',
   *            db.raw('COUNT(orders.id) as total_orders'),
   *            db.raw('SUM(orders.total) as total_spent'),
   *            db.raw('NOW() as report_date')
   *          ])
   *          .groupBy('users.id')
   * );
   *
   * @example
   * // Transform and copy data with calculated fields
   * const inserted = await db.table('products_normalized').insertSub(
   *   ['product_id', 'name', 'price_usd', 'created_at'],
   *   (q) => q.table('products')
   *          .select([
   *            'id',
   *            'name',
   *            db.raw('ROUND(price * 1.1, 2) as price_usd'),
   *            'created_at'
   *          ])
   *          .where('published', true)
   * );
   *
   * @example
   * // Migration pattern - copy with filtering
   * const inserted = await db.table('new_users').insertSub(
   *   ['legacy_id', 'name', 'email', 'migrated_at'],
   *   (q) => q.table('legacy_users')
   *          .select(['id', 'full_name', 'email_address', db.raw('NOW()')])
   *          .where('migration_status', 'pending')
   * );
   *
   * @see insert() - Insert with direct data
   * @see update() - Update records
   * @see where() - Filter subquery results
   */
  async insertSub(columns, query) {
    const [sql, bindings] = this.createSub(query);
    this.addBinding(bindings, "insert");

    const compiledSql = this.grammar.compileInsert(
      this,
      this.arrayFlip(columns),
      sql,
    );
    const allBindings = this.getBindings();

    try {
      const result = await this.connection.query(compiledSql, allBindings);
      return result.affectedRows || 0;
    } catch (error) {
      throw new Error(`Insert subquery failed: ${error.message}`);
    }
  }

  /**
   * Delete records matching the query conditions
   *
   * Removes one or more records from the table based on the current WHERE conditions.
   * IMPORTANT: Always explicitly specify WHERE conditions to avoid accidentally deleting
   * all records. This is a dangerous operation and should be used with caution.
   * Consider soft deletes (marking records as deleted) for critical data.
   *
   * @returns {Promise<number>} Number of deleted rows:
   *   - 1 or more: Number of records successfully deleted
   *   - 0: No records matched the WHERE conditions
   *
   * @throws {Error} If delete fails:
   *   - Database connection error
   *   - Foreign key constraint violation (record referenced by other tables)
   *   - Permission denied
   *   - Table locked by another transaction
   *
   * @example
   * // Delete single record by ID
   * const deleted = await db.table('users')
   *   .where('id', 123)
   *   .delete();
   * console.log(`Deleted ${deleted} user(s)`);
   *
   * @example
   * // Delete multiple records with WHERE condition
   * const deleted = await db.table('sessions')
   *   .where('expires_at', '<', new Date())
   *   .delete();
   * console.log(`Cleaned up ${deleted} expired sessions`);
   *
   * @example
   * // Delete with multiple conditions
   * const deleted = await db.table('orders')
   *   .where('status', 'cancelled')
   *   .where('created_at', '<', '2020-01-01')
   *   .delete();
   *
   * @example
   * // Delete with complex WHERE
   * const deleted = await db.table('logs')
   *   .where('level', 'debug')
   *   .where(q => {
   *     q.where('created_at', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
   *      .orWhere('archived', true);
   *   })
   *   .delete();
   *
   * @example
   * // ❌ DANGEROUS: This deletes ALL records!
   * // await db.table('users').delete();
   *
   * @example
   * // ✅ SAFE: Always use WHERE conditions
   * const deleted = await db.table('users')
   *   .where('account_type', 'test')
   *   .delete();
   *
   * @example
   * // Soft delete pattern (safer for critical data)
   * // Instead of delete(), use update() to mark as deleted
   * const updated = await db.table('users')
   *   .where('id', 123)
   *   .update({ deleted_at: new Date(), active: false });
   *
   * @example
   * // Delete with transaction for safety
   * const deleted = await db.transaction(async (trx) => {
   *   return await db.table('orders')
   *     .where('status', 'pending')
   *     .where('created_at', '<', '2020-01-01')
   *     .delete();
   * });
   *
   * @see update() - Update records instead of deleting
   * @see where() - Specify deletion conditions
   * @see exists() - Check if records exist before deleting
   */
  async delete() {
    const sql = this.grammar.compileDelete(this);
    const bindings = this.getBindings(["insert", "update"]);

    try {
      const result = await this.connection.query(sql, bindings);
      return result.affectedRows || 0;
    } catch (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // === AGGREGATE FUNCTIONS (Node.js async enhancements) ===

  /**
   * Get the count of records matching the query conditions
   *
   * Executes a COUNT aggregate function on the query. This method is used to
   * determine the number of records in a table that match the specified conditions.
   * Returns a single integer value representing the record count.
   *
   * @param {string} [column='*'] - Column to count. Options:
   *   - '*': Count all rows (default, recommended for row counting)
   *   - 'column_name': Count non-null values in specific column
   *   - 'id': Count by primary key (useful for counting distinct groups)
   *
   * @returns {Promise<number>} Total count of matching records:
   *   - Integer >= 0: Number of records matching the query
   *   - 0: No records match the conditions
   *   - Always returns an integer, never null
   *
   * @throws {Error} If query execution fails at the database level
   *   - Database connection error
   *   - Invalid column name
   *   - Permission denied
   *
   * @example
   * // Count all users
   * const total = await db.table('users').count();
   * console.log(`Total users: ${total}`);
   *
   * @example
   * // Count with WHERE condition
   * const activeCount = await db.table('users')
   *   .where('status', 'active')
   *   .count();
   * console.log(`Active users: ${activeCount}`);
   *
   * @example
   * // Count with multiple conditions
   * const adultCount = await db.table('users')
   *   .where('age', '>=', 18)
   *   .where('status', 'active')
   *   .count();
   *
   * @example
   * // Count non-null values in a column
   * const filledEmails = await db.table('users')
   *   .where('email', '!=', null)
   *   .count('email');
   *
   * @example
   * // Pagination - count with offset/limit
   * const pageSize = 10;
   * const total = await db.table('posts').count();
   * const pages = Math.ceil(total / pageSize);
   *
   * @example
   * // Check if any records exist
   * const exists = await db.table('users')
   *   .where('email', 'test@example.com')
   *   .count() > 0;
   *
   * @see max() - Get maximum value
   * @see min() - Get minimum value
   * @see avg() - Get average value
   * @see sum() - Get sum of values
   */
  async count(column = "*") {
    const result = await this.aggregate("count", column);
    return parseInt(result) || 0;
  }

  /**
   * Get maximum value
   *
   * @param {string} column - Column name
   * @returns {Promise<number|null>} Maximum value
   */
  async max(column) {
    return this.aggregate("max", column);
  }

  /**
   * Get minimum value
   *
   * @param {string} column - Column name
   * @returns {Promise<number|null>} Minimum value
   */
  async min(column) {
    return this.aggregate("min", column);
  }

  /**
   * Get average value
   *
   * @param {string} column - Column name
   * @returns {Promise<number|null>} Average value
   */
  async avg(column) {
    const result = await this.aggregate("avg", column);
    return result !== null ? parseFloat(result) : null;
  }

  /**
   * Get sum of values
   *
   * @param {string} column - Column name
   * @returns {Promise<number|null>} Sum result
   */
  async sum(column) {
    const result = await this.aggregate("sum", column);
    return result !== null ? parseFloat(result) : null;
  }

  /**
   * Execute aggregate function
   *
   * @param {string} func - Aggregate function name
   * @param {string} column - Column name
   * @returns {Promise<any>} Aggregate result
   */
  async aggregate(func, column) {
    // Create a clone to avoid modifying the original query
    const clonedBuilder = this.clone();

    // Clear existing select columns and add aggregate
    clonedBuilder.queries.columns = { queries: [], bindings: [] };
    clonedBuilder.components.columns = [];

    // Add aggregate function
    const aggregateColumn = `${func.toUpperCase()}(${this.contactBacktick(column)}) as aggregate`;
    clonedBuilder.addQuery("columns", aggregateColumn);

    const sql = clonedBuilder.toSql();
    const bindings = clonedBuilder.getBindings(["insert", "update"]);

    try {
      const result = await this.connection.query(sql, bindings);
      const rows = result.rows || [];
      return rows.length > 0 ? rows[0].aggregate : null;
    } catch (error) {
      throw new Error(`Aggregate query failed: ${error.message}`);
    }
  }

  // === CASE WHEN ELSE METHODS ===

  /**
   * Create a CASE statement for conditional logic in SQL
   *
   * Implements SQL CASE expressions for conditional value selection in SELECT, UPDATE, and WHERE clauses.
   * Supports two modes:
   * 1. Simple CASE: case('column') - compares a column against multiple values
   * 2. Searched CASE: case() or case(null) - evaluates complex WHERE-like conditions
   *
   * Returns a CaseBuilder instance supporting fluent chain: when() → else() → end()
   * The result can be used as a column in select(), a value in update(), or a condition in where().
   *
   * @param {string|null} [column=null] - Optional column name to evaluate
   *   - When provided: Creates a Simple CASE expression evaluating this specific column
   *     SQL: CASE `column` WHEN value1 THEN result1 WHEN value2 THEN result2 ELSE result END
   *   - When null or omitted: Creates a Searched CASE expression with complex conditions
   *     SQL: CASE WHEN condition1 THEN result1 WHEN condition2 THEN result2 ELSE result END
   *
   * @returns {CaseBuilder} CaseBuilder instance with chainable methods:
   *   - when(condition, value) - Add a WHEN clause
   *   - else(value) - Set ELSE clause (optional, defaults to NULL)
   *   - end(alias) - Finalize and return raw SQL object
   *
   * @throws {Error} If CASE expression is used without calling end() to finalize
   * @throws {Error} If callback in when() contains invalid WHERE conditions
   *
   * @example
   * // Simple CASE - compare single column against multiple values
   * db.table('orders')
   *   .select('id', 'total',
   *     db.case('status')
   *       .when('pending', 'Processing')
   *       .when('shipped', 'In Transit')
   *       .when('delivered', 'Completed')
   *       .else('Unknown')
   *       .end('status_display')
   *   )
   *   .get();
   * // Generates: CASE `status`
   * //   WHEN ? THEN ? WHEN ? THEN ? WHEN ? THEN ?
   * //   ELSE ? END AS `status_display`
   *
   * @example
   * // Searched CASE - complex multi-condition logic
   * db.table('products')
   *   .select('name', 'price',
   *     db.case()
   *       .when(q => q.where('price', '>', 1000), 'Premium')
   *       .when(q => q.where('price', '>', 500), 'Mid-range')
   *       .when(q => q.where('price', '>', 100), 'Standard')
   *       .else('Budget')
   *       .end('price_category')
   *   )
   *   .get();
   * // Generates: CASE
   * //   WHEN `price` > ? THEN ? WHEN `price` > ? THEN ? ...
   * //   ELSE ? END AS `price_category`
   *
   * @example
   * // Multiple AND conditions in single WHEN
   * db.case()
   *   .when(q => {
   *     q.where('age', '>=', 18);
   *     q.where('verified', true);
   *   }, 'Verified Adult')
   *   .else('Unverified')
   *   .end('eligibility')
   *
   * @example
   * // CASE in UPDATE statement
   * await db.table('users').update({
   *   tier: db.case('points')
   *     .when(1000, 'Gold')
   *     .when(500, 'Silver')
   *     .else('Bronze')
   *     .end()
   * })
   *
   * @example
   * // CASE in WHERE clause
   * db.table('orders')
   *   .select('*')
   *   .where('total', '>',
   *     db.case('customer_type')
   *       .when('vip', 100)
   *       .else(50)
   *       .end()
   *   )
   */
  case(column) {
    return new CaseBuilder(this, column);
  }

  /**
   * Create a searched CASE statement with complex conditions
   *
   * Convenience alias for case() without arguments (case(null)).
   * Use this for conditional logic that evaluates multiple complex conditions,
   * especially when the condition logic is more complex than comparing a single column.
   * All WHEN conditions use WHERE-style callback functions for complex Boolean logic.
   *
   * This method makes it syntactically clearer that you're building a "searched" CASE
   * rather than a "simple" CASE evaluating a single column.
   *
   * @returns {CaseBuilder} CaseBuilder instance for searched CASE expressions with methods:
   *   - when(callback, value) - Add a WHEN clause with complex WHERE condition
   *   - else(value) - Set ELSE clause
   *   - end(alias) - Finalize and return raw SQL object
   *
   * @example
   * // Calculate tiered discount based on multiple conditions
   * db.table('orders')
   *   .select('id', 'total',
   *     db.caseRaw()
   *       .when(q => q.where('total', '>', 1000).where('customer_tier', 'vip'), 0.2)
   *       .when(q => q.where('total', '>', 1000), 0.15)
   *       .when(q => q.where('total', '>', 500), 0.1)
   *       .when(q => q.where('total', '>', 100), 0.05)
   *       .else(0)
   *       .end('discount_rate')
   *   )
   *   .get();
   * // Generates: CASE
   * //   WHEN `total` > ? AND `customer_tier` = ? THEN ?
   * //   WHEN `total` > ? THEN ?
   * //   ... (more WHEN clauses)
   * //   ELSE ? END AS `discount_rate`
   *
   * @example
   * // Complex user eligibility logic
   * db.table('users')
   *   .select('username',
   *     db.caseRaw()
   *       .when(q => q.where('age', '>=', 65).where('status', 'active'), 'Senior Member')
   *       .when(q => q.where('age', '>=', 18).where('verified', true), 'Adult Member')
   *       .when(q => q.where('parent_approval', true), 'Minor with Approval')
   *       .else('Not Eligible')
   *       .end('membership_status')
   *   )
   *
   * @example
   * // Equivalence: caseRaw() is identical to case()
   * const expr1 = db.caseRaw();          // Searched CASE
   * const expr2 = db.case();             // Also searched CASE
   * const expr3 = db.case(null);         // Also searched CASE
   * // All three are equivalent
   */
  caseRaw() {
    return new CaseBuilder(this, null);
  }

  // === NODE.JS ENHANCED CRUD FEATURES ===

  /**
   * Update or insert record (upsert) - Insert or update based on existence
   *
   * Performs an atomic "insert or update" operation: checks if a record matching
   * the WHERE conditions exists. If it does, updates it; if not, inserts a new record.
   * This is useful for maintaining unique records (like user settings) or idempotent
   * operations. Returns information about which action was performed.
   *
   * @param {Object} data - Data to insert or update. Object with column names and values.
   *   These values are applied for both insert and update operations.
   *
   * @param {Object} where - WHERE conditions used to check if record exists.
   *   Object with column names as keys. These conditions determine:
   *   - If record exists: updated with data
   *   - If record doesn't exist: inserted with combined data + where conditions
   *
   * @returns {Promise<Object>} Result object with structure:
   *   - action: 'inserted' or 'updated' - which operation was performed
   *   - affectedRows: number - rows affected (typically 1)
   *   - record: Object - the final record (data + where merged)
   *
   * @throws {Error} If upsert fails:
   *   - Database connection error
   *   - Constraint violations
   *   - Permission denied
   *
   * @example
   * // Upsert user settings - update if exists, insert if not
   * const result = await db.table('user_settings').upsert(
   *   { theme: 'dark', notifications: true },
   *   { user_id: 42 }
   * );
   * console.log(`${result.action} record: user_id=${result.record.user_id}`);
   * // Output: "updated record: user_id=42" or "inserted record: user_id=42"
   *
   * @example
   * // Upsert based on email (check both email and source)
   * const result = await db.table('contacts').upsert(
   *   {
   *     name: 'John Doe',
   *     phone: '+1-555-1234',
   *     last_contacted: new Date()
   *   },
   *   { email: 'john@example.com', source: 'api' }
   * );
   * if (result.action === 'inserted') {
   *   console.log('New contact added');
   * } else {
   *   console.log('Contact updated');
   * }
   *
   * @example
   * // Bulk upsert pattern - upsert each record
   * const records = [
   *   { email: 'user1@example.com', name: 'User 1' },
   *   { email: 'user2@example.com', name: 'User 2' },
   *   { email: 'user3@example.com', name: 'User 3' }
   * ];
   * const results = [];
   * for (const record of records) {
   *   const result = await db.table('users').upsert(
   *     { name: record.name, updated_at: new Date() },
   *     { email: record.email }
   *   );
   *   results.push(result);
   * }
   * const inserted = results.filter(r => r.action === 'inserted').length;
   * const updated = results.filter(r => r.action === 'updated').length;
   * console.log(`Inserted: ${inserted}, Updated: ${updated}`);
   *
   * @example
   * // Upsert with computed values
   * const result = await db.table('statistics').upsert(
   *   {
   *     page_views: db.raw('page_views + 1'),
   *     last_viewed: new Date()
   *   },
   *   { page_id: 5 }
   * );
   *
   * @example
   * // Conditional upsert based on action type
   * async function recordPageView(pageId, userId) {
   *   return await db.table('page_views').upsert(
   *     {
   *       view_count: 1,
   *       last_viewed: new Date(),
   *       user_agent: req.headers['user-agent']
   *     },
   *     { page_id: pageId, user_id: userId }
   *   );
   * }
   *
   * @see insert() - Insert without checking for existence
   * @see update() - Update unconditionally
   * @see where() - Define existence check conditions
   */
  async upsert(data, where = {}) {
    // First try to find existing record
    const existing = await this.clone().where(where).first();

    if (existing) {
      // Update existing record
      const affectedRows = await this.clone().where(where).update(data);
      return {
        action: "updated",
        affectedRows,
        record: { ...existing, ...data },
      };
    } else {
      // Insert new record
      const affectedRows = await this.clone().insert({ ...data, ...where });
      return {
        action: "inserted",
        affectedRows,
        record: { ...data, ...where },
      };
    }
  }

  /**
   * Increment a column value by specified amount
   *
   * Atomically increments a numeric column by the given amount. Uses a raw SQL
   * expression (column + amount) to ensure thread-safe atomic updates at the
   * database level, avoiding race conditions that could occur with read-modify-write
   * operations. The amount can be positive or negative.
   *
   * @param {string} column - Column name to increment. Must be a numeric column
   *   (INTEGER, FLOAT, DECIMAL, etc.). Column will be wrapped in backticks automatically.
   *
   * @param {number} [amount=1] - Amount to increment by. Options:
   *   - Positive number: increases value (e.g., 1 for +1, 10 for +10)
   *   - Negative number: decreases value (e.g., -5 for -5)
   *   - Decimal: works with DECIMAL/FLOAT columns (e.g., 1.5)
   *   - Default: 1 (increment by 1)
   *
   * @returns {Promise<number>} Number of affected rows:
   *   - 1 or more: Number of records incremented
   *   - 0: No records matched the WHERE conditions
   *
   * @throws {Error} If increment fails:
   *   - Database connection error
   *   - Column doesn't exist or is not numeric
   *   - Overflow (value exceeds column max)
   *   - Constraint violations
   *   - Permission denied
   *
   * @example
   * // Increment page views counter
   * const affected = await db.table('pages')
   *   .where('id', 42)
   *   .increment('views');
   * console.log(`Incremented ${affected} record(s)`);
   *
   * @example
   * // Increment with custom amount
   * const affected = await db.table('products')
   *   .where('id', 'product-001')
   *   .increment('stock', 50);  // Add 50 to stock
   *
   * @example
   * // Increment multiple records (WHERE condition)
   * const affected = await db.table('orders')
   *   .where('status', 'processing')
   *   .increment('retry_count');
   *
   * @example
   * // Increment with WHERE conditions and complex criteria
   * const affected = await db.table('users')
   *   .where('last_login', '<', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
   *   .increment('inactive_days', 1);
   *
   * @example
   * // Atomic counter operation (thread-safe)
   * const affected = await db.table('statistics')
   *   .where('metric', 'api_calls')
   *   .increment('count', 1);
   * // Uses: UPDATE statistics SET count = count + 1 WHERE metric = 'api_calls'
   *
   * @example
   * // Decrement by using negative amount
   * const affected = await db.table('inventory')
   *   .where('sku', 'SKU-123')
   *   .increment('quantity', -10);  // Reduce by 10
   *
   * @example
   * // Increment decimal values
   * const affected = await db.table('accounts')
   *   .where('user_id', 100)
   *   .increment('balance', 25.50);
   *
   * @see decrement() - Decrement column values
   * @see update() - Update with custom expressions
   * @see where() - Define which records to increment
   */
  async increment(column, amount = 1) {
    const data = {
      [column]: this.raw(`${this.contactBacktick(column)} + ${amount}`),
    };
    return this.update(data);
  }

  /**
   * Decrement a column value by specified amount
   *
   * Atomically decrements a numeric column by the given amount. Uses a raw SQL
   * expression (column - amount) to ensure thread-safe atomic updates at the
   * database level. Useful for managing inventory, balances, quotas, and counters.
   * Essentially an alias for increment with negated amount.
   *
   * @param {string} column - Column name to decrement. Must be a numeric column
   *   (INTEGER, FLOAT, DECIMAL, etc.). Column will be wrapped in backticks automatically.
   *
   * @param {number} [amount=1] - Amount to decrement by. Options:
   *   - Positive number: decreases value (e.g., 1 for -1, 10 for -10)
   *   - Decimal: works with DECIMAL/FLOAT columns (e.g., 5.99)
   *   - Default: 1 (decrement by 1)
   *
   * @returns {Promise<number>} Number of affected rows:
   *   - 1 or more: Number of records decremented
   *   - 0: No records matched the WHERE conditions
   *
   * @throws {Error} If decrement fails:
   *   - Database connection error
   *   - Column doesn't exist or is not numeric
   *   - Underflow (value goes below column minimum)
   *   - Constraint violations (e.g., CHECK constraint on column)
   *   - Permission denied
   *
   * @example
   * // Decrement inventory stock
   * const affected = await db.table('products')
   *   .where('sku', 'PROD-001')
   *   .decrement('stock');
   * console.log(`Updated ${affected} product(s)`);
   *
   * @example
   * // Decrement with custom amount
   * const affected = await db.table('warehouse')
   *   .where('location', 'shelf-A')
   *   .decrement('available_units', 25);
   *
   * @example
   * // Decrement account balance
   * const affected = await db.table('accounts')
   *   .where('account_id', 789)
   *   .decrement('balance', 99.99);
   *
   * @example
   * // Decrement with WHERE conditions
   * const affected = await db.table('sessions')
   *   .where('status', 'active')
   *   .decrement('ttl');  // Decrement time-to-live
   *
   * @example
   * // Atomic countdown operation (thread-safe)
   * const affected = await db.table('quotas')
   *   .where('user_id', 42)
   *   .where('period', 'monthly')
   *   .decrement('remaining_requests', 1);
   *
   * @example
   * // Process inventory from order
   * async function fulfillOrder(orderId, items) {
   *   for (const item of items) {
   *     await db.table('inventory')
   *       .where('product_id', item.product_id)
   *       .decrement('quantity', item.qty);
   *   }
   * }
   *
   * @example
   * // Decrement with safety check
   * const affected = await db.table('credits')
   *   .where('user_id', 100)
   *   .where('balance', '>', 0)  // Only decrement if positive
   *   .decrement('balance', 10);
   *
   * @example
   * // Decrement decimal values (prices, ratings, etc.)
   * const affected = await db.table('products')
   *   .where('id', 123)
   *   .decrement('discount', 0.10);
   *
   * @see increment() - Increment column values
   * @see update() - Update with custom expressions
   * @see where() - Define which records to decrement
   */
  async decrement(column, amount = 1) {
    const data = {
      [column]: this.raw(`${this.contactBacktick(column)} - ${amount}`),
    };
    return this.update(data);
  }

  /**
   * Check if records exist
   *
   * @returns {Promise<boolean>} True if records exist
   */
  async exists() {
    const count = await this.count();
    return count > 0;
  }

  /**
   * Check if records don't exist
   *
   * @returns {Promise<boolean>} True if no records exist
   */
  async doesntExist() {
    return !(await this.exists());
  }

  /**
   * Truncate the table - Remove all records and reset auto-increment
   *
   * Truncates (empties) the current table, removing all records and resetting
   * the auto-increment counter to its initial value. This is much faster than
   * DELETE for removing all records, but cannot be rolled back in a transaction.
   * Use with extreme caution as this operation is irreversible.
   *
   * @returns {Promise<boolean>} True if truncation was successful
   *
   * @throws {Error} If truncate fails:
   *   - Database connection error
   *   - Permission denied
   *   - Foreign key constraints prevent truncation
   *   - Table is locked by another transaction
   *   - Database doesn't support TRUNCATE operation
   *
   * @example
   * // Truncate a logs table to clear old data
   * const success = await db.table('logs').truncate();
   * if (success) {
   *   console.log('Logs table has been cleared');
   * }
   *
   * @example
   * // Truncate during development/testing
   * const success = await db.table('test_data').truncate();
   * // All records removed, auto-increment reset to 1
   *
   * @example
   * // ⚠️ WARNING: This operation cannot be undone!
   * // Truncate will remove ALL data from the table
   * const success = await db.table('users').truncate();
   * // All users are permanently deleted
   *
   * @example
   * // Safe truncation with confirmation
   * if (process.env.NODE_ENV === 'development') {
   *   const success = await db.table('temp_table').truncate();
   *   console.log(`Truncation ${success ? 'successful' : 'failed'}`);
   * }
   *
   * @example
   * // Clear cache table periodically
   * const success = await db.table('cache')
   *   .truncate();
   * if (!success) {
   *   // Fall back to DELETE if TRUNCATE fails
   *   await db.table('cache').delete();
   * }
   *
   * @see delete() - Delete specific records (safer, can use WHERE conditions)
   * @see insert() - Insert new records after truncation
   */
  async truncate() {
    if (!this.grammar.compileTruncate) {
      throw new Error(
        "Truncate operation not supported by the current database grammar",
      );
    }

    const sql = this.grammar.compileTruncate(this);

    try {
      await this.connection.query(sql, []);
      return true;
    } catch (error) {
      throw new Error(`Truncate failed: ${error.message}`);
    }
  }

  /**
   * Insert or update record (alias for upsert)
   *
   * This is an alias for the upsert() method. Performs an atomic "insert or update"
   * operation: checks if a record matching the WHERE conditions exists. If it does,
   * updates it; if not, inserts a new record.
   *
   * @param {Object} data - Data to insert or update
   * @param {Object} where - WHERE conditions used to check if record exists
   * @returns {Promise<Object>} Result object with action, affectedRows, and record
   *
   * @example
   * // Insert or update user settings
   * const result = await db.table('user_settings').insertOrUpdate(
   *   { theme: 'dark', notifications: true },
   *   { user_id: 42 }
   * );
   * console.log(`${result.action} record for user ${result.record.user_id}`);
   *
   * @see upsert() - Primary method for insert-or-update operations
   * @see insert() - Insert new records only
   * @see update() - Update existing records only
   */
  async insertOrUpdate(data, where = {}) {
    return this.upsert(data, where);
  }

  // === HELPER METHODS FOR CRUD ===

  /**
   * Clone the current builder instance
   *
   * @returns {Builder} Cloned builder
   */
  clone() {
    const cloned = new this.constructor(
      this.connection,
      this.grammar,
      this.processor,
    );

    // Deep copy queries
    cloned.queries = JSON.parse(JSON.stringify(this.queries));

    // Copy components for legacy compatibility
    cloned.components = JSON.parse(JSON.stringify(this.components));
    cloned.bindings = JSON.parse(JSON.stringify(this.bindings));

    return cloned;
  }

  /**
   * Process nested bindings for insert/update
   *
   * @param {Object} values - Values to process
   * @returns {Object} Processed bindings
   */
  bindingsNested(values) {
    const processed = {};

    for (const [key, value] of Object.entries(values)) {
      if (value !== null && value !== undefined) {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * Flip array keys and values (PHP array_flip equivalent)
   *
   * @param {Array} array - Array to flip
   * @returns {Object} Flipped object
   */
  arrayFlip(array) {
    const flipped = {};
    for (let i = 0; i < array.length; i++) {
      flipped[array[i]] = i;
    }
    return flipped;
  }

  /**
   * Check if two arrays are equal
   *
   * @param {Array} a - First array
   * @param {Array} b - Second array
   * @returns {boolean} True if equal
   */
  arraysEqual(a, b) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
}

/**
 * CaseBuilder - Fluent SQL CASE WHEN ELSE expression builder
 *
 * Provides a type-safe fluent interface for constructing SQL CASE expressions
 * used in SELECT, UPDATE, WHERE, and other SQL clauses.
 *
 * Supports two CASE modes:
 * 1. Simple CASE: Compares a single column against multiple literal values
 *    SQL: CASE `column` WHEN value1 THEN result1 WHEN value2 THEN result2 ELSE result END
 * 2. Searched CASE: Evaluates complex WHERE-like conditions for each WHEN clause
 *    SQL: CASE WHEN condition1 THEN result1 WHEN condition2 THEN result2 ELSE result END
 *
 * Usage Flow (Builder Pattern):
 * 1. Create instance via db.case([column]) or db.caseRaw()
 * 2. Chain one or more when(condition, value) calls
 * 3. Optionally chain else(value) for default result
 * 4. Finalize with end(alias) to get SQL object
 * 5. Use returned object in query (select, update, where, etc.)
 *
 * Method Chaining: All methods (when, else) return this for fluent syntax:
 *   db.case('status').when('a', 1).when('b', 2).else(0).end()
 *
 * Parameter Binding: All values are automatically bound to prevent SQL injection:
 * - when() values are bound as THEN parameters
 * - else() value is bound as ELSE parameter
 * - Callback conditions in searched CASE are compiled with their own bindings
 *
 * @property {Builder} builder - Parent Builder instance for SQL generation and parameter binding
 * @property {string|null} column - Column name for simple CASE, null for searched CASE
 * @property {Array<Object>} conditions - Array of condition objects with structure:
 *   { type: 'basic'|'callback', condition: *, value: * }
 * @property {*} elseValue - Default value for ELSE clause, null if not set
 *
 * @example
 * // Simple CASE - status mapping
 * const result = db.case('status')
 *   .when('pending', 'Processing')
 *   .when('shipped', 'In Transit')
 *   .when('delivered', 'Completed')
 *   .else('Unknown')
 *   .end('display_status');
 * // Generates SQL: CASE `status`
 * //   WHEN ? THEN ? WHEN ? THEN ? WHEN ? THEN ?
 * //   ELSE ? END AS `display_status`
 *
 * @example
 * // Searched CASE - complex conditions
 * const result = db.case()
 *   .when(q => q.where('age', '>=', 65), 'Senior')
 *   .when(q => q.where('age', '>=', 18), 'Adult')
 *   .else('Minor')
 *   .end('age_category');
 * // Generates SQL: CASE
 * //   WHEN `age` >= ? THEN ?
 * //   WHEN `age` >= ? THEN ?
 * //   ELSE ? END AS `age_category`
 *
 * @example
 * // Use in UPDATE statement
 * await db.table('users').update({
 *   tier: db.case('points')
 *     .when(1000, 'Gold')
 *     .when(500, 'Silver')
 *     .else('Bronze')
 *     .end()
 * });
 *
 * @example
 * // Use in WHERE clause
 * db.table('orders')
 *   .where('status_code', '=',
 *     db.case('category')
 *       .when('premium', 1)
 *       .when('standard', 2)
 *       .else(3)
 *       .end()
 *   )
 */
class CaseBuilder {
  /**
   * Initialize a new CaseBuilder instance
   *
   * @param {Builder} builder - Parent Builder instance for query context and SQL generation
   * @param {string|null} column - Column name to evaluate
   *   - When string: Creates Simple CASE (CASE `column` WHEN ... THEN ...)
   *   - When null: Creates Searched CASE (CASE WHEN ... THEN ...)
   *
   * @private This constructor is typically called internally by db.case() or db.caseRaw().
   *          Use those factory methods instead of instantiating directly.
   */
  constructor(builder, column) {
    this.builder = builder;
    this.column = column;
    this.conditions = [];
    this.elseValue = null;
  }

  /**
   * Add a WHEN condition to the CASE statement
   *
   * This method adapts to the CASE type:
   * - For Simple CASE (column provided): condition is a literal value to match against the column
   * - For Searched CASE (no column): condition is a callback function building WHERE-like predicates
   *
   * Supports method chaining - can call multiple when() methods in sequence.
   * WHEN conditions are evaluated in order; first match determines the result.
   *
   * @param {string|number|boolean|Function} condition - The WHEN condition
   *   For Simple CASE: literal value to compare against the declared column
   *     - Example: .when('active', result) → WHEN ? (binds 'active')
   *     - Example: .when(5, 'Five') → WHEN ? (binds 5)
   *   For Searched CASE: callback function receiving Builder instance
   *     - Example: .when(q => q.where('age', '>', 18), result)
   *     - Callback can chain multiple where() calls: q.where().where().where()
   *     - Callback can also use whereRaw(), whereBetween(), etc.
   *
   * @param {*} value - The result value when condition matches
   *   This value is returned when the WHEN condition is TRUE.
   *   Can be any type: string, number, boolean, null, date, etc.
   *   Will be properly parameterized to prevent SQL injection.
   *
   * @returns {CaseBuilder} Returns this instance for method chaining
   *
   * @throws {Error} If callback (searched CASE) contains invalid WHERE clause
   * @throws {Error} If condition type doesn't match CASE mode (simple vs searched)
   *
   * @example
   * // Simple CASE - multiple value matches
   * db.case('status')
   *   .when('active', 'Active User')
   *   .when('pending', 'Pending Approval')
   *   .when('inactive', 'Inactive User')
   *   .when('deleted', 'Deleted User')
   *   .else('Unknown Status')
   *   .end('status_label')
   *
   * @example
   * // Searched CASE - complex multi-column conditions
   * db.caseRaw()
   *   .when(q => q.where('age', '>=', 18).where('verified', true), 'Verified Adult')
   *   .when(q => q.where('age', '>=', 18), 'Unverified Adult')
   *   .when(q => q.where('age', '>=', 13), 'Teen')
   *   .else('Child')
   *   .end('age_category')
   *
   * @example
   * // Numeric matching in simple CASE
   * db.case('rating')
   *   .when(5, 'Excellent')
   *   .when(4, 'Good')
   *   .when(3, 'Average')
   *   .when(2, 'Poor')
   *   .when(1, 'Very Poor')
   *   .else('No Rating')
   *   .end('rating_text')
   *
   * @example
   * // Complex search conditions in searched CASE
   * db.case()
   *   .when(q => {
   *     q.where('purchase_count', '>=', 100)
   *      .where('total_spent', '>', 5000)
   *      .where('years_customer', '>=', 5);
   *   }, 'VIP Platinum')
   *   .when(q => q.where('purchase_count', '>=', 50), 'VIP Gold')
   *   .when(q => q.where('purchase_count', '>=', 10), 'Loyal Customer')
   *   .else('Regular Customer')
   *   .end('customer_status')
   *
   * @example
   * // Comparison operators in searched CASE
   * db.case()
   *   .when(q => q.where('price', '<', 50), 'Budget')
   *   .when(q => q.where('price', '>=', 50).where('price', '<', 200), 'Mid-range')
   *   .when(q => q.where('price', '>=', 200), 'Premium')
   *   .end('category')
   *
   * @example
   * // Method chaining multiple WHEN clauses
   * db.case('quarter')
   *   .when('Q1', 'January-March')
   *   .when('Q2', 'April-June')
   *   .when('Q3', 'July-September')
   *   .when('Q4', 'October-December')
   *   .end('quarter_name')
   */
  when(condition, value) {
    if (typeof condition === "function") {
      // Handle callback for complex conditions
      const subBuilder = new this.builder.constructor();
      condition(subBuilder);
      this.conditions.push({
        type: "callback",
        condition: subBuilder.components.wheres,
        bindings: subBuilder.getBindings(), // Collect all bindings from subquery
        value: value,
      });
    } else {
      this.conditions.push({
        type: "basic",
        condition: condition,
        value: value,
      });
    }
    return this;
  }

  /**
   * Set the ELSE clause - the default value when no WHEN conditions match
   *
   * The ELSE clause is optional. If not specified, unmatched rows return NULL.
   * Use this to provide a default/fallback value for any input not matched by WHEN clauses.
   *
   * @param {*} value - The default value returned when all WHEN conditions are false
   *   Can be any type: string, number, boolean, null, date, etc.
   *   Will be properly parameterized to prevent SQL injection.
   *   If you explicitly want NULL, you can pass null or omit else() entirely.
   *
   * @returns {CaseBuilder} Returns this instance for method chaining (allows end() after else())
   *
   * @example
   * // String default value
   * db.case('status')
   *   .when('completed', 'Done')
   *   .when('in_progress', 'Working')
   *   .when('pending', 'Waiting')
   *   .else('Not Started')  // Default for any other status
   *   .end('status_text')
   *
   * @example
   * // Numeric default value
   * db.case('priority')
   *   .when('critical', 5)
   *   .when('high', 4)
   *   .when('medium', 3)
   *   .when('low', 2)
   *   .else(1)  // Default priority
   *   .end('priority_score')
   *
   * @example
   * // NULL as default (explicit)
   * db.case('type')
   *   .when('A', 'Type A')
   *   .when('B', 'Type B')
   *   .else(null)  // Explicitly NULL for unmatched types
   *   .end()
   *
   * @example
   * // NULL as default (implicit - omitting else())
   * db.case('department')
   *   .when('sales', 'Sales Team')
   *   .when('engineering', 'Engineering Team')
   *   .when('hr', 'HR Team')
   *   // No else() → unmatched departments return NULL
   *   .end('department_name')
   *
   * @example
   * // Default value handling NULL in data
   * db.case()
   *   .when(q => q.where('email', 'IS NOT', null), 'Has Email')
   *   .when(q => q.where('phone', 'IS NOT', null), 'Has Phone')
   *   .else('No Contact Info')  // Default for records with no email or phone
   *   .end('contact_status')
   *
   * @example
   * // Boolean values as default
   * db.case('subscription')
   *   .when('active', true)
   *   .when('trial', true)
   *   .else(false)  // Not subscribed
   *   .end('is_subscriber')
   */
  else(value) {
    this.elseValue = value;
    return this;
  }

  /**
   * Finalize the CASE statement and return a raw SQL object
   *
   * This method compiles all accumulated WHEN conditions and ELSE clause into SQL,
   * properly collects and binds all parameter values, and returns a raw SQL object
   * that can be used in SELECT, UPDATE, WHERE, and other SQL contexts.
   *
   * This is the required final call in the CASE building chain. Without calling end(),
   * the CASE expression is incomplete and cannot be used in queries.
   *
   * @param {string|null} [alias] - Optional column alias for the CASE result
   *   - When provided: Adds "AS alias" to the generated SQL (primarily for SELECT)
   *   - When null or omitted: No alias (useful for WHERE or UPDATE contexts)
   *   - Example with alias: "... END AS order_status_code"
   *   - Example without: "... END"
   *
   * @returns {Object} Raw SQL object with structure:
   *   {
   *     type: 'raw',      // Identifies this as raw SQL (not a table name)
   *     raw: true,        // Flag indicating raw SQL mode
   *     value: string     // The compiled SQL string with placeholders (?)
   *   }
   *   The actual parameter values are stored in the builder's bindings for execution.
   *
   * @throws {Error} If parameter count doesn't match the number of bindings
   *   (This is an internal validation that usually doesn't fail in normal usage)
   *
   * @example
   * // CASE in SELECT with alias
   * const orders = await db.table('orders')
   *   .select('id', 'total',
   *     db.case('status')
   *       .when('completed', 1)
   *       .when('pending', 0)
   *       .when('cancelled', -1)
   *       .else(2)  // Unknown
   *       .end('order_status_code')  // ← Alias for result column
   *   )
   *   .get();
   * // Generated SQL: ... END AS `order_status_code` FROM `orders`
   * // Result includes: { id: 1, total: 100, order_status_code: 1 }
   *
   * @example
   * // CASE in WHERE clause (no alias needed)
   * const vipOrders = await db.table('orders')
   *   .select('id')
   *   .where('total', '>',
   *     db.case('customer_type')
   *       .when('vip', 1000)
   *       .when('regular', 500)
   *       .else(100)
   *       .end()  // ← No alias; used directly as a value
   *   )
   *   .get();
   * // Generated SQL: WHERE `total` > CASE `customer_type` ... END
   *
   * @example
   * // CASE in UPDATE statement
   * await db.table('products').update({
   *   discount: db.case('category')
   *     .when('clearance', 0.5)
   *     .when('seasonal', 0.3)
   *     .when('featured', 0.1)
   *     .else(0)
   *     .end()  // ← No alias for UPDATE
   * });
   * // Generated SQL: UPDATE `products` SET `discount` = CASE ... END
   *
   * @example
   * // Nested/Multiple CASE expressions
   * const report = await db.table('sales')
   *   .select(
   *     db.case('region')
   *       .when('north', 'Northern Region')
   *       .when('south', 'Southern Region')
   *       .else('Other')
   *       .end('region_name'),  // First CASE with alias
   *     db.case()
   *       .when(q => q.where('amount', '>', 1000), 'High Value')
   *       .else('Standard')
   *       .end('sale_tier')  // Second CASE with alias
   *   )
   *   .get();
   *
   * @example
   * // CASE with GROUP BY and aggregates
   * const grouped = await db.table('orders')
   *   .select(
   *     db.case('status')
   *       .when('completed', 'Finished Orders')
   *       .when('pending', 'Pending Orders')
   *       .else('Other')
   *       .end('status_group'),
   *     db.raw('COUNT(*) as count'),
   *     db.raw('SUM(total) as sum')
   *   )
   *   .groupBy('status')
   *   .get();
   *
   * @example
   * // CASE with ORDER BY
   * const sorted = await db.table('users')
   *   .select('name')
   *   .orderBy(
   *     db.case('role')
   *       .when('admin', 1)
   *       .when('moderator', 2)
   *       .when('user', 3)
   *       .else(4)
   *       .end()  // ORDER BY calculated value
   *   )
   *   .get();
   */
  end(alias = null) {
    let sql = "CASE";

    if (this.column) {
      sql += ` ${this.builder.grammar.wrapColumn(this.column)}`;
    }

    this.conditions.forEach((condition) => {
      if (condition.type === "callback") {
        // Handle complex WHEN conditions
        const wheresSql = this.builder.grammar
          .compileWheres(this.builder, condition.condition)
          .replace(/^WHERE\s+/, "");
        sql += ` WHEN ${wheresSql} THEN ?`;
      } else {
        sql += " WHEN ? THEN ?";
      }
    });

    if (this.elseValue !== null) {
      sql += " ELSE ?";
    }

    sql += " END";

    if (alias) {
      sql += ` AS ${this.builder.grammar.wrapColumn(alias)}`;
    }

    // Collect bindings
    const bindings = [];
    this.conditions.forEach((condition) => {
      if (condition.type === "callback") {
        // Add stored bindings from callback subquery
        if (condition.bindings && condition.bindings.length > 0) {
          bindings.push(...condition.bindings);
        }
        bindings.push(condition.value);
      } else {
        bindings.push(condition.condition, condition.value);
      }
    });

    if (this.elseValue !== null) {
      bindings.push(this.elseValue);
    }

    return {
      type: "raw",
      raw: true,
      value: sql,
      bindings: bindings,
    };
  }
}

/**
 * JoinBuilder - SQL JOIN clause builder
 */
class JoinBuilder {
  constructor(builder, table, type = "inner") {
    this.builder = builder;
    this.table = table;
    this.type = type;
    this.conditions = [];
    this.isSubquery = false;
  }

  /**
   * Set join condition using ON clause
   * @param {string|Function} first - First column or callback
   * @param {string} operator - Operator (=, !=, etc.)
   * @param {string} second - Second column
   * @returns {Builder} Returns main builder for chaining
   */
  on(first, operator = "=", second = null) {
    // Handle 2-parameter calls: on(first, second) with default '=' operator
    if (
      arguments.length === 2 &&
      typeof operator === "string" &&
      second === null
    ) {
      second = operator;
      operator = "=";
    }

    if (typeof first === "function") {
      // Handle callback for complex conditions
      const subBuilder = new this.builder.constructor();
      first(subBuilder);

      // Extract WHERE conditions from subBuilder and convert to ON conditions
      const wheres = subBuilder.components.wheres || [];
      wheres.forEach((where) => {
        this.conditions.push({
          type: "complex",
          condition: where,
        });
      });
    } else {
      // Simple condition
      this.conditions.push({
        type: "basic",
        first: first,
        operator: operator,
        second: second,
      });
    }

    return this.finalize();
  }

  /**
   * Set this as a subquery join
   * @param {Function} callback - Subquery callback
   * @returns {JoinBuilder}
   */
  subquery(callback) {
    this.isSubquery = true;
    this.subqueryCallback = callback;
    return this;
  }

  /**
   * Finalize the join and add it to the main builder
   * @returns {Builder} Returns main builder for chaining
   * @private
   */
  finalize() {
    const typeUpper = this.type.toUpperCase();
    let table = this.table;
    const bindings = [];

    // Handle raw table objects (from joinSub)
    if (
      this.table &&
      typeof this.table === "object" &&
      this.table.raw === true
    ) {
      table = this.table.value;
    }

    // Handle subquery
    if (this.isSubquery && this.subqueryCallback) {
      const subBuilder = new this.builder.constructor();
      this.subqueryCallback(subBuilder);

      const subSql = subBuilder.toSql();
      const subBindings = subBuilder.getBindings();

      table = `(${subSql})`;
      bindings.push(...subBindings);
    }

    // Build ON conditions
    let conditionSql = "";
    if (this.conditions.length > 0) {
      const conditionParts = [];

      this.conditions.forEach((condition, index) => {
        if (condition.type === "basic") {
          const first = this.builder.grammar.wrapColumn(condition.first);
          const second = this.builder.grammar.wrapColumn(condition.second);
          conditionParts.push(`${first} ${condition.operator} ${second}`);
        } else if (condition.type === "complex") {
          // Handle complex conditions from callbacks
          const whereCondition = condition.condition;
          if (
            whereCondition.column &&
            whereCondition.operator &&
            whereCondition.value !== undefined
          ) {
            const col = this.builder.grammar.wrapColumn(whereCondition.column);
            conditionParts.push(`${col} ${whereCondition.operator} ?`);
            bindings.push(whereCondition.value);
          }
        }
      });

      conditionSql = conditionParts.join(" AND ");
    }

    // Only update components system (Grammar.js uses this)
    // Don't add to queries system to avoid duplication

    if (bindings.length > 0) {
      this.builder.addBinding(bindings, "joins");
    }

    // Determine the correct table representation for Grammar.js
    let finalTable;
    if (this.isSubquery) {
      finalTable = table;
    } else if (
      this.table &&
      typeof this.table === "object" &&
      this.table.raw === true
    ) {
      // For raw table objects (from joinSub), wrap it as a raw object to prevent double-processing
      finalTable = { raw: true, value: this.table.value };
    } else {
      finalTable = this.table;
    }

    // Update components for Grammar.js compatibility
    this.builder.components.joins.push({
      type: this.type,
      table: finalTable,
      first: this.conditions[0]?.first || "BUILDER_PROCESSED",
      operator: this.conditions[0]?.operator || "ON",
      second: this.conditions[0]?.second || conditionSql,
    });

    return this.builder;
  }

  /**
   * Create a LEFT JOIN
   * @param {string} table - Table name or alias
   * @returns {JoinBuilder}
   */
  static left(builder, table) {
    return new JoinBuilder(builder, table, "left");
  }

  /**
   * Create a RIGHT JOIN
   * @param {string} table - Table name or alias
   * @returns {JoinBuilder}
   */
  static right(builder, table) {
    return new JoinBuilder(builder, table, "right");
  }

  /**
   * Create an INNER JOIN
   * @param {string} table - Table name or alias
   * @returns {JoinBuilder}
   */
  static inner(builder, table) {
    return new JoinBuilder(builder, table, "inner");
  }

  /**
   * Create a FULL OUTER JOIN
   * @param {string} table - Table name or alias
   * @returns {JoinBuilder}
   */
  static full(builder, table) {
    return new JoinBuilder(builder, table, "full");
  }
}
