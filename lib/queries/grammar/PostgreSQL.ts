/**
 * PostgreSQL Grammar - PostgreSQL-specific SQL compilation
 */

import Grammar from "./Grammar.js";

export default class PostgreSQL extends Grammar {
    /**
     * Wrap column/table identifier for PostgreSQL
     */
    protected wrap(value: string | any): string {
        // Handle array case - if it's an array that got passed by mistake
        if (Array.isArray(value)) {
            return value.map(v => this.wrap(v)).join(', ');
        }

        const strValue = String(value || '');
        if (strValue === '*') return strValue;
        if (strValue === '' || strValue === 'undefined' || strValue === 'null') return '';

        if (strValue.includes('.')) {
            return strValue.split('.').map(part => `"${part}"`).join('.');
        }
        return `"${strValue}"`;
    }

    /**
     * Wrap value with double quotes for PostgreSQL
     */
    wrapValue(value: string): string {
        if (value === '*') return value;
        // Escape double quotes by doubling them
        return `"${value.replace(/"/g, '""')}"`;
    }

    /**
     * Compile RETURNING clause for PostgreSQL
     */
    compileReturning(query: any, columns?: string[] | null): string {
        if (!columns || columns.length === 0) {
            return '';
        }

        if (columns.includes('*')) {
            return 'RETURNING *';
        }

        const wrappedColumns = columns.map(col => this.wrap(col));
        return `RETURNING ${wrappedColumns.join(', ')}`;
    }

    /**
     * Compile INSERT with RETURNING for PostgreSQL
     */
    compileInsert(query: any, data: object[]): string {
        const baseSql = super.compileInsert(query, data);
        return `${baseSql} RETURNING id`;
    }

    /**
     * Compile UPDATE with RETURNING for PostgreSQL
     */
    compileUpdate(query: any, data: object): string {
        const baseSql = super.compileUpdate(query, data);
        return `${baseSql} RETURNING id`;
    }

    /**
     * Compile OFFSET - public interface for testing
     */
    compileOffset(query: any, offset?: number): string {
        // If called with explicit offset parameter (test interface)
        if (arguments.length === 2 && offset !== undefined && offset !== null) {
            return `OFFSET ${offset}`;
        }

        // Otherwise use the query structure
        return super.compileOffset(query);
    }

    /**
     * Compile INSERT with RETURNING for PostgreSQL
     */
    compileInsertReturning(query: any, data: object, columns?: string[]): string {
        const baseInsertSql = this.compileInsert(query, [data]);

        if (!columns || columns.length === 0) {
            return baseInsertSql;
        }

        const returningClause = this.compileReturning(query, columns);
        return `${baseInsertSql.replace(' RETURNING id', '')} ${returningClause}`;
    }

    /**
     * Generate JSON extraction expressions for PostgreSQL
     */
    jsonExtract(column: string, path: string, operator: string = '->'): string {
        return `${this.wrap(column)} ${operator} '${path}'`;
    }

    /**
     * Compile WHERE clauses with PostgreSQL parameter placeholders
     */
    protected compileWheres(query: any): string {
        if (!query.queries.wheres.queries || query.queries.wheres.queries.length === 0) {
            return '';
        }

        let parameterIndex = 1;
        const wheres = query.queries.wheres.queries.map((where: any, index: number) => {
            const boolean = index === 0 ? '' : ` ${where.boolean?.toUpperCase() || 'AND'}`;

            switch (where.type) {
                case 'basic':
                    return `${boolean} ${this.wrap(where.column)} ${where.operator} $${parameterIndex++}`;
                case 'in':
                    const placeholders = where.values.map(() => `$${parameterIndex++}`).join(', ');
                    return `${boolean} ${this.wrap(where.column)} IN (${placeholders})`;
                case 'not_in':
                    const notInPlaceholders = where.values.map(() => `$${parameterIndex++}`).join(', ');
                    return `${boolean} ${this.wrap(where.column)} NOT IN (${notInPlaceholders})`;
                case 'between':
                    return `${boolean} ${this.wrap(where.column)} BETWEEN $${parameterIndex++} AND $${parameterIndex++}`;
                case 'null':
                    return `${boolean} ${this.wrap(where.column)} IS NULL`;
                case 'not_null':
                    return `${boolean} ${this.wrap(where.column)} IS NOT NULL`;
                case 'nested':
                    return `${boolean} (${this.compileWheres(where.query)})`;
                default:
                    return '';
            }
        }).filter(Boolean);

        return wheres.length > 0 ? `WHERE${wheres.join('')}` : '';
    }
}