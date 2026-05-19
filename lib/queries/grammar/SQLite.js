/**
 * SQLite Grammar - SQLite-specific SQL compilation
 */

import Grammar from './Grammar.js';

export default class SQLiteGrammar extends Grammar {
    /**
     * Wrap a value with SQLite square brackets (preferred for SQLite)
     *
     * @param {string} value - Value to wrap
     * @returns {string} Wrapped value with square brackets
     */
    wrapValue(value) {
        if (value === '*') return value;
        return `[${value}]`;
    }

    /**
     * Compile INSERT with REPLACE (SQLite-specific)
     *
     * @param {Builder} query - Query builder instance
     * @param {Object|Array} data - Data to insert
     * @returns {string} Compiled INSERT OR REPLACE SQL
     */
    compileReplace(query, data) {
        const sql = this.compileInsert(query, data);
        return sql.replace('INSERT INTO', 'INSERT OR REPLACE INTO');
    }

    /**
     * Compile INSERT with IGNORE (SQLite-specific)
     *
     * @param {Builder} query - Query builder instance
     * @param {Object|Array} data - Data to insert
     * @returns {string} Compiled INSERT OR IGNORE SQL
     */
    compileInsertIgnore(query, data) {
        const sql = this.compileInsert(query, data);
        return sql.replace('INSERT INTO', 'INSERT OR IGNORE INTO');
    }

    /**
     * Compile UPSERT using INSERT OR REPLACE
     *
     * @param {Builder} query - Query builder instance
     * @param {Object|Array} data - Data to insert
     * @returns {string} Compiled UPSERT SQL
     */
    compileUpsert(query, data) {
        return this.compileReplace(query, data);
    }

    /**
     * Compile a SELECT with random ordering (SQLite-specific)
     *
     * @param {Builder} query - Query builder instance
     * @returns {string} Compiled SELECT with RANDOM() order
     */
    compileRandomOrder(query) {
        // Clone the query to avoid modifying the original
        const randomQuery = {
            ...query,
            components: {
                ...query.components,
                orders: [...query.components.orders, { column: 'RANDOM()', direction: 'asc' }]
            }
        };

        return this.compileSelect(randomQuery);
    }

    /**
     * Compile DATE and TIME functions for SQLite
     *
     * @param {string} func - Date function (date, time, datetime, strftime)
     * @param {string} column - Column name
     * @param {string} format - Format string (for strftime)
     * @returns {string} SQLite date function
     */
    dateFunction(func, column, format = null) {
        switch (func.toLowerCase()) {
            case 'date':
                return `DATE(${this.wrapColumn(column)})`;
            case 'time':
                return `TIME(${this.wrapColumn(column)})`;
            case 'datetime':
                return `DATETIME(${this.wrapColumn(column)})`;
            case 'strftime':
                if (!format) {
                    throw new Error('Format is required for strftime function');
                }
                return `STRFTIME('${format}', ${this.wrapColumn(column)})`;
            default:
                throw new Error(`Unknown date function: ${func}`);
        }
    }

    /**
     * Get SQLite-specific date format using strftime
     *
     * @param {string} format - Date format
     * @param {string} column - Column name
     * @returns {string} SQLite strftime function
     */
    dateFormat(format, column) {
        return this.dateFunction('strftime', column, format);
    }

    /**
     * Compile JSON operations for SQLite (SQLite 3.45+)
     *
     * @param {string} column - JSON column name
     * @param {string} path - JSON path
     * @returns {string} SQLite JSON operation
     */
    jsonExtract(column, path) {
        return `JSON_EXTRACT(${this.wrapColumn(column)}, '$.${path}')`;
    }

    /**
     * Compile VACUUM statement for database optimization
     *
     * @returns {string} VACUUM SQL
     */
    compileVacuum() {
        return 'VACUUM';
    }

