/**
 * SQLite Grammar - SQLite-specific SQL compilation
 */

import Grammar from "./Grammar.js";

export default class SQLite extends Grammar {
    /**
     * Wrap column/table identifier for SQLite
     */
    protected wrap(value: string | any): string {
        // Handle array case - if it's an array that got passed by mistake
        if (Array.isArray(value)) {
            return value.map(v => this.wrap(v)).join(', ');
        }

        const strValue = String(value);
        if (strValue === '*') return strValue;
        if (strValue.includes('.')) {
            return strValue.split('.').map(part => `[${part}]`).join('.');
        }
        return `[${strValue}]`;
    }

    /**
     * Internal LIMIT compilation - SQLite doesn't support OFFSET without LIMIT
     */
    protected compileLimitInternal(query: any): string {
        let sql = '';

        if (query.queries.limits.queries && query.queries.limits.queries.length > 0) {
            sql = `LIMIT ${query.queries.limits.queries[0]}`;
        } else if (query.queries.offset.queries && query.queries.offset.queries.length > 0) {
            // SQLite requires LIMIT when using OFFSET
            sql = `LIMIT -1`;
        }

        if (query.queries.offset.queries && query.queries.offset.queries.length > 0) {
            sql += ` OFFSET ${query.queries.offset.queries[0]}`;
        }

        return sql;
    }

    /**
     * SQLite doesn't need separate OFFSET compilation
     */
    protected compileOffset(_query: any): string {
        return ''; // Handled in compileLimit
    }

    /**
     * Wrap value with square brackets for SQLite
     */
    wrapValue(value: string): string {
        if (value === '*') return value;
        return `[${value}]`;
    }

    /**
     * Compile PRAGMA statement for SQLite
     */
    compilePragma(pragmaName: string, value?: any): string {
        if (value !== undefined) {
            return `PRAGMA ${pragmaName} = ${value}`;
        }
        return `PRAGMA ${pragmaName}`;
    }

    /**
     * Compile UPSERT (INSERT OR REPLACE) for SQLite
     */
    compileUpsert(builder: any, data: object): string {
        return this.compileReplace(builder, data);
    }

    /**
     * Concatenate strings for SQLite
     */
    concatenate(strings: string[]): string {
        return strings.join(' || ');
    }

    /**
     * Date function for SQLite
     */
    dateFunction(format: string, column: string, sqliteFormat?: string): string {
        if (format === 'strftime') {
            if (!sqliteFormat) {
                throw new Error('Format is required for strftime function');
            }
            return `STRFTIME('${sqliteFormat}', ${this.wrap(column)})`;
        }

        // Map common date functions to SQLite equivalents
        const formatMap: { [key: string]: string } = {
            'date': 'DATE',
            'time': 'TIME',
            'datetime': 'DATETIME'
        };

        const sqliteFunction = formatMap[format.toLowerCase()];
        if (sqliteFunction) {
            return `${sqliteFunction}(${this.wrap(column)})`;
        }

        // Throw error for unknown functions
        throw new Error(`Unknown date function: ${format}`);
    }

    /**
     * Compile INSERT OR REPLACE for SQLite
     */
    compileReplace(builder: any, data: object): string {
        const insertSql = this.compileInsert(builder, [data]);
        return insertSql.replace('INSERT INTO', 'INSERT OR REPLACE INTO');
    }

    /**
     * Compile INSERT OR IGNORE for SQLite
     */
    compileInsertIgnore(builder: any, data: object): string {
        const insertSql = this.compileInsert(builder, [data]);
        return insertSql.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
    }

    /**
     * Compile JOIN clauses for SQLite with RIGHT JOIN handling
     */
    compileJoins(query: any, joins?: any[]): string {
        // If called with explicit joins parameter (test interface)
        if (arguments.length === 2 && Array.isArray(joins)) {
            return joins.map((join: any) => {
                const type = join.type.toUpperCase();

                if (type === 'RIGHT') {
                    console.warn('SQLite does not support RIGHT JOIN, consider restructuring your query');
                    return `LEFT JOIN ${this.wrapTable(join.table)} ON ${this.wrapColumn(join.first)} ${join.operator} ${this.wrapColumn(join.second)}`;
                }

                if (type === 'CROSS') {
                    return `CROSS JOIN ${this.wrapTable(join.table)}`;
                }

                return `${type} JOIN ${this.wrapTable(join.table)} ON ${this.wrapColumn(join.first)} ${join.operator} ${this.wrapColumn(join.second)}`;
            }).join(' ');
        }

        // Otherwise use the parent implementation
        return super.compileJoins(query);
    }

    /**
     * Wrap column identifier (alias for wrap method for test compatibility)
     */
    wrapColumn(column: string): string {
        return this.wrap(column);
    }
}