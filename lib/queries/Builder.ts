/**
 * Builder - Query Builder class with fluent interface
 *
 * Complete implementation based on PHP Builder functionality
 * Provides chainable methods for building SQL queries
 */

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
    boolean?: 'and' | 'or';
    type?: string;
}

// Join interface
interface JoinClause {
    table: string;
    alias?: string;
    type: 'inner' | 'left' | 'right' | 'cross' | 'full' | 'natural';
    conditions: Array<{
        first: string;
        operator: string;
        second: string;
        boolean: 'and' | 'or';
    }>;
}

// Order by interface
interface OrderBy {
    column: string;
    direction: 'asc' | 'desc';
}

// Raw SQL interface
interface RawExpression {
    type: 'raw';
    raw: true;
    value: string;
    bindings: any[];
}

// Case statement interface
interface CaseStatement {
    type: 'case';
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

// Case builder interface
export interface CaseBuilder {
    when(condition: any, value: any): this;
    else(value: any): this;
    end(alias?: string): RawExpression;
}

export default class Builder implements QueryBuilder {
    private connection: any;
    private grammar: any;
    private processor: any;
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
            offset: []
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
            "=", "<", ">", "<=", ">=", "<>", "!=",
            "<=>", "like", "like binary", "not like", "ilike",
            "&", "|", "^", "<<", ">>", "rlike", "not rlike",
            "regexp", "not regexp", "~", "~*", "!~", "!~*",
            "similar to", "not similar to", "not ilike", "~~*", "!~~*"
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
            columns = ['*'];
        }

        for (const column of columns) {
            this.queries.columns.queries.push(column);
        }

        return this;
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
     * Add WHERE condition
     */
    where(column: string | Function, operator?: any, value?: any): this {
        // Handle callback for subqueries
        if (typeof column === 'function') {
            const subBuilder = new Builder(this.connection, this.grammar, this.processor);
            column(subBuilder);
            this.queries.wheres.queries.push({
                type: 'nested',
                query: subBuilder,
                boolean: 'and'
            });
            this.queries.wheres.bindings.push(...subBuilder.getBindings());
            return this;
        }

        // Handle two-parameter calls (column, value)
        if (arguments.length === 2) {
            value = operator;
            operator = '=';
        }

        this.queries.wheres.queries.push({
            column,
            operator,
            value,
            boolean: 'and',
            type: 'basic'
        });

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
        if (typeof column === 'function') {
            const subBuilder = new Builder(this.connection, this.grammar, this.processor);
            column(subBuilder);
            this.queries.wheres.queries.push({
                type: 'nested',
                query: subBuilder,
                boolean: 'or'
            });
            this.queries.wheres.bindings.push(...subBuilder.getBindings());
            return this;
        }

        if (arguments.length === 2) {
            value = operator;
            operator = '=';
        }

        this.queries.wheres.queries.push({
            column,
            operator,
            value,
            boolean: 'or',
            type: 'basic'
        });

        if (value !== undefined && value !== null) {
            this.queries.wheres.bindings.push(value);
        }

        return this;
    }

    /**
     * Add WHERE IN condition
     */
    whereIn(column: string, values: any[]): this {
        this.queries.wheres.queries.push({
            column,
            values,
            boolean: 'and',
            type: 'in'
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
            boolean: 'and',
            type: 'not_in'
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
            boolean: 'and',
            type: 'between'
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
            boolean: 'and',
            type: 'null'
        });

        return this;
    }

    /**
     * Add WHERE NOT NULL condition
     */
    whereNotNull(column: string): this {
        this.queries.wheres.queries.push({
            column,
            boolean: 'and',
            type: 'not_null'
        });

        return this;
    }

    /**
     * Add INNER JOIN
     */
    join(table: string, first: string, operator: string = '=', second?: string): this {
        return this.addJoin('inner', table, first, operator, second);
    }

    /**
     * Add LEFT JOIN
     */
    leftJoin(table: string, first: string, operator: string = '=', second?: string): this {
        return this.addJoin('left', table, first, operator, second);
    }