    /**
     * Compile ANALYZE statement for statistics update
     *
     * @param {string} table - Optional table name
     * @returns {string} ANALYZE SQL
     */
    compileAnalyze(table = null) {
        if (table) {
            return `ANALYZE ${this.wrapTable(table)}`;
        }
        return 'ANALYZE';
    }

    /**
     * Compile ATTACH DATABASE statement
     *
     * @param {string} filename - Database filename
     * @param {string} alias - Database alias
     * @returns {string} ATTACH DATABASE SQL
     */
    compileAttach(filename, alias) {
        return `ATTACH DATABASE '${filename}' AS ${this.wrapValue(alias)}`;
    }

    /**
     * Compile DETACH DATABASE statement
     *
     * @param {string} alias - Database alias
     * @returns {string} DETACH DATABASE SQL
     */
    compileDetach(alias) {
        return `DETACH DATABASE ${this.wrapValue(alias)}`;
    }

    /**
     * Compile PRAGMA statement for SQLite configuration
     *
     * @param {string} pragma - Pragma name
     * @param {string} value - Pragma value (optional)
     * @returns {string} PRAGMA SQL
     */
    compilePragma(pragma, value = null) {
        if (value !== null) {
            return `PRAGMA ${pragma} = ${value}`;
        }
        return `PRAGMA ${pragma}`;
    }

    /**
     * SQLite doesn't support some advanced JOIN types
     * Override to handle limitations
     *
     * @param {Builder} query - Query builder instance
     * @param {Array} joins - Joins array
     * @returns {string} Compiled JOIN clauses
     */
    compileJoins(query, joins) {
        if (joins.length === 0) return '';

        return joins.map(join => {
            let type = join.type.toUpperCase();

            // SQLite doesn't support RIGHT JOIN, convert to LEFT JOIN
            if (type === 'RIGHT') {
                console.warn('SQLite does not support RIGHT JOIN, consider restructuring your query');
                type = 'LEFT';
            }

            const table = this.wrapTable(join.table);
            const first = this.wrapColumn(join.first);
            const second = this.wrapColumn(join.second);

            return `${type} JOIN ${table} ON ${first} ${join.operator} ${second}`;
        }).join(' ');
    }

    /**
     * Compile LIMIT for SQLite (no OFFSET without LIMIT)
     *
     * @param {Builder} query - Query builder instance
     * @param {number|null} limit - Limit value
     * @returns {string} Compiled LIMIT clause
     */
    compileLimit(query, limit) {
        if (limit === null && query.components.offset === null) return '';

        if (limit === null) {
            // SQLite requires LIMIT when using OFFSET
            let sql = 'LIMIT -1'; // SQLite infinite limit
            if (query.components.offset !== null) {
                sql += ` OFFSET ${query.components.offset}`;
            }
            return sql;
        }

        let sql = `LIMIT ${limit}`;

        if (query.components.offset !== null) {
            sql += ` OFFSET ${query.components.offset}`;
        }

        return sql;
    }

    /**
     * Compile OFFSET for SQLite (handled by compileLimit)
     *
     * @param {Builder} query - Query builder instance
     * @param {number|null} offset - Offset value
     * @returns {string} Empty string (handled by compileLimit)
     */
    compileOffset(query, offset) {
        // SQLite OFFSET is handled in compileLimit
        return '';
    }

    /**
     * Compile a TRUNCATE statement for SQLite (using DELETE)
     *
     * SQLite doesn't support TRUNCATE TABLE, so we use DELETE FROM
     * followed by vacuum/reindex to reset auto-increment
     *
     * @param {Builder} query - Query builder instance
     * @returns {string} Compiled DELETE SQL (SQLite doesn't have TRUNCATE)
     */
    compileTruncate(query) {
        const table = this.wrapTable(this.getFrom(query));
        // SQLite doesn't have TRUNCATE, use DELETE instead
        // Note: Auto-increment reset requires additional VACUUM or DELETE sqlite_sequence
        return `DELETE FROM ${table}`;
    }
}