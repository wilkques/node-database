/**
 * JoinBuilder - Business Logic Layer for JOIN operations
 *
 * Inherits Builder state and provides JOIN-specific processing
 * Part of three-layer architecture: Builder (API) -> JoinBuilder (Business) -> Grammar (SQL)
 */

import { Builder, type RawExpression } from "./Builder.js";

// Export Builder type for improved TypeScript compatibility
export type { Builder } from "./Builder.js";

// Type definitions for better type safety
type JoinType = "inner" | "left" | "right" | "full" | "cross";
type DatabaseConnection = any; // TODO: Replace with proper connection interface
type TableReference = string | Builder | RawExpression;

export interface JoinCondition {
  type: "basic" | "complex";
  first?: string;
  operator?: string;
  second?: string;
  condition?: any;
  boolean?: "and" | "or"; // Support for OR conditions
}

class JoinBuilder extends Builder {
  private conditions: JoinCondition[] = [];
  private joinType: JoinType = "inner";
  private joinTable: TableReference | undefined;
  private isSubquery: boolean = false;
  private subqueryCallback?: (builder: JoinBuilder) => void;

  constructor(
    connection: DatabaseConnection,
    table?: TableReference,
    type: JoinType = "inner",
  ) {
    super(connection);
    if (table !== undefined) {
      this.joinTable = table;
      this.joinType = type;
    }
  }

  /**
   * Core processing method for JOIN operations
   *
   * @param table - Table name or subquery
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @param type - JOIN type (inner, left, right, full, cross)
   * @returns JoinBuilder for method chaining
   */
  processJoin(
    table: TableReference,
    first: string,
    operator: string,
    second: string,
    type: JoinType,
  ): JoinBuilder {
    this.validateJoinParameters(table, first, operator, second);
    this.addJoin(type, table, first, operator, second);
    return this;
  }

  /**
   * Process subquery JOIN operations (Business Logic Layer)
   * Handles subquery table references with proper binding tracking
   *
   * @param table - Formatted subquery table reference (e.g., "(SELECT ...) AS alias")
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @param type - JOIN type (inner, left, right, full, cross)
   * @param isWhere - Whether to use WHERE conditions
   * @returns JoinBuilder for method chaining
   */
  processSubqueryJoin(
    table: string,
    first: string,
    operator: string,
    second: string,
    type: JoinType,
    isWhere: boolean = false,
  ): JoinBuilder {
    // Validate basic parameters
    if (!table) {
      throw new Error("Subquery table reference is required");
    }

    // Add join with subquery metadata
    this.addJoin(type, table, first, operator, second, {
      isWhere,
      isSubquery: true,
    });
    return this;
  }

  /**
   * Handle callback-based JOIN operations (Business Logic Layer)
   *
   * @param table - Table name
   * @param callback - Callback function for complex conditions
   * @param type - JOIN type
   * @returns JoinBuilder for method chaining
   */
  handleCallbackJoin(
    table: string,
    callback: Function,
    type: JoinType,
  ): JoinBuilder {
    // Set up for a JOIN with this table and type
    this.joinType = type;
    this.joinTable = table;

    // Create a join handler that mimics the expected interface
    const joinHandler = {
      on: (first: string, operator: string = "=", second?: string) => {
        // Handle 2-parameter calls
        if (
          arguments.length === 2 &&
          typeof operator === "string" &&
          second === undefined
        ) {
          second = operator;
          operator = "=";
        }

        this.conditions.push({
          type: "basic",
          first: first,
          operator: operator,
          second: second || first,
        });
        return joinHandler;
      },
      orOn: (first: string, operator: string = "=", second?: string) => {
        // Handle 2-parameter calls
        if (
          arguments.length === 2 &&
          typeof operator === "string" &&
          second === undefined
        ) {
          second = operator;
          operator = "=";
        }

        this.conditions.push({
          type: "basic",
          first: first,
          operator: operator,
          second: second || first,
          boolean: "or",
        });
        return joinHandler;
      },
    };

    // Execute the callback with the join handler
    callback(joinHandler);

    // Finalize the join by calling our finalize method
    return this.finalize();
  }

