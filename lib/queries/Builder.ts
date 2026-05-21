/**
 * Builder - Query Builder class with fluent interface
 *
 * Complete implementation based on PHP Builder functionality
 * Provides chainable methods for building SQL queries
 */

// Import JoinBuilder for type declarations
import type JoinBuilder from "./JoinBuilder.js";

// Query storage structure interface
interface QueryStorage {
  columns: { queries: any[]; bindings: any[] };
  froms: { queries: any[]; bindings: any[] };
  joins: { queries: any[]; bindings: any[] };
  wheres: { queries: any[]; bindings: any[] };
  groups: { queries: any[]; bindings: any[] };
  havings: { queries: any[]; bindings: any[] };
  orders: { queries: any[]; bindings: any[] };
  limits: { queries: any[]; bindings: any[] };
  offset: { queries: any[]; bindings: any[] };
  insert: { queries: any[]; bindings: any[] };
  update: { queries: any[]; bindings: any[] };
  unions: { queries: any[]; bindings: any[] };
  [key: string]: { queries: any[]; bindings: any[] };
}

// Method categorization interface
interface Methods {
  set: string[];
  process: string[];
  get: string[];
}

// Where condition interface
interface WhereCondition {
  column: string;
  operator?: string;
  value?: any;
  boolean?: "and" | "or";
  type?: string;
}

// Join interface
interface JoinClause {
  table: string;
  alias?: string;
  type: "inner" | "left" | "right" | "cross" | "full" | "natural";
  conditions: Array<{
    first: string;
    operator: string;
    second: string;
    boolean: "and" | "or";
  }>;
}

// Order by interface
interface OrderBy {
  column: string;
  direction: "asc" | "desc";
}

// Raw SQL interface
interface RawExpression {
  type: "raw";
  raw: true;
  value: string;
  bindings: any[];
}

// Case statement interface
interface CaseStatement {
  type: "case";
  column?: string;
  conditions: Array<{
    when: any;
    then: any;
    bindings?: any[];
  }>;
  else?: any;
  alias?: string;
}

// Query builder interface
export interface QueryBuilder {
  select(...columns: string[]): this;
  distinct(): this;
  from(table: string, alias?: string): this;
  where(column: string | Function, operator?: any, value?: any): this;
  orWhere(column: string | Function, operator?: any, value?: any): this;
  whereIn(column: string, values: any[]): this;
  whereNotIn(column: string, values: any[]): this;
  whereBetween(column: string, values: [any, any]): this;
  whereNull(column: string): this;
  whereNotNull(column: string): this;
  join(
    table: string,
    first: string | Function,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  leftJoin(
    table: string,
    first: string | Function,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  rightJoin(
    table: string,
    first: string | Function,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  crossJoin(table: string): JoinBuilder;
  fullJoin(
    table: string,
    first: string,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  joinWhere(
    table: string,
    first: string,
    operator?: string,
    second?: string,
    type?: string,
  ): JoinBuilder;

  // Subquery JOIN methods return JoinBuilder
  joinSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator?: string,
    second?: string,
    type?: string,
    isWhere?: boolean,
  ): JoinBuilder;
  leftJoinSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  rightJoinSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  joinWhereSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator?: string,
    second?: string,
    type?: string,
  ): JoinBuilder;
  leftJoinWhereSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator?: string,
    second?: string,
  ): JoinBuilder;
  rightJoinWhereSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator?: string,
    second?: string,
  ): JoinBuilder;

  orderBy(column: string, direction?: "asc" | "desc"): this;
  orderBySub(query: Function | Builder, direction?: "asc" | "desc"): this;
  groupBy(...columns: string[]): this;
  groupBySub(query: Function | Builder): this;
  having(column: string, operator?: any, value?: any): this;
  limit(count: number): this;
  offset(count: number): this;
  get(): Promise<any[]>;
  first(): Promise<any>;
  find(id: any): Promise<any>;
  count(column?: string): Promise<number>;
  sum(column: string): Promise<number>;
  avg(column: string): Promise<number>;
  max(column: string): Promise<any>;
  min(column: string): Promise<any>;
  insert(data: object | object[]): Promise<any>;
  insertSub(columns: string[], query: Function | Builder): Promise<any>;
  update(data: object): Promise<number>;
  delete(): Promise<number>;
  updateWithJoin(data: object): Promise<number>;
  deleteWithJoin(): Promise<number>;
  raw(sql: string, bindings?: any[]): RawExpression;
  case(column?: string): CaseBuilder;
}

// Case builder interface
export interface CaseBuilder {
  when(condition: any, value: any): this;
  else(value: any): this;
  end(alias?: string): RawExpression;
}

// JoinBuilder is imported via type-only import to prevent circular dependency
// while providing proper TypeScript spec compliance for three-layer architecture

export class Builder implements QueryBuilder {
  protected connection: any;
  protected grammar: any;
  protected processor: any;
  private queries: QueryStorage;
  private methods: Methods;
  private operators: string[];
  private _isTransaction: boolean = false;
  public components: any;

