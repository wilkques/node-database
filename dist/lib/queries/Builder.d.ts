/**
 * Builder - Query Builder class with fluent interface
 *
 * Complete implementation based on PHP Builder functionality
 * Provides chainable methods for building SQL queries
 */
import type JoinBuilder from './JoinBuilder.js';
interface RawExpression {
    type: 'raw';
    raw: true;
    value: string;
    bindings: any[];
}
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
    join(table: string, first: string | Function, operator?: string, second?: string): JoinBuilder;
    leftJoin(table: string, first: string | Function, operator?: string, second?: string): JoinBuilder;
    rightJoin(table: string, first: string | Function, operator?: string, second?: string): JoinBuilder;
    crossJoin(table: string): JoinBuilder;
    fullJoin(table: string, first: string, operator?: string, second?: string): JoinBuilder;
    joinWhere(table: string, first: string, operator?: string, second?: string, type?: string): JoinBuilder;
    joinSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string, type?: string, isWhere?: boolean): JoinBuilder;
    leftJoinSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
    rightJoinSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
    joinWhereSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string, type?: string): JoinBuilder;
    leftJoinWhereSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
    rightJoinWhereSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
    orderBy(column: string, direction?: 'asc' | 'desc'): this;
    orderBySub(query: Function | Builder, direction?: 'asc' | 'desc'): this;
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
export interface CaseBuilder {
    when(condition: any, value: any): this;
    else(value: any): this;
    end(alias?: string): RawExpression;
}
export declare class Builder implements QueryBuilder {
    protected connection: any;
    protected grammar: any;
    protected processor: any;
    private queries;
    private methods;
    private operators;
    private _isTransaction;
    components: any;
    constructor(connection: any, grammar?: any, processor?: any);
    /**
     * Set the database connection
     */
    setConnection(connection: any): this;
    /**
     * Set the grammar instance
     */
    setGrammar(grammar: any): this;
    /**
     * Set the processor instance
     */
    setProcessor(processor: any): this;
    /**
     * Add columns to SELECT clause
     */
    select(...columns: string[]): this;
    /**
     * Add DISTINCT to SELECT clause
     *
     * @returns This builder instance
     */
    distinct(): this;
    /**
     * Add raw SQL SELECT expression
     *
     * @param expression - Raw SQL expression
     * @param bindings - Parameter bindings
     * @returns This builder instance
     */
    selectRaw(expression: string, bindings?: any[]): this;
    /**
     * Add subquery to SELECT clause
     *
     * @param column - Subquery callback or Builder instance
     * @param as - Alias for subquery
     * @returns This builder instance
     */
    selectSub(column: Function | Builder | string[], as?: string): this;
    /**
     * Set FROM table
     */
    from(table: string, alias?: string): this;
    /**
     * Set FROM clause with raw expression
     *
     * @param expression - Raw SQL expression
     * @param bindings - Parameter bindings
     * @returns This builder instance
     */
    fromRaw(expression: string, bindings?: any[]): this;
    /**
     * Add subquery to FROM clause
     *
     * @param from - Subquery callback or Builder instance
     * @param as - Alias for subquery
     * @returns This builder instance
     */
    fromSub(from: Function | Builder | string[], as?: string): this;
    /**
     * Add WHERE condition
     */
    where(column: string | Function, operator?: any, value?: any): this;
    /**
     * Add OR WHERE condition
     */
    orWhere(column: string | Function, operator?: any, value?: any): this;
    /**
     * Add WHERE clause with subquery
     *
     * @param column - Column name
     * @param operator - Comparison operator
     * @param callback - Subquery callback or Builder instance
     * @param andOr - Boolean operator (and/or)
     * @returns This builder instance
     */
    whereSub(column: string, operator: string, callback: Function | Builder, andOr?: string): this;
    /**
     * Add OR WHERE clause with subquery
     *
     * @param column - Column name
     * @param operator - Comparison operator
     * @param callback - Subquery callback or Builder instance
     * @returns This builder instance
     */
    orWhereSub(column: string, operator: string, callback: Function | Builder): this;
    /**
     * Add WHERE EXISTS clause
     *
     * @param callback - Subquery callback or Builder instance
     * @param andOr - Boolean operator (and/or)
     * @param not - Whether to use NOT EXISTS
     * @returns This builder instance
     */
    whereExists(callback: Function | Builder, andOr?: string, not?: boolean): this;
    /**
     * Add WHERE NOT EXISTS clause
     *
     * @param callback - Subquery callback or Builder instance
     * @returns This builder instance
     */
    whereNotExists(callback: Function | Builder): this;
    /**
     * Add WHERE EXISTS subquery clause (alias for whereExists)
     *
     * @param callback - Subquery callback or Builder instance
     * @returns This builder instance
     */
    whereExistsSub(callback: Function | Builder): this;
    /**
     * Add WHERE NOT EXISTS subquery clause (alias for whereNotExists)
     *
     * @param callback - Subquery callback or Builder instance
     * @returns This builder instance
     */
    whereNotExistsSub(callback: Function | Builder): this;
    /**
     * Add OR WHERE EXISTS clause
     *
     * @param callback - Subquery callback or Builder instance
     * @param not - Whether to use NOT EXISTS
     * @returns This builder instance
     */
    orWhereExists(callback: Function | Builder, not?: boolean): this;
    /**
     * Add OR WHERE NOT EXISTS clause
     *
     * @param callback - Subquery callback or Builder instance
     * @returns This builder instance
     */
    orWhereNotExists(callback: Function | Builder): this;
    /**
     * Add WHERE IN condition
     */
    whereIn(column: string, values: any[]): this;
    /**
     * Add WHERE NOT IN condition
     */
    whereNotIn(column: string, values: any[]): this;
    /**
     * Add WHERE BETWEEN condition
     */
    whereBetween(column: string, values: [any, any]): this;
    /**
     * Add WHERE NULL condition
     */
    whereNull(column: string): this;
    /**
     * Add WHERE NOT NULL condition
     */
    whereNotNull(column: string): this;
    /**
     * Add INNER JOIN clause (API Layer)
     *
     * @param table - Table to join
     * @param first - First column name or callback function
     * @param operator - Comparison operator
     * @param second - Second column name
     * @returns JoinBuilder for continued method chaining
     */
    join(table: string, first: string | Function, operator?: string, second?: string): JoinBuilder;
    /**
     * Add LEFT JOIN clause (API Layer)
     *
     * @param table - Table to join
     * @param first - First column name or callback function
     * @param operator - Comparison operator
     * @param second - Second column name
     * @returns JoinBuilder for continued method chaining
     */
    leftJoin(table: string, first: string | Function, operator?: string, second?: string): JoinBuilder;
    /**
     * Add RIGHT JOIN clause (API Layer)
     *
     * @param table - Table to join
     * @param first - First column name or callback function
     * @param operator - Comparison operator
     * @param second - Second column name
     * @returns JoinBuilder for continued method chaining
     */
    rightJoin(table: string, first: string | Function, operator?: string, second?: string): JoinBuilder;
    /**
     * Add FULL JOIN clause (API Layer)
     *
     * @param table - Table to join
     * @param first - First column name
     * @param operator - Comparison operator
     * @param second - Second column name
     * @returns JoinBuilder for continued method chaining
     */
    fullJoin(table: string, first: string, operator?: string, second?: string): JoinBuilder;
    /**
     * Add CROSS JOIN clause (API Layer)
     *
     * @param table - Table to join
     * @returns JoinBuilder for continued method chaining
     */
    crossJoin(table: string): JoinBuilder;
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
    joinWhere(table: string, first: string, operator?: string, second?: string, type?: 'inner' | 'left' | 'right' | 'full' | 'cross'): JoinBuilder;
    /**
     * Add JOIN clause helper - unified method for all JOIN types
     */
    addJoin(type: string, table: string | any, first?: string, operator?: string, second?: string, options?: {
        isWhere?: boolean;
        isSubquery?: boolean;
    }): this;
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
    joinSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string, type?: string, isWhere?: boolean): JoinBuilder;
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
    leftJoinSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
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
    rightJoinSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
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
    joinWhereSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string, type?: string): JoinBuilder;
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
    leftJoinWhereSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
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
    rightJoinWhereSub(table: Function | Builder, as: string, first: string, operator?: string, second?: string): JoinBuilder;
    /**
     * Add ORDER BY clause
     */
    orderBy(column: string, direction?: 'asc' | 'desc'): this;
    /**
     * Add ORDER BY subquery clause
     */
    orderBySub(query: Function | Builder, direction?: 'asc' | 'desc'): this;
    /**
     * Add GROUP BY clause
     */
    groupBy(...columns: string[]): this;
    /**
     * Add GROUP BY subquery clause
     */
    groupBySub(query: Function | Builder): this;
    /**
     * Add HAVING clause
     */
    having(column: string, operator?: any, value?: any): this;
    /**
     * Add LIMIT clause
     */
    limit(count: number): this;
    /**
     * Add OFFSET clause
     */
    offset(count: number): this;
    /**
     * Execute query and get all results
     */
    get(): Promise<any[]>;
    /**
     * Get first result
     */
    first(): Promise<any>;
    /**
     * Find record by ID
     */
    find(id: any): Promise<any>;
    /**
     * Get count
     */
    count(column?: string): Promise<number>;
    /**
     * Get sum
     */
    sum(column: string): Promise<number>;
    /**
     * Get average
     */
    avg(column: string): Promise<number>;
    /**
     * Get maximum value
     */
    max(column: string): Promise<any>;
    /**
     * Get minimum value
     */
    min(column: string): Promise<any>;
    /**
     * Execute aggregate function
     */
    private aggregate;
    /**
     * Insert records
     */
    insert(data: object | object[]): Promise<any>;
    /**
     * Insert records using subquery (INSERT INTO ... SELECT ...)
     */
    insertSub(columns: string[], query: Function | Builder): Promise<any>;
    /**
     * Update records
     */
    update(data: object): Promise<number>;
    /**
     * Delete records
     */
    delete(): Promise<number>;
    /**
     * Update records with JOIN (MySQL specific)
     */
    updateWithJoin(data: object): Promise<number>;
    /**
     * Delete records with JOIN (MySQL specific)
     */
    deleteWithJoin(): Promise<number>;
    /**
     * Create raw SQL expression
     */
    /**
     * Create CASE expression
     */
    case(column?: string): CaseBuilder;
    /**
     * Get query bindings
     */
    getBindings(): any[];
    /**
     * Get insert bindings
     */
    private getInsertBindings;
    /**
     * Get update bindings
     */
    private getUpdateBindings;
    /**
     * Flatten nested bindings array
     */
    private flattenBindings;
    /**
     * Convert query to SQL
     */
    toSql(): string;
    /**
     * Start transaction
     */
    transaction(): Promise<Builder>;
    /**
     * Commit transaction
     */
    commit(): Promise<void>;
    /**
     * Rollback transaction
     */
    rollback(): Promise<void>;
    /**
     * Set table name (alias for from)
     */
    table(name: string, alias?: string): this;
    /**
     * Create new Query Builder instance
     */
    newQuery(): Builder;
    /**
     * Get query component value
     */
    getQuery(key: string, defaultValue?: any): any;
    /**
     * Add query component
     */
    addQuery(component: string, query: any, bindings?: any[]): this;
    /**
     * Add binding values
     */
    addBinding(bindings: any[], type?: string): this;
    /**
     * Add query with bindings
     */
    addQueryBindings(query: any, bindings: any[] | undefined, type: string): this;
    /**
     * Check if operator is invalid
     */
    invalidOperator(operator: string): boolean;
    /**
     * Prepare value and operator for where conditions
     */
    prepareValueAndOperator(value: any, operator: string, useDefault?: boolean): [any, string];
    /**
     * Prepare callback and operator for subquery conditions
     */
    prepareSubQueryArgs(operator: string, callback: Function | Builder, useDefault?: boolean): [Function | Builder, string];
    /**
     * Copy current Builder state to another Builder instance
     *
     * @param target - Target Builder instance to copy state to
     * @private
     */
    private copyStateTo;
    /**
     * Get JoinBuilder class from registry
     * @private
     */
    private _getJoinBuilderClass;
    /**
     * Wrap column name with backticks
     */
    contactBacktick(column: string | any): string;
    /**
     * Check if value is raw SQL
     */
    isRaw(value: any): boolean;
    /**
     * Create a raw query expression
     */
    raw(value: string, bindings?: any[]): RawExpression;
    /**
     * Add raw WHERE clause
     */
    whereRaw(sql: string, bindings?: any[], andOr?: string): this;
    /**
     * Add raw WHERE clause with OR
     */
    orWhereRaw(sql: string, bindings?: any[]): this;
    /**
     * Create subquery from callback or builder
     * Core helper for all sub-query functionality
     *
     * @param callback - Function callback or Builder instance
     * @returns [sql, bindings] tuple
     */
    createSub(callback: Function | Builder): [string, any[]];
    /**
     * Format subquery with optional alias
     *
     * @param query - SQL query string
     * @param as - Optional alias
     * @returns Formatted subquery string
     */
    subQueryAsContactBacktick(query: string, as?: string): string;
    /**
     * Format query with optional alias (enhanced from historical implementation)
     *
     * @param query - Query string
     * @param as - Optional alias
     * @returns Formatted query string
     */
    queryAsContactBacktick(query: string, as?: string): string;
}
export default Builder;
//# sourceMappingURL=Builder.d.ts.map