    /**
     * Add RIGHT JOIN
     */
    rightJoin(table: string, first: string, operator: string = '=', second?: string): this {
        return this.addJoin('right', table, first, operator, second);
    }

    /**
     * Add CROSS JOIN
     */
    crossJoin(table: string): this {
        this.queries.joins.queries.push({
            type: 'cross',
            table: table
        });

        return this;
    }

    /**
     * Add JOIN clause helper
     */
    private addJoin(type: string, table: string, first: string, operator: string, second?: string): this {
        this.queries.joins.queries.push({
            type,
            table,
            first,
            operator,
            second: second || first
        });

        return this;
    }

    /**
     * Add ORDER BY clause
     */
    orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
        this.queries.orders.queries.push({
            column,
            direction: direction.toLowerCase()
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
     * Add HAVING clause
     */
    having(column: string, operator: any = '=', value?: any): this {
        if (arguments.length === 2) {
            value = operator;
            operator = '=';
        }

        this.queries.havings.queries.push({
            column,
            operator,
            value,
            boolean: 'and'
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
        return this.where('id', id).first();
    }

    /**
     * Get count
     */
    async count(column: string = '*'): Promise<number> {
        const result = await this.aggregate('count', column);
        return parseInt(result) || 0;
    }

    /**
     * Get sum
     */
    async sum(column: string): Promise<number> {
        const result = await this.aggregate('sum', column);
        return parseFloat(result) || 0;
    }

    /**
     * Get average
     */
    async avg(column: string): Promise<number> {
        const result = await this.aggregate('avg', column);
        return parseFloat(result) || 0;
    }

    /**
     * Get maximum value
     */
    async max(column: string): Promise<any> {
        return await this.aggregate('max', column);
    }

    /**
     * Get minimum value
     */
    async min(column: string): Promise<any> {
        return await this.aggregate('min', column);
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
     * Create raw SQL expression
     */
    raw(sql: string, bindings: any[] = []): RawExpression {
        return {
            type: 'raw',
            raw: true,
            value: sql,
            bindings
        };
    }

    /**
     * Create CASE expression
     */
    case(column?: string): CaseBuilder {
        return new CaseBuilderImpl(column);
    }

    /**
     * Get query bindings
     */
    getBindings(): any[] {
        return [
            ...this.queries.wheres.bindings,
            ...this.queries.havings.bindings,
            ...this.queries.joins.bindings,
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
        const bindings = Object.values(data);
        bindings.push(...this.getBindings());
        return bindings;
    }

    /**
     * Convert query to SQL
     */
    toSql(): string {
        if (!this.grammar) {
            throw new Error('Grammar not set');
        }
        return this.grammar.compileSelect(this);
    }

    /**
     * Start transaction
     */
    async transaction(): Promise<Builder> {
        await this.connection.beginTransaction();
        const transactionBuilder = new Builder(this.connection, this.grammar, this.processor);
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
}

// Case builder implementation
class CaseBuilderImpl implements CaseBuilder {
    private conditions: Array<{ when: any; then: any; bindings?: any[] }> = [];
    private elseValue?: any;
    private column?: string;

    constructor(column?: string) {
        this.column = column;
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
        let sql = 'CASE';
        const bindings: any[] = [];

        if (this.column) {
            sql += ` ${this.column}`;
        }

        for (const condition of this.conditions) {
            if (this.column) {
                sql += ` WHEN ? THEN ?`;
                bindings.push(condition.when, condition.then);
            } else {
                if (typeof condition.when === 'function') {
                    // Handle subquery conditions
                    const subBuilder = new Builder(null);
                    condition.when(subBuilder);
                    sql += ` WHEN (${subBuilder.toSql()}) THEN ?`;
                    bindings.push(...subBuilder.getBindings(), condition.then);
                } else {
                    sql += ` WHEN ${condition.when} THEN ?`;
                    bindings.push(condition.then);
                }
            }
        }

        if (this.elseValue !== undefined) {
            sql += ` ELSE ?`;
            bindings.push(this.elseValue);
        }

        sql += ' END';

        if (alias) {
            sql += ` as ${alias}`;
        }

        return {
            type: 'raw',
            raw: true,
            value: sql,
            bindings
        };
    }
}