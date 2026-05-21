/**
 * JoinBuilder - Business Logic Layer for JOIN operations
 *
 * Inherits Builder state and provides JOIN-specific processing
 * Part of three-layer architecture: Builder (API) -> JoinBuilder (Business) -> Grammar (SQL)
 */
import { Builder } from './Builder.js';
class JoinBuilder extends Builder {
    conditions = [];
    joinType = 'inner';
    joinTable;
    isSubquery = false;
    subqueryCallback;
    constructor(connection, table, type = 'inner') {
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
    processJoin(table, first, operator, second, type) {
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
    processSubqueryJoin(table, first, operator, second, type, isWhere = false) {
        // Validate basic parameters
        if (!table) {
            throw new Error('Subquery table reference is required');
        }
        // Add join with subquery metadata
        this.addJoin(type, table, first, operator, second, {
            isWhere,
            isSubquery: true
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
    handleCallbackJoin(table, callback, type) {
        // Set up for a JOIN with this table and type
        this.joinType = type;
        this.joinTable = table;
        // Create a join handler that mimics the expected interface
        const joinHandler = {
            on: (first, operator = '=', second) => {
                // Handle 2-parameter calls
                if (arguments.length === 2 && typeof operator === 'string' && second === undefined) {
                    second = operator;
                    operator = '=';
                }
                this.conditions.push({
                    type: 'basic',
                    first: first,
                    operator: operator,
                    second: second || first
                });
                return joinHandler;
            },
            orOn: (first, operator = '=', second) => {
                // Handle 2-parameter calls
                if (arguments.length === 2 && typeof operator === 'string' && second === undefined) {
                    second = operator;
                    operator = '=';
                }
                this.conditions.push({
                    type: 'basic',
                    first: first,
                    operator: operator,
                    second: second || first,
                    boolean: 'or'
                });
                return joinHandler;
            }
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
    validateJoinParameters(table, first, operator, second) {
        if (!table && !this.joinTable) {
            throw new Error('Join table is required');
        }
        if (first && !operator) {
            throw new Error('Operator is required when first column is specified');
        }
        if (first && operator && !second) {
            throw new Error('Second column is required for join condition');
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
    on(first, operator = '=', second) {
        // Handle 2-parameter calls: on(first, second) with default '=' operator
        if (arguments.length === 2 && typeof operator === 'string' && second === undefined) {
            second = operator;
            operator = '=';
        }
        if (typeof first === 'function') {
            // Handle callback for complex conditions
            const subBuilder = new JoinBuilder(this.connection);
            first(subBuilder);
            // Extract WHERE conditions from subBuilder and convert to ON conditions
            const wheres = subBuilder.components?.wheres || [];
            wheres.forEach((where) => {
                this.conditions.push({
                    type: 'complex',
                    condition: where
                });
            });
        }
        else {
            // Simple condition
            this.conditions.push({
                type: 'basic',
                first: first,
                operator: operator,
                second: second || first,
                boolean: 'and'
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
    orOn(first, operator = '=', second) {
        // Handle 2-parameter calls: orOn(first, second) with default '=' operator
        if (arguments.length === 2 && typeof operator === 'string' && second === undefined) {
            second = operator;
            operator = '=';
        }
        // Add OR condition instead of AND
        this.conditions.push({
            type: 'basic',
            first: first,
            operator: operator,
            second: second || first,
            boolean: 'or'
        });
        return this;
    }
    /**
     * Set this as a subquery join
     *
     * @param callback - Subquery building callback
     * @returns JoinBuilder for method chaining
     */
    subquery(callback) {
        this.isSubquery = true;
        this.subqueryCallback = callback;
        return this;
    }
    /**
     * Complete the join and return the main builder
     *
     * @returns Builder instance for continued method chaining
     */
    build() {
        return this.finalize();
    }
    /**
     * Finalize the join and add it to the main builder
     *
     * @returns JoinBuilder instance for continued method chaining
     * @private
     */
    finalize() {
        const table = this.resolveTable();
        const { conditionSql, bindings } = this.buildConditionsAndBindings();
        if (bindings.length > 0) {
            this.addBinding(bindings, 'joins');
        }
        this.addJoinToBuilder(table, conditionSql);
        return this;
    }
    /**
     * Resolve table reference (handle raw tables and subqueries)
     * @private
     */
    resolveTable() {
        let table = this.joinTable || '';
        // Handle raw table objects (from joinSub)
        if (this.joinTable && typeof this.joinTable === 'object' && this.joinTable.raw === true) {
            table = this.joinTable.value;
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
    buildConditionsAndBindings() {
        const bindings = [];
        let conditionSql = '';
        if (this.conditions.length === 0) {
            return { conditionSql, bindings };
        }
        const conditionParts = [];
        this.conditions.forEach((condition, index) => {
            if (condition.type === 'basic') {
                const first = this.contactBacktick(condition.first || '');
                const second = this.contactBacktick(condition.second || '');
                const part = `${first} ${condition.operator} ${second}`;
                // Add OR/AND connector for subsequent conditions
                if (index > 0 && condition.boolean === 'or') {
                    conditionParts.push(`OR ${part}`);
                }
                else if (index > 0) {
                    conditionParts.push(`AND ${part}`);
                }
                else {
                    conditionParts.push(part);
                }
            }
            else if (condition.type === 'complex') {
                // Handle complex conditions from callbacks
                const whereCondition = condition.condition;
                if (whereCondition.column && whereCondition.operator && whereCondition.value !== undefined) {
                    const col = this.contactBacktick(whereCondition.column);
                    const part = `${col} ${whereCondition.operator} ?`;
                    if (index > 0 && condition.boolean === 'or') {
                        conditionParts.push(`OR ${part}`);
                    }
                    else if (index > 0) {
                        conditionParts.push(`AND ${part}`);
                    }
                    else {
                        conditionParts.push(part);
                    }
                    bindings.push(whereCondition.value);
                }
            }
        });
        conditionSql = conditionParts.join(' ');
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
    addJoinToBuilder(table, conditionSql) {
        const firstCondition = this.conditions[0];
        if (firstCondition && firstCondition.type === 'basic') {
            // Use proper condition for simple joins
            this.addJoin(this.joinType || 'inner', table, firstCondition.first, firstCondition.operator, firstCondition.second);
        }
        else if (conditionSql) {
            // Use complex condition SQL for advanced joins
            this.addJoin(this.joinType || 'inner', table, 'COMPLEX_CONDITIONS', '=', conditionSql);
        }
        else {
            // Fallback for joins without conditions (like CROSS JOIN)
            this.addJoin(this.joinType || 'inner', table);
        }
    }
    /**
     * Create a LEFT JOIN builder
     */
    static left(connection, table) {
        return new JoinBuilder(connection, table, 'left');
    }
    /**
     * Create a RIGHT JOIN builder
     */
    static right(connection, table) {
        return new JoinBuilder(connection, table, 'right');
    }
    /**
     * Create an INNER JOIN builder
     */
    static inner(connection, table) {
        return new JoinBuilder(connection, table, 'inner');
    }
    /**
     * Create a FULL JOIN builder
     */
    static full(connection, table) {
        return new JoinBuilder(connection, table, 'full');
    }
    /**
     * Override method return types to maintain fluent interface
     * These methods ensure that after a JOIN operation, all subsequent Builder methods
     * continue to return JoinBuilder for proper type chaining.
     */
    where(column, operator, value) {
        super.where(column, operator, value);
        return this;
    }
    select(...columns) {
        super.select(...columns);
        return this;
    }
    orderBy(column, direction) {
        super.orderBy(column, direction);
        return this;
    }
    limit(count) {
        super.limit(count);
        return this;
    }
    groupBy(...columns) {
        super.groupBy(...columns);
        return this;
    }
    having(column, operator, value) {
        super.having(column, operator, value);
        return this;
    }
    offset(count) {
        super.offset(count);
        return this;
    }
    orWhere(column, operator, value) {
        super.orWhere(column, operator, value);
        return this;
    }
}
// Register JoinBuilder globally for spec-compliant delegation
if (typeof globalThis !== 'undefined') {
    globalThis.JoinBuilderClass = JoinBuilder;
}
export default JoinBuilder;
//# sourceMappingURL=JoinBuilder.js.map