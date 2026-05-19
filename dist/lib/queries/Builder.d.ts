/**
 * Builder - Query Builder class with fluent interface
 *
 * Complete implementation based on PHP Builder functionality
 * Provides chainable methods for building SQL queries
 */
interface RawExpression {
    type: 'raw';
    raw: true;
    value: string;
    bindings: any[];
}
export interface QueryBuilder {
    select(...columns: string[]): this;
    from(table: string, alias?: string): this;
    where(column: string | Function, operator?: any, value?: any): this;
    orWhere(column: string | Function, operator?: any, value?: any): this;
    whereIn(column: string, values: any[]): this;
    whereNotIn(column: string, values: any[]): this;
    whereBetween(column: string, values: [any, any]): this;
    whereNull(column: string): this;
    whereNotNull(column: string): this;
    join(table: string, first: string, operator?: string, second?: string): this;
    leftJoin(table: string, first: string, operator?: string, second?: string): this;
    rightJoin(table: string, first: string, operator?: string, second?: string): this;
    crossJoin(table: string): this;
    orderBy(column: string, direction?: 'asc' | 'desc'): this;
    groupBy(...columns: string[]): this;
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
    update(data: object): Promise<number>;
    delete(): Promise<number>;
    raw(sql: string, bindings?: any[]): RawExpression;
    case(column?: string): CaseBuilder;
}
export interface CaseBuilder {
    when(condition: any, value: any): this;
    else(value: any): this;
    end(alias?: string): RawExpression;
}
export default class Builder implements QueryBuilder {
    private connection;
    private grammar;
    private processor;
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
     * Set FROM table
     */
    from(table: string, alias?: string): this;
    /**
     * Add WHERE condition
     */
    where(column: string | Function, operator?: any, value?: any): this;
    /**
     * Add OR WHERE condition
     */
    orWhere(column: string | Function, operator?: any, value?: any): this;
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
     * Add INNER JOIN
     */
    join(table: string, first: string, operator?: string, second?: string): this;
    /**
     * Add LEFT JOIN
     */
    leftJoin(table: string, first: string, operator?: string, second?: string): this;
    /**
     * Add RIGHT JOIN
     */
    rightJoin(table: string, first: string, operator?: string, second?: string): this;
    /**
     * Add CROSS JOIN
     */
    crossJoin(table: string): this;
    /**
     * Add JOIN clause helper
     */
    private addJoin;
    /**
     * Add ORDER BY clause
     */
    orderBy(column: string, direction?: 'asc' | 'desc'): this;
    /**
     * Add GROUP BY clause
     */
    groupBy(...columns: string[]): this;
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
     * Update records
     */
    update(data: object): Promise<number>;
    /**
     * Delete records
     */
    delete(): Promise<number>;
    /**
     * Create raw SQL expression
     */
    raw(sql: string, bindings?: any[]): RawExpression;
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
}
export {};
//# sourceMappingURL=Builder.d.ts.map