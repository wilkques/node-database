/**
 * JoinBuilder - Business Logic Layer for JOIN operations
 *
 * Inherits Builder state and provides JOIN-specific processing
 * Part of three-layer architecture: Builder (API) -> JoinBuilder (Business) -> Grammar (SQL)
 */
import { Builder } from "./Builder.js";
export type { Builder } from "./Builder.js";
type JoinType = "inner" | "left" | "right" | "full" | "cross";
type DatabaseConnection = any;
type TableReference = string | Builder | RawExpression;
interface RawExpression {
  type: "raw";
  raw: true;
  value: string;
  bindings: any[];
}
export interface JoinCondition {
  type: "basic" | "complex";
  first?: string;
  operator?: string;
  second?: string;
  condition?: any;
  boolean?: "and" | "or";
}
declare class JoinBuilder extends Builder {
  private conditions;
  private joinType;
  private joinTable;
  private isSubquery;
  private subqueryCallback?;
  constructor(
    connection: DatabaseConnection,
    table?: TableReference,
    type?: JoinType,
  );
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
  ): JoinBuilder;
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
    isWhere?: boolean,
  ): JoinBuilder;
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
  ): JoinBuilder;
  /**
   * Validate join parameters
   * @private
   */
  private validateJoinParameters;
  /**
   * Set join condition using ON clause
   *
   * @param first - First column or callback function
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for method chaining
   */
  on(first: string | Function, operator?: string, second?: string): JoinBuilder;
  /**
   * Add OR join condition
   *
   * @param first - First column name
   * @param operator - Comparison operator
   * @param second - Second column name
   * @returns JoinBuilder for method chaining
   */
  orOn(first: string, operator?: string, second?: string): JoinBuilder;
  /**
   * Set this as a subquery join
   *
   * @param callback - Subquery building callback
   * @returns JoinBuilder for method chaining
   */
  subquery(callback: (builder: JoinBuilder) => void): JoinBuilder;
  /**
   * Complete the join and return the main builder
   *
   * @returns Builder instance for continued method chaining
   */
  build(): Builder;
  /**
   * Finalize the join and add it to the main builder
   *
   * @returns JoinBuilder instance for continued method chaining
   * @private
   */
  private finalize;
  /**
   * Resolve table reference (handle raw tables and subqueries)
   * @private
   */
  private resolveTable;
  /**
   * Build ON condition SQL and collect bindings
   * @private
   */
  private buildConditionsAndBindings;
  /**
   * Add the join to the builder with proper condition handling
   * @private
   */
  private addJoinToBuilder;
  /**
   * Create a LEFT JOIN builder
   */
  static left(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder;
  /**
   * Create a RIGHT JOIN builder
   */
  static right(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder;
  /**
   * Create an INNER JOIN builder
   */
  static inner(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder;
  /**
   * Create a FULL JOIN builder
   */
  static full(
    connection: DatabaseConnection,
    table: TableReference,
  ): JoinBuilder;
  /**
   * Override method return types to maintain fluent interface
   * These methods ensure that after a JOIN operation, all subsequent Builder methods
   * continue to return JoinBuilder for proper type chaining.
   */
  where(column: string | Function, operator?: any, value?: any): this;
  select(...columns: string[]): this;
  orderBy(column: string, direction?: "asc" | "desc"): this;
  limit(count: number): this;
  groupBy(...columns: string[]): this;
  having(column: string, operator?: any, value?: any): this;
  offset(count: number): this;
  orWhere(column: string | Function, operator?: any, value?: any): this;
}
export default JoinBuilder;
//# sourceMappingURL=JoinBuilder.d.ts.map