  constructor(connection: any, grammar: any = null, processor: any = null) {
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

    // Components structure for test compatibility
    this.components = {
      columns: [],
      from: null,
      joins: [],
      wheres: [],
      groups: [],
      havings: [],
      orders: [],
      limits: [],
      offset: [],
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
    ];
  }

  /**
   * Set the database connection
   */
  setConnection(connection: any): this {
    this.connection = connection;
    return this;
  }

  /**
   * Set the grammar instance
   */
  setGrammar(grammar: any): this {
    this.grammar = grammar;
    return this;
  }

  /**
   * Set the processor instance
   */
  setProcessor(processor: any): this {
    this.processor = processor;
    return this;
  }

  /**
   * Add columns to SELECT clause
   */
  select(...columns: string[]): this {
    if (columns.length === 0) {
      columns = ["*"];
    }

    for (const column of columns) {
      this.queries.columns.queries.push(column);
    }

    return this;
  }

  /**
   * Add DISTINCT to SELECT clause
   *
   * @returns This builder instance
   */
  distinct(): this {
    this.queries.distinct = { queries: [true], bindings: [] };
    return this;
  }

  /**
   * Add raw SQL SELECT expression
   *
   * @param expression - Raw SQL expression
   * @param bindings - Parameter bindings
   * @returns This builder instance
   */
  selectRaw(expression: string, bindings: any[] = []): this {
    return this.addQueryBindings(this.raw(expression), bindings, "columns");
  }

  /**
   * Add subquery to SELECT clause
   *
   * @param column - Subquery callback or Builder instance
   * @param as - Alias for subquery
   * @returns This builder instance
   */
  selectSub(column: Function | Builder | string[], as?: string): this {
    if (Array.isArray(column)) {
      return this.select(...column);
    }

    const [query, bindings] = this.createSub(column);
    return this.selectRaw(this.subQueryAsContactBacktick(query, as), bindings);
  }

  /**
   * Set FROM table
   */
  from(table: string, alias?: string): this {
    const tableExpression = alias ? `${table} as ${alias}` : table;
    this.queries.froms.queries.push(tableExpression);
    return this;
  }

  /**
   * Set FROM clause with raw expression
   *
   * @param expression - Raw SQL expression
   * @param bindings - Parameter bindings
   * @returns This builder instance
   */
  fromRaw(expression: string, bindings: any[] = []): this {
    return this.addQueryBindings(expression, bindings, "froms");
  }

  /**
   * Add subquery to FROM clause
   *
   * @param from - Subquery callback or Builder instance
   * @param as - Alias for subquery
   * @returns This builder instance
   */
  fromSub(from: Function | Builder | string[], as?: string): this {
    if (Array.isArray(from)) {
      // For array input, just use the first element as table name
      return this.from(from[0], as);
    }

    const [query, bindings] = this.createSub(from);
    return this.fromRaw(this.subQueryAsContactBacktick(query, as), bindings);
  }

  /**
   * Add WHERE condition
   */
  where(column: string | Function, operator?: any, value?: any): this {
    // Handle callback for subqueries
    if (typeof column === "function") {
      const subBuilder = new Builder(
        this.connection,
        this.grammar,
        this.processor,
      );
      column(subBuilder);
      const nestedWhere = {
        type: "nested",
        query: subBuilder,
        boolean: "and",
      };
      this.queries.wheres.queries.push(nestedWhere);

      // Also update components for test compatibility
      this.components.wheres.push(nestedWhere);

      this.queries.wheres.bindings.push(...subBuilder.getBindings());
      return this;
    }

    // Handle two-parameter calls (column, value)
    if (arguments.length === 2) {
      value = operator;
      operator = "=";
    }

    const whereClause = {
      column,
      operator,
      value,
      boolean: "and",
      type: "basic",
    };

    this.queries.wheres.queries.push(whereClause);

    // Also update components for test compatibility
    this.components.wheres.push(whereClause);

    if (value !== undefined && value !== null) {
      this.queries.wheres.bindings.push(value);
    }

    return this;
  }

  /**
   * Add OR WHERE condition
   */
  orWhere(column: string | Function, operator?: any, value?: any): this {
    // Similar to where() but with 'or' boolean
    if (typeof column === "function") {
      const subBuilder = new Builder(
        this.connection,
        this.grammar,
        this.processor,
      );
      column(subBuilder);
      this.queries.wheres.queries.push({
        type: "nested",
        query: subBuilder,
        boolean: "or",
      });
      this.queries.wheres.bindings.push(...subBuilder.getBindings());
      return this;
    }

    if (arguments.length === 2) {
      value = operator;
      operator = "=";
    }

    this.queries.wheres.queries.push({
      column,
      operator,
      value,
      boolean: "or",
      type: "basic",
    });

    if (value !== undefined && value !== null) {
      this.queries.wheres.bindings.push(value);
    }

    return this;
  }