  /**
   * Validate join parameters
   * @private
   */
  private validateJoinParameters(
    table?: TableReference,
    first?: string,
    operator?: string,
    second?: string,
  ): void {
    if (!table && !this.joinTable) {
      throw new Error("Join table is required");
    }

    if (first && !operator) {
      throw new Error("Operator is required when first column is specified");
    }

    if (first && operator && !second) {
      throw new Error("Second column is required for join condition");
    }
  }

  /**
   * Set join condition using ON clause
   *
   * @param first - First column or callback function
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for method chaining
   */
  on(
    first: string | Function,
    operator: string = "=",
    second?: string,
  ): JoinBuilder {
    // Handle 2-parameter calls: on(first, second) with default '=' operator
    if (
      arguments.length === 2 &&
      typeof operator === "string" &&
      second === undefined
    ) {
      second = operator;
      operator = "=";
    }

    if (typeof first === "function") {
      // Handle callback for complex conditions
      const subBuilder = new JoinBuilder(this.connection);
      first(subBuilder);

      // Extract WHERE conditions from subBuilder and convert to ON conditions
      const wheres = subBuilder.components?.wheres || [];
      wheres.forEach((where: any) => {
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
        second: second || first,
        boolean: "and",
      });
    }

    return this;
  }

  /**
   * Add OR join condition
   *
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for method chaining
   */
  orOn(first: string, operator: string = "=", second?: string): JoinBuilder {
    // Handle 2-parameter calls: orOn(first, second) with default '=' operator
    if (
      arguments.length === 2 &&
      typeof operator === "string" &&
      second === undefined
    ) {
      second = operator;
      operator = "=";
    }

    // Add OR condition instead of AND
    this.conditions.push({
      type: "basic",
      first: first,
      operator: operator,
      second: second || first,
      boolean: "or",
    });

    return this;
  }

  /**
   * Set this as a subquery join
   *
   * @param callback - Subquery building callback
   * @returns JoinBuilder for method chaining
   */
  subquery(callback: (builder: JoinBuilder) => void): JoinBuilder {
    this.isSubquery = true;
    this.subqueryCallback = callback;
    return this;
  }

  /**
   * Complete the join and return the main builder
   *
   * @returns Builder instance for continued method chaining
   */
  build(): Builder {
    return this.finalize();
  }

  /**
   * Finalize the join and add it to the main builder
   *
   * @returns JoinBuilder instance for continued method chaining
   * @private
   */
  private finalize(): JoinBuilder {
    const table = this.resolveTable();
    const { conditionSql, bindings } = this.buildConditionsAndBindings();

    if (bindings.length > 0) {
      this.addBinding(bindings, "joins");
    }

    this.addJoinToBuilder(table, conditionSql);
    return this;
  }

  /**
   * Resolve table reference (handle raw tables and subqueries)
   * @private
   */
  private resolveTable(): string | TableReference {
    let table: string | TableReference = this.joinTable || "";

    // Handle raw table objects (from joinSub)
    if (
      this.joinTable &&
      typeof this.joinTable === "object" &&
      (this.joinTable as RawExpression).raw === true
    ) {
      table = (this.joinTable as RawExpression).value;
    }

    // Handle subquery
    if (this.isSubquery && this.subqueryCallback) {
      const subBuilder = new JoinBuilder(this.connection);
      this.subqueryCallback(subBuilder);

      const subSql = subBuilder.toSql();
      table = `(${subSql})`;
    }

    return table;
  }

