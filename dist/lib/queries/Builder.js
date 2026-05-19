/**
 * Builder - Query Builder class with fluent interface
 *
 * Complete implementation based on PHP Builder functionality
 * Provides chainable methods for building SQL queries
 */
export default class Builder {
    connection;
    grammar;
    processor;
    queries;
    methods;
    operators;
    _isTransaction = false;
    components;
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
    setConnection(connection) {
        this.connection = connection;
        return this;
    }
    /**
     * Set the grammar instance
     */
    setGrammar(grammar) {
        this.grammar = grammar;
        return this;
    }
    /**
     * Set the processor instance
     */
    setProcessor(processor) {
        this.processor = processor;
        return this;
    }
    /**
     * Add columns to SELECT clause
     */
    select(...columns) {
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
    from(table, alias) {
        const tableExpression = alias ? `${table} as ${alias}` : table;
        this.queries.froms.queries.push(tableExpression);
        return this;
    }
    /**
     * Add WHERE condition
     */
    where(column, operator, value) {
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
    orWhere(column, operator, value) {
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
    whereIn(column, values) {
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
    whereNotIn(column, values) {
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
    whereBetween(column, values) {
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
    whereNull(column) {
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
    whereNotNull(column) {
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
    join(table, first, operator = '=', second) {
        return this.addJoin('inner', table, first, operator, second);
    }
    /**
     * Add LEFT JOIN
     */
    leftJoin(table, first, operator = '=', second) {
        return this.addJoin('left', table, first, operator, second);
    }
    /**
     * Add RIGHT JOIN
     */
    rightJoin(table, first, operator = '=', second) {
        return this.addJoin('right', table, first, operator, second);
    }
    /**
     * Add CROSS JOIN
     */
    crossJoin(table) {
        this.queries.joins.queries.push({
            type: 'cross',
            table: table
        });
        return this;
    }
    /**
     * Add JOIN clause helper
     */
    addJoin(type, table, first, operator, second) {
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
    orderBy(column, direction = 'asc') {
        this.queries.orders.queries.push({
            column,
            direction: direction.toLowerCase()
        });
        return this;
    }
    /**
     * Add GROUP BY clause
     */
    groupBy(...columns) {
        for (const column of columns) {
            this.queries.groups.queries.push(column);
        }
        return this;
    }
    /**
     * Add HAVING clause
     */
    having(column, operator = '=', value) {
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
    limit(count) {
        this.queries.limits.queries.push(count);
        return this;
    }
    /**
     * Add OFFSET clause
     */
    offset(count) {
        this.queries.offset.queries.push(count);
        return this;
    }
    /**
     * Execute query and get all results
     */
    async get() {
        const sql = this.toSql();
        const bindings = this.getBindings();
        const results = await this.connection.query(sql, bindings);
        return this.processor.processSelectResults(results);
    }
    /**
     * Get first result
     */
    async first() {
        this.limit(1);
        const results = await this.get();
        return results.length > 0 ? results[0] : null;
    }
    /**
     * Find record by ID
     */
    async find(id) {
        return this.where('id', id).first();
    }
    /**
     * Get count
     */
    async count(column = '*') {
        const result = await this.aggregate('count', column);
        return parseInt(result) || 0;
    }
    /**
     * Get sum
     */
    async sum(column) {
        const result = await this.aggregate('sum', column);
        return parseFloat(result) || 0;
    }
    /**
     * Get average
     */
    async avg(column) {
        const result = await this.aggregate('avg', column);
        return parseFloat(result) || 0;
    }
    /**
     * Get maximum value
     */
    async max(column) {
        return await this.aggregate('max', column);
    }
    /**
     * Get minimum value
     */
    async min(column) {
        return await this.aggregate('min', column);
    }
    /**
     * Execute aggregate function
     */
    async aggregate(func, column) {
        const originalColumns = this.queries.columns.queries;
        this.queries.columns.queries = [`${func}(${column}) as aggregate`];
        const results = await this.get();
        this.queries.columns.queries = originalColumns;
        return results.length > 0 ? results[0].aggregate : null;
    }
    /**
     * Insert records
     */
    async insert(data) {
        const insertData = Array.isArray(data) ? data : [data];
        this.queries.insert.queries = insertData;
        const sql = this.grammar.compileInsert(this, insertData);
        const bindings = this.getInsertBindings(insertData);
        return await this.connection.query(sql, bindings);
    }
    /**
     * Update records
     */
    async update(data) {
        this.queries.update.queries.push(data);
        const sql = this.grammar.compileUpdate(this, data);
        const bindings = this.getUpdateBindings(data);
        const result = await this.connection.query(sql, bindings);
        return result.affectedRows || result.changes || 0;
    }
    /**
     * Delete records
     */
    async delete() {
        const sql = this.grammar.compileDelete(this);
        const bindings = this.getBindings();
        const result = await this.connection.query(sql, bindings);
        return result.affectedRows || result.changes || 0;
    }
    /**
     * Create raw SQL expression
     */
    raw(sql, bindings = []) {
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
    case(column) {
        return new CaseBuilderImpl(column);
    }
    /**
     * Get query bindings
     */
    getBindings() {
        return [
            ...this.queries.wheres.bindings,
            ...this.queries.havings.bindings,
            ...this.queries.joins.bindings,
        ];
    }
    /**
     * Get insert bindings
     */
    getInsertBindings(data) {
        const bindings = [];
        for (const record of data) {
            bindings.push(...Object.values(record));
        }
        return bindings;
    }
    /**
     * Get update bindings
     */
    getUpdateBindings(data) {
        const bindings = Object.values(data);
        bindings.push(...this.getBindings());
        return bindings;
    }
    /**
     * Convert query to SQL
     */
    toSql() {
        if (!this.grammar) {
            throw new Error('Grammar not set');
        }
        return this.grammar.compileSelect(this);
    }
    /**
     * Start transaction
     */
    async transaction() {
        await this.connection.beginTransaction();
        const transactionBuilder = new Builder(this.connection, this.grammar, this.processor);
        transactionBuilder._isTransaction = true;
        return transactionBuilder;
    }
    /**
     * Commit transaction
     */
    async commit() {
        await this.connection.commit();
    }
    /**
     * Rollback transaction
     */
    async rollback() {
        await this.connection.rollback();
    }
    /**
     * Set table name (alias for from)
     */
    table(name, alias) {
        return this.from(name, alias);
    }
}
// Case builder implementation
class CaseBuilderImpl {
    conditions = [];
    elseValue;
    column;
    constructor(column) {
        this.column = column;
    }
    when(condition, value) {
        this.conditions.push({ when: condition, then: value });
        return this;
    }
    else(value) {
        this.elseValue = value;
        return this;
    }
    end(alias) {
        let sql = 'CASE';
        const bindings = [];
        if (this.column) {
            sql += ` ${this.column}`;
        }
        for (const condition of this.conditions) {
            if (this.column) {
                sql += ` WHEN ? THEN ?`;
                bindings.push(condition.when, condition.then);
            }
            else {
                if (typeof condition.when === 'function') {
                    // Handle subquery conditions
                    const subBuilder = new Builder(null);
                    condition.when(subBuilder);
                    sql += ` WHEN (${subBuilder.toSql()}) THEN ?`;
                    bindings.push(...subBuilder.getBindings(), condition.then);
                }
                else {
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
//# sourceMappingURL=Builder.js.map