  /**
   * Add WHERE clause with subquery
   *
   * @param column - Column name
   * @param operator - Comparison operator
   * @param callback - Subquery callback or Builder instance
   * @param andOr - Boolean operator (and/or)
   * @returns This builder instance
   */
  whereSub(
    column: string,
    operator: string,
    callback: Function | Builder,
    andOr: string = "and",
  ): this {
    if (typeof operator === "string") {
      operator = operator.toLowerCase();
    }

    // Prepare callback and operator
    [callback, operator] = this.prepareSubQueryArgs(
      operator,
      callback,
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
   * Add OR WHERE clause with subquery
   *
   * @param column - Column name
   * @param operator - Comparison operator
   * @param callback - Subquery callback or Builder instance
   * @returns This builder instance
   */
  orWhereSub(
    column: string,
    operator: string,
    callback: Function | Builder,
  ): this {
    [callback, operator] = this.prepareSubQueryArgs(
      operator,
      callback,
      arguments.length === 2,
    );

    return this.whereSub(column, operator, callback, "or");
  }

  /**
   * Add WHERE EXISTS clause
   *
   * @param callback - Subquery callback or Builder instance
   * @param andOr - Boolean operator (and/or)
   * @param not - Whether to use NOT EXISTS
   * @returns This builder instance
   */
  whereExists(
    callback: Function | Builder,
    andOr: string = "and",
    not: boolean = false,
  ): this {
    const [sql, bindings] = this.createSub(callback);
    const existsOperator = not ? "NOT EXISTS" : "EXISTS";

    return this.whereRaw(`${existsOperator} (${sql})`, bindings, andOr);
  }

  /**
   * Add WHERE NOT EXISTS clause
   *
   * @param callback - Subquery callback or Builder instance
   * @returns This builder instance
   */
  whereNotExists(callback: Function | Builder): this {
    return this.whereExists(callback, "and", true);
  }

  /**
   * Add WHERE EXISTS subquery clause (alias for whereExists)
   *
   * @param callback - Subquery callback or Builder instance
   * @returns This builder instance
   */
  whereExistsSub(callback: Function | Builder): this {
    return this.whereExists(callback);
  }

  /**
   * Add WHERE NOT EXISTS subquery clause (alias for whereNotExists)
   *
   * @param callback - Subquery callback or Builder instance
   * @returns This builder instance
   */
  whereNotExistsSub(callback: Function | Builder): this {
    return this.whereNotExists(callback);
  }

  /**
   * Add OR WHERE EXISTS clause
   *
   * @param callback - Subquery callback or Builder instance
   * @param not - Whether to use NOT EXISTS
   * @returns This builder instance
   */
  orWhereExists(callback: Function | Builder, not: boolean = false): this {
    return this.whereExists(callback, "or", not);
  }

  /**
   * Add OR WHERE NOT EXISTS clause
   *
   * @param callback - Subquery callback or Builder instance
   * @returns This builder instance
   */
  orWhereNotExists(callback: Function | Builder): this {
    return this.whereExists(callback, "or", true);
  }

  /**
   * Add WHERE IN condition
   */
  whereIn(column: string, values: any[]): this {
    this.queries.wheres.queries.push({
      column,
      values,
      boolean: "and",
      type: "in",
    });

    this.queries.wheres.bindings.push(...values);
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   */
  whereNotIn(column: string, values: any[]): this {
    this.queries.wheres.queries.push({
      column,
      values,
      boolean: "and",
      type: "not_in",
    });

    this.queries.wheres.bindings.push(...values);
    return this;
  }

  /**
   * Add WHERE BETWEEN condition
   */
  whereBetween(column: string, values: [any, any]): this {
    this.queries.wheres.queries.push({
      column,
      values,
      boolean: "and",
      type: "between",
    });

    this.queries.wheres.bindings.push(...values);
    return this;
  }

  /**
   * Add WHERE NULL condition
   */
  whereNull(column: string): this {
    this.queries.wheres.queries.push({
      column,
      boolean: "and",
      type: "null",
    });

    return this;
  }

  /**
   * Add WHERE NOT NULL condition
   */
  whereNotNull(column: string): this {
    this.queries.wheres.queries.push({
      column,
      boolean: "and",
      type: "not_null",
    });

    return this;
  }

  /**
   * Add INNER JOIN clause (API Layer)
   *
   * @param table - Table to join
   * @param first - First column name or callback function
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for continued method chaining
   */
  join(
    table: string,
    first: string | Function,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      // Fallback to basic implementation
      if (typeof first === "function") {
        throw new Error("Callback JOIN not available - JoinBuilder not loaded");
      }
      this.addJoin("inner", table, first as string, operator, second);
      return this as any;
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    if (typeof first === "function") {
      return joinBuilder.handleCallbackJoin(table, first, "inner");
    }

    return joinBuilder.processJoin(
      table,
      first,
      operator,
      second || first,
      "inner",
    );
  }

  /**
   * Add LEFT JOIN clause (API Layer)
   *
   * @param table - Table to join
   * @param first - First column name or callback function
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for continued method chaining
   */
  leftJoin(
    table: string,
    first: string | Function,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      // Fallback to basic implementation
      if (typeof first === "function") {
        throw new Error("Callback JOIN not available - JoinBuilder not loaded");
      }
      this.addJoin("left", table, first as string, operator, second);
      return this as any;
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    if (typeof first === "function") {
      return joinBuilder.handleCallbackJoin(table, first, "left");
    }

    return joinBuilder.processJoin(
      table,
      first,
      operator,
      second || first,
      "left",
    );
  }

  /**
   * Add RIGHT JOIN clause (API Layer)
   *
   * @param table - Table to join
   * @param first - First column name or callback function
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for continued method chaining
   */
  rightJoin(
    table: string,
    first: string | Function,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      throw new Error("JoinBuilder not available - module not loaded");
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    if (typeof first === "function") {
      return joinBuilder.handleCallbackJoin(table, first, "right");
    }

    return joinBuilder.processJoin(
      table,
      first,
      operator,
      second || first,
      "right",
    );
  }

  /**
   * Add FULL JOIN clause (API Layer)
   *
   * @param table - Table to join
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for continued method chaining
   */
  fullJoin(
    table: string,
    first: string,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      throw new Error("JoinBuilder not available - module not loaded");
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    return joinBuilder.processJoin(
      table,
      first,
      operator,
      second || first,
      "full",
    );
  }

  /**
   * Add CROSS JOIN clause (API Layer)
   *
   * @param table - Table to join
   * @returns JoinBuilder for continued method chaining
   */
  crossJoin(table: string): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      throw new Error("JoinBuilder not available - module not loaded");
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    return joinBuilder.processJoin(table, "", "", "", "cross");
  }

  /**
   * Add JOIN with WHERE condition (API Layer)
   *
   * @param table - Table to join
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @param type - JOIN type
   * @returns JoinBuilder for continued method chaining
   */
  joinWhere(
    table: string,
    first: string,
    operator: string = "=",
    second?: string,
    type: "inner" | "left" | "right" | "full" | "cross" = "inner",
  ): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      throw new Error("JoinBuilder not available - module not loaded");
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    return joinBuilder.processJoin(
      table,
      first,
      operator,
      second || first,
      type,
    );
  }

  /**
   * Add JOIN clause helper - unified method for all JOIN types
   */
  public addJoin(
    type: string,
    table: string | any,
    first?: string,
    operator?: string,
    second?: string,
    options: { isWhere?: boolean; isSubquery?: boolean } = {},
  ): this {
    // Update both components and queries systems for Grammar compatibility
    const joinData = {
      type,
      table,
      first: first || "",
      operator: operator || "=",
      second: second || first || "",
      ...options,
    };

    this.components.joins.push(joinData);
    this.queries.joins.queries.push(joinData);

    return this;
  }

  /**
   * Add JOIN with subquery (API Layer)
   * Delegates to JoinBuilder for business logic processing
   *
   * @param table - Subquery callback or Builder instance
   * @param as - Table alias for the subquery
   * @param first - Join condition (left table column)
   * @param operator - Comparison operator (defaults to '=')
   * @param second - Right table column or value
   * @param type - Join type: 'inner', 'left', 'right', 'full'
   * @param isWhere - Whether to use WHERE conditions
   * @returns JoinBuilder for continued method chaining
   */
  joinSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator: string = "=",
    second?: string,
    type: string = "inner",
    isWhere: boolean = false,
  ): JoinBuilder {
    const JoinBuilderClass = this._getJoinBuilderClass();

    if (!JoinBuilderClass) {
      // Fallback to basic implementation
      const [query, bindings] = this.createSub(table);

      if (bindings.length > 0) {
        this.addBinding(bindings, "joins");
      }

      const subqueryTable = `(${query}) AS ${this.contactBacktick(as)}`;
      this.addJoin(type, subqueryTable, first, operator, second, {
        isWhere,
        isSubquery: true,
      });
      return this as any;
    }

    const joinBuilder = new JoinBuilderClass(this.connection);
    this.copyStateTo(joinBuilder);

    // Process subquery and create the formatted table reference
    const [query, bindings] = joinBuilder.createSub(table);
    if (bindings.length > 0) {
      joinBuilder.addBinding(bindings, "joins");
    }
    const subqueryTable = `(${query}) AS ${joinBuilder.contactBacktick(as)}`;

    // Delegate to JoinBuilder's processJoin with subquery table
    return joinBuilder.processSubqueryJoin(
      subqueryTable,
      first,
      operator,
      second || first,
      type as any,
      isWhere,
    );
  }