  /**
   * Build ON condition SQL and collect bindings
   * @private
   */
  private buildConditionsAndBindings(): {
    conditionSql: string;
    bindings: any[];
  } {
    const bindings: any[] = [];
    let conditionSql = "";

    if (this.conditions.length === 0) {
      return { conditionSql, bindings };
    }

    const conditionParts: string[] = [];

    this.conditions.forEach((condition, index) => {
      if (condition.type === "basic") {
        const first = this.contactBacktick(condition.first || "");
        const second = this.contactBacktick(condition.second || "");
        const part = `${first} ${condition.operator} ${second}`;

        // Add OR/AND connector for subsequent conditions
        if (index > 0 && condition.boolean === "or") {
          conditionParts.push(`OR ${part}`);
        } else if (index > 0) {
          conditionParts.push(`AND ${part}`);
        } else {
          conditionParts.push(part);
        }
      } else if (condition.type === "complex") {
        // Handle complex conditions from callbacks
        const whereCondition = condition.condition;
        if (
          whereCondition.column &&
          whereCondition.operator &&
          whereCondition.value !== undefined
        ) {
          const col = this.contactBacktick(whereCondition.column);
          const part = `${col} ${whereCondition.operator} ?`;

          if (index > 0 && condition.boolean === "or") {
            conditionParts.push(`OR ${part}`);
          } else if (index > 0) {
            conditionParts.push(`AND ${part}`);
          } else {
            conditionParts.push(part);
          }

          bindings.push(whereCondition.value);
        }
      }
    });

    conditionSql = conditionParts.join(" ");

    // Handle subquery bindings
    if (this.isSubquery && this.subqueryCallback) {
      const subBuilder = new JoinBuilder(this.connection);
      this.subqueryCallback(subBuilder);
      const subBindings = subBuilder.getBindings();
      bindings.unshift(...subBindings); // Add at beginning for subquery
    }

    return { conditionSql, bindings };
  }

  /**
   * Add the join to the builder with proper condition handling
   * @private
   */
  private addJoinToBuilder(
    table: string | TableReference,
    conditionSql: string,
  ): void {
    const firstCondition = this.conditions[0];

    if (firstCondition && firstCondition.type === "basic") {
      // Use proper condition for simple joins
      this.addJoin(
        this.joinType || "inner",
        table,
        firstCondition.first,
        firstCondition.operator,
        firstCondition.second,
      );
    } else if (conditionSql) {
      // Use complex condition SQL for advanced joins
      this.addJoin(
        this.joinType || "inner",
        table,
        "COMPLEX_CONDITIONS",
        "=",
        conditionSql,
      );
    } else {
      // Fallback for joins without conditions (like CROSS JOIN)
      this.addJoin(this.joinType || "inner", table);
    }
  }

  /**
   * Create a LEFT JOIN builder
   */
  static left(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder {
    return new JoinBuilder(connection, table, "left");
  }

  /**
   * Create a RIGHT JOIN builder
   */
  static right(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder {
    return new JoinBuilder(connection, table, "right");
  }

  /**
   * Create an INNER JOIN builder
   */
  static inner(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder {
    return new JoinBuilder(connection, table, "inner");
  }

  /**
   * Create a FULL JOIN builder
   */
  static full(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder {
    return new JoinBuilder(connection, table, "full");
  }

  /**
   * Override method return types to maintain fluent interface
   * These methods ensure that after a JOIN operation, all subsequent Builder methods
   * continue to return JoinBuilder for proper type chaining.
   */
  where(column: string | Function, operator?: any, value?: any): this {
    super.where(column, operator, value);
    return this;
  }

  select(...columns: string[]): this {
    super.select(...columns);
    return this;
  }

  orderBy(column: string, direction?: "asc" | "desc"): this {
    super.orderBy(column, direction);
    return this;
  }

  limit(count: number): this {
    super.limit(count);
    return this;
  }

  groupBy(...columns: string[]): this {
    super.groupBy(...columns);
    return this;
  }

  having(column: string, operator?: any, value?: any): this {
    super.having(column, operator, value);
    return this;
  }

  offset(count: number): this {
    super.offset(count);
    return this;
  }

  orWhere(column: string | Function, operator?: any, value?: any): this {
    super.orWhere(column, operator, value);
    return this;
  }
}

// Register JoinBuilder globally for spec-compliant delegation
if (typeof globalThis !== "undefined") {
  (globalThis as any).JoinBuilderClass = JoinBuilder;
}

export default JoinBuilder;