  /**
   * Add LEFT JOIN with subquery (API Layer)
   *
   * @param table - Subquery definition
   * @param as - Table alias for the subquery
   * @param first - Join condition (left table column)
   * @param operator - Comparison operator (defaults to '=')
   * @param second - Subquery column or value to compare
   * @returns JoinBuilder for continued method chaining
   */
  leftJoinSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    return this.joinSub(table, as, first, operator, second, "left");
  }

  /**
   * Add RIGHT JOIN with subquery (API Layer)
   *
   * @param table - Subquery definition
   * @param as - Table alias for the subquery
   * @param first - Join condition (left table column)
   * @param operator - Comparison operator (defaults to '=')
   * @param second - Subquery column or value to compare
   * @returns JoinBuilder for continued method chaining
   */
  rightJoinSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    return this.joinSub(table, as, first, operator, second, "right");
  }

  /**
   * Add JOIN with subquery with WHERE condition (API Layer)
   *
   * @param table - Subquery callback, builder, or SQL
   * @param as - Alias for subquery
   * @param first - First condition
   * @param operator - Join operator
   * @param second - Second condition
   * @param type - Join type
   * @returns JoinBuilder for continued method chaining
   */
  joinWhereSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator: string = "=",
    second?: string,
    type: string = "inner",
  ): JoinBuilder {
    return this.joinSub(table, as, first, operator, second, type, true);
  }

  /**
   * Add LEFT JOIN with subquery with WHERE condition (API Layer)
   *
   * @param table - Subquery
   * @param as - Alias
   * @param first - First condition
   * @param operator - Join operator
   * @param second - Second condition
   * @returns JoinBuilder for continued method chaining
   */
  leftJoinWhereSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    return this.joinWhereSub(table, as, first, operator, second, "left");
  }

  /**
   * Add RIGHT JOIN with subquery with WHERE condition (API Layer)
   *
   * @param table - Subquery
   * @param as - Alias
   * @param first - First condition
   * @param operator - Join operator
   * @param second - Second condition
   * @returns JoinBuilder for continued method chaining
   */
  rightJoinWhereSub(
    table: Function | Builder,
    as: string,
    first: string,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    return this.joinWhereSub(table, as, first, operator, second, "right");
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(column: string, direction: "asc" | "desc" = "asc"): this {
    this.queries.orders.queries.push({
      column,
      direction: direction.toLowerCase(),
    });

    return this;
  }

  /**
   * Add ORDER BY subquery clause
   */
  orderBySub(
    query: Function | Builder,
    direction: "asc" | "desc" = "asc",
  ): this {
    const [sql, bindings] = this.createSub(query);
    this.addBinding(bindings, "order");

    this.queries.orders.queries.push({
      column: `(${sql})`,
      direction: direction.toLowerCase(),
      isSubquery: true,
    });

    return this;
  }

  /**
   * Add GROUP BY clause
   */
  groupBy(...columns: string[]): this {
    for (const column of columns) {
      this.queries.groups.queries.push(column);
    }

    return this;
  }

  /**
   * Add GROUP BY subquery clause
   */
  groupBySub(query: Function | Builder): this {
    const [sql, bindings] = this.createSub(query);
    this.addBinding(bindings, "group");

    this.queries.groups.queries.push(`(${sql})`);

    return this;
  }

  /**
   * Add HAVING clause
   */
  having(column: string, operator: any = "=", value?: any): this {
    if (arguments.length === 2) {
      value = operator;
      operator = "=";
    }

    this.queries.havings.queries.push({
      column,
      operator,
      value,
      boolean: "and",
    });

    if (value !== undefined && value !== null) {
      this.queries.havings.bindings.push(value);
    }

    return this;
  }

  /**
   * Add LIMIT clause
   */
  limit(count: number): this {
    this.queries.limits.queries.push(count);
    return this;
  }

  /**
   * Add OFFSET clause
   */
  offset(count: number): this {
    this.queries.offset.queries.push(count);
    return this;
  }

  /**
   * Execute query and get all results
   */
  async get(): Promise<any[]> {
    const sql = this.toSql();
    const bindings = this.getBindings();

    const results = await this.connection.query(sql, bindings);
    return this.processor.processSelectResults(results);
  }

  /**
   * Get first result
   */
  async first(): Promise<any> {
    this.limit(1);
    const results = await this.get();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find record by ID
   */
  async find(id: any): Promise<any> {
    return this.where("id", id).first();
  }

  /**
   * Get count
   */
  async count(column: string = "*"): Promise<number> {
    const result = await this.aggregate("count", column);
    return parseInt(result) || 0;
  }

  /**
   * Get sum
   */
  async sum(column: string): Promise<number> {
    const result = await this.aggregate("sum", column);
    return parseFloat(result) || 0;
  }

  /**
   * Get average
   */
  async avg(column: string): Promise<number> {
    const result = await this.aggregate("avg", column);
    return parseFloat(result) || 0;
  }

  /**
   * Get maximum value
   */
  async max(column: string): Promise<any> {
    return await this.aggregate("max", column);
  }

  /**
   * Get minimum value
   */
  async min(column: string): Promise<any> {
    return await this.aggregate("min", column);
  }

  /**
   * Execute aggregate function
   */
  private async aggregate(func: string, column: string): Promise<any> {
    const originalColumns = this.queries.columns.queries;
    this.queries.columns.queries = [`${func}(${column}) as aggregate`];

    const results = await this.get();
    this.queries.columns.queries = originalColumns;

    return results.length > 0 ? results[0].aggregate : null;
  }

  /**
   * Insert records
   */
  async insert(data: object | object[]): Promise<any> {
    const insertData = Array.isArray(data) ? data : [data];

    this.queries.insert.queries = insertData;

    const sql = this.grammar.compileInsert(this, insertData);
    const bindings = this.getInsertBindings(insertData);

    return await this.connection.query(sql, bindings);
  }

  /**
   * Insert records using subquery (INSERT INTO ... SELECT ...)
   */
  async insertSub(columns: string[], query: Function | Builder): Promise<any> {
    const [sql, bindings] = this.createSub(query);
    this.addBinding(bindings, "insert");

    // Create INSERT INTO table (columns) SELECT... statement
    const tableName = this.queries.from?.queries?.[0] || this.table;
    if (!tableName) {
      throw new Error("Table not specified for INSERT");
    }

    const wrappedColumns = columns
      .map((col) => this.contactBacktick(col))
      .join(", ");
    const wrappedTable = this.contactBacktick(tableName);
    const compiledSql = `INSERT INTO ${wrappedTable} (${wrappedColumns}) ${sql}`;

    const allBindings = this.getBindings();

    return await this.connection.query(compiledSql, allBindings);
  }

  /**
   * Update records
   */
  async update(data: object): Promise<number> {
    this.queries.update.queries.push(data);

    const sql = this.grammar.compileUpdate(this, data);
    const bindings = this.getUpdateBindings(data);

    const result = await this.connection.query(sql, bindings);
    return result.affectedRows || result.changes || 0;
  }

  /**
   * Delete records
   */
  async delete(): Promise<number> {
    const sql = this.grammar.compileDelete(this);
    const bindings = this.getBindings();

    const result = await this.connection.query(sql, bindings);
    return result.affectedRows || result.changes || 0;
  }

  /**
   * Update records with JOIN (MySQL specific)
   */
  async updateWithJoin(data: object): Promise<number> {
    if (typeof this.grammar.compileUpdateWithJoin !== "function") {
      throw new Error("updateWithJoin is only supported for MySQL database");
    }

    this.queries.update.queries.push(data);

    const sql = this.grammar.compileUpdateWithJoin(this, data);
    const bindings = this.getUpdateBindings(data);

    const result = await this.connection.query(sql, bindings);
    return result.affectedRows || result.changes || 0;
  }

  /**
   * Delete records with JOIN (MySQL specific)
   */
  async deleteWithJoin(): Promise<number> {
    if (typeof this.grammar.compileDeleteWithJoin !== "function") {
      throw new Error("deleteWithJoin is only supported for MySQL database");
    }

    const sql = this.grammar.compileDeleteWithJoin(this);
    const bindings = this.getBindings();

    const result = await this.connection.query(sql, bindings);
    return result.affectedRows || result.changes || 0;
  }

  /**
   * Create raw SQL expression
   */
  /**
   * Create CASE expression
   */
  case(column?: string): CaseBuilder {
    return new CaseBuilderImpl(column, () => this.newQuery());
  }

  /**
   * Get query bindings
   */
  getBindings(): any[] {
    // Order must match SQL compilation order: joins → wheres → havings
    return [
      ...this.queries.joins.bindings,
      ...this.queries.wheres.bindings,
      ...this.queries.havings.bindings,
    ];
  }

  /**
   * Get insert bindings
   */
  private getInsertBindings(data: object[]): any[] {
    const bindings: any[] = [];
    for (const record of data) {
      bindings.push(...Object.values(record));
    }
    return bindings;
  }

  /**
   * Get update bindings
   */
  private getUpdateBindings(data: object): any[] {
    const bindings: any[] = [];

    // Process each value in the update data
    for (const value of Object.values(data)) {
      if (value && typeof value === "object" && value.bindings) {
        // Handle objects with nested bindings (like CASE expressions)
        bindings.push(...this.flattenBindings(value.bindings));
      } else if (value && typeof value === "object" && value.raw === true) {
        // Handle raw SQL expressions without nested bindings
        continue; // Skip raw values without bindings
      } else {
        // Handle regular values
        bindings.push(value);
      }
    }

    // Add WHERE clause bindings
    bindings.push(...this.getBindings());
    return bindings;
  }

  /**
   * Flatten nested bindings array
   */
  private flattenBindings(bindings: any[]): any[] {
    const result: any[] = [];
    for (const binding of bindings) {
      if (typeof binding === "function") {
        // Execute function to get subquery bindings
        const subBuilder = this.newQuery();
        binding(subBuilder);
        result.push(...subBuilder.getBindings());
      } else {
        result.push(binding);
      }
    }
    return result;
  }

  /**
   * Convert query to SQL
   */
  toSql(): string {
    if (!this.grammar) {
      throw new Error("Grammar not set");
    }
    return this.grammar.compileSelect(this);
  }

  /**
   * Start transaction
   */
  async transaction(): Promise<Builder> {
    await this.connection.beginTransaction();
    const transactionBuilder = new Builder(
      this.connection,
      this.grammar,
      this.processor,
    );
    transactionBuilder._isTransaction = true;
    return transactionBuilder;
  }

  /**
   * Commit transaction
   */
  async commit(): Promise<void> {
    await this.connection.commit();
  }

  /**
   * Rollback transaction
   */
  async rollback(): Promise<void> {
    await this.connection.rollback();
  }

  /**
   * Set table name (alias for from)
   */
  table(name: string, alias?: string): this {
    return this.from(name, alias);
  }

  /**
   * Create new Query Builder instance
   */
  newQuery(): Builder {
    return new Builder(this.connection, this.grammar, this.processor);
  }

  /**
   * Get query component value
   */
  getQuery(key: string, defaultValue: any = null): any {
    const keys = key.split(".");
    let current: any = this.queries;

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
   * Add query component
   */
  addQuery(component: string, query: any, bindings: any[] = []): this {
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
   * Add binding values
   */
  addBinding(bindings: any[], type: string = "where"): this {
    if (!this.queries[type]) {
      this.queries[type] = { queries: [], bindings: [] };
    }

    this.queries[type].bindings.push(...bindings);
    return this;
  }

  /**
   * Add query with bindings
   */
  addQueryBindings(query: any, bindings: any[] = [], type: string): this {
    this.addQuery(type, query);

    if (bindings.length > 0) {
      this.addBinding(bindings, type);
    }

    return this;
  }

  /**
   * Check if operator is invalid
   */
  invalidOperator(operator: string): boolean {
    return !this.operators.includes(operator.toLowerCase());
  }

  /**
   * Prepare value and operator for where conditions
   */
  prepareValueAndOperator(
    value: any,
    operator: string,
    useDefault: boolean = false,
  ): [any, string] {
    if (useDefault) {
      // For 2-parameter calls: column, callback -> callback, '='
      return [operator, "="];
    }

    if (this.invalidOperator(operator)) {
      // Invalid operator, use value as operator and set default '='
      return [operator, "="];
    }

    return [value, operator];
  }

  /**
   * Prepare callback and operator for subquery conditions
   */
  prepareSubQueryArgs(
    operator: string,
    callback: Function | Builder,
    useDefault: boolean = false,
  ): [Function | Builder, string] {
    if (useDefault) {
      // For 2-parameter calls: column, callback -> callback, '='
      return [callback, "="];
    }

    if (this.invalidOperator(operator)) {
      // Invalid operator, use callback as callback and default operator
      return [callback, "="];
    }

    return [callback, operator];
  }

  /**
   * Copy current Builder state to another Builder instance
   *
   * @param target - Target Builder instance to copy state to
   * @private
   */
  private copyStateTo(target: Builder): void {
    // Copy components
    target.components = {
      ...this.components,
      joins: [...this.components.joins],
      wheres: [...this.components.wheres],
      columns: [...this.components.columns],
    };

    // Copy queries
    target.queries = {
      columns: {
        queries: [...this.queries.columns.queries],
        bindings: [...this.queries.columns.bindings],
      },
      froms: {
        queries: [...this.queries.froms.queries],
        bindings: [...this.queries.froms.bindings],
      },
      joins: {
        queries: [...this.queries.joins.queries],
        bindings: [...this.queries.joins.bindings],
      },
      wheres: {
        queries: [...this.queries.wheres.queries],
        bindings: [...this.queries.wheres.bindings],
      },
      groups: {
        queries: [...this.queries.groups.queries],
        bindings: [...this.queries.groups.bindings],
      },
      havings: {
        queries: [...this.queries.havings.queries],
        bindings: [...this.queries.havings.bindings],
      },
      orders: {
        queries: [...this.queries.orders.queries],
        bindings: [...this.queries.orders.bindings],
      },
      limits: {
        queries: [...this.queries.limits.queries],
        bindings: [...this.queries.limits.bindings],
      },
      offset: {
        queries: [...this.queries.offset.queries],
        bindings: [...this.queries.offset.bindings],
      },
      insert: {
        queries: [...this.queries.insert.queries],
        bindings: [...this.queries.insert.bindings],
      },
      update: {
        queries: [...this.queries.update.queries],
        bindings: [...this.queries.update.bindings],
      },
      unions: {
        queries: [...this.queries.unions.queries],
        bindings: [...this.queries.unions.bindings],
      },
    };

    // Copy other important properties
    target.table = this.table;
    target.from = this.from;
    target.grammar = this.grammar;
  }

  /**
   * Get JoinBuilder class from registry
   * @private
   */
  private _getJoinBuilderClass(): any {
    try {
      return typeof globalThis !== "undefined" &&
        (globalThis as any).JoinBuilderClass
        ? (globalThis as any).JoinBuilderClass
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Wrap column name with backticks
   */
  contactBacktick(column: string | any): string {
    if (!column || this.isRaw(column)) {
      return this.isRaw(column) ? (column as any).value : column;
    }

    // Convert to string if not already a string
    const columnStr = String(column);

    // Handle table.column format
    if (columnStr.includes(".")) {
      const parts = columnStr.split(".");
      return parts.map((part) => `\`${part.trim()}\``).join(".");
    }

    return `\`${columnStr.trim()}\``;
  }

  /**
   * Check if value is raw SQL
   */
  isRaw(value: any): boolean {
    return value && typeof value === "object" && value.raw === true;
  }

  /**
   * Create a raw query expression
   */
  raw(value: string, bindings: any[] = []): RawExpression {
    return {
      type: "raw",
      raw: true,
      value: value,
      bindings: bindings,
    };
  }

  /**
   * Add raw WHERE clause
   */
  whereRaw(sql: string, bindings: any[] = [], andOr: string = "and"): this {
    const andOrUpper = andOr.toUpperCase();
    const existingWheres = this.getQuery("wheres.queries", []);
    const prefix = existingWheres.length === 0 ? "" : ` ${andOrUpper} `;

    return this.addQueryBindings(`${prefix}${sql}`, bindings, "wheres");
  }

  /**
   * Add raw WHERE clause with OR
   */
  orWhereRaw(sql: string, bindings: any[] = []): this {
    return this.whereRaw(sql, bindings, "or");
  }

  /**
   * Create subquery from callback or builder
   * Core helper for all sub-query functionality
   *
   * @param callback - Function callback or Builder instance
   * @returns [sql, bindings] tuple
   */
  createSub(callback: Function | Builder): [string, any[]] {
    let query: string;
    let bindings: any[];

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
   * Format subquery with optional alias
   *
   * @param query - SQL query string
   * @param as - Optional alias
   * @returns Formatted subquery string
   */
  subQueryAsContactBacktick(query: string, as?: string): string {
    let formatted = `(${query})`;

    if (as) {
      formatted += ` AS ${as}`;
    }

    return formatted;
  }

  /**
   * Format query with optional alias (enhanced from historical implementation)
   *
   * @param query - Query string
   * @param as - Optional alias
   * @returns Formatted query string
   */
  queryAsContactBacktick(query: string, as?: string): string {
    if (!query) {
      return query;
    }

    // If it's already a raw expression, return as is
    if (this.isRaw(query)) {
      return (query as any).value;
    }

    // Handle basic table name with optional alias
    let formatted = this.contactBacktick(query);

    if (as) {
      formatted += ` AS ${this.contactBacktick(as)}`;
    }

    return formatted;
  }
}

// Case builder implementation
class CaseBuilderImpl implements CaseBuilder {
  private conditions: Array<{ when: any; then: any; bindings?: any[] }> = [];
  private elseValue?: any;
  private column?: string;
  private newQueryFn?: () => Builder;

  constructor(column?: string, newQueryFn?: () => Builder) {
    this.column = column;
    this.newQueryFn = newQueryFn;
  }

  /**
   * Extract condition or subquery from builder for CASE WHEN syntax
   * Supports both parameter binding and subquery forms
   */
  private extractConditionOrSubquery(builder: Builder): {
    condition: string;
    isSubquery: boolean;
  } {
    try {
      // Try to generate full SQL - if successful, it's a complete query
      const sql = builder.toSql();
      if (sql && sql.includes("FROM")) {
        // Complete query with FROM clause - treat as subquery
        return { condition: `(${sql})`, isSubquery: true };
      }
    } catch (error) {
      // If toSql() fails, it's likely just conditions without FROM
    }

    // Extract WHERE conditions for parameter binding
    try {
      const grammar = (builder as any).grammar;
      if (!grammar) {
        return { condition: "1=1", isSubquery: false };
      }

      const whereClause = grammar.compileWheres(builder);
      if (whereClause && whereClause.startsWith("WHERE ")) {
        return { condition: whereClause.substring(6), isSubquery: false }; // Remove "WHERE " prefix
      } else if (whereClause) {
        return { condition: whereClause, isSubquery: false };
      }
    } catch (error) {
      // Fallback if grammar access fails
    }

    return { condition: "1=1", isSubquery: false };
  }

  when(condition: any, value: any): this {
    this.conditions.push({ when: condition, then: value });
    return this;
  }

  else(value: any): this {
    this.elseValue = value;
    return this;
  }

  end(alias?: string): RawExpression {
    let sql = "CASE";
    const bindings: any[] = [];

    if (this.column) {
      sql += ` ${this.column}`;
    }

    for (const condition of this.conditions) {
      if (typeof condition.when === "function") {
        // Handle function conditions - generate searched CASE syntax
        const subBuilder = this.newQueryFn
          ? this.newQueryFn()
          : new Builder(null);
        condition.when(subBuilder);

        // Always use searched CASE syntax for function conditions (no column prefix)
        if (this.column && sql === `CASE ${this.column}`) {
          sql = "CASE";
        }

        // Extract conditions or subquery and generate proper CASE WHEN syntax
        const { condition: conditions, isSubquery } =
          this.extractConditionOrSubquery(subBuilder);

        if (isSubquery) {
          // Subquery case: CASE WHEN column IN (SELECT ...)
          sql += ` WHEN ${this.column} IN ${conditions} THEN ?`;
          bindings.push(...subBuilder.getBindings(), condition.then);
        } else {
          // Parameter binding case: CASE WHEN conditions
          sql += ` WHEN ${conditions} THEN ?`;
          bindings.push(...subBuilder.getBindings(), condition.then);
        }
      } else if (this.column) {
        // Simple CASE with column
        sql += ` WHEN ? THEN ?`;
        bindings.push(condition.when, condition.then);
      } else if (this.column) {
        // Simple CASE with column
        sql += ` WHEN ? THEN ?`;
        bindings.push(condition.when, condition.then);
      } else {
        // Searched CASE without column
        sql += ` WHEN ${condition.when} THEN ?`;
        bindings.push(condition.then);
      }
    }

    if (this.elseValue !== undefined) {
      sql += ` ELSE ?`;
      bindings.push(this.elseValue);
    }

    sql += " END";

    if (alias) {
      sql += ` as ${alias}`;
    }

    return {
      type: "raw",
      raw: true,
      value: sql,
      bindings,
    };
  }
}

export default Builder;
