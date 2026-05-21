/**
 * MySQL Grammar - MySQL-specific SQL compilation
 */
import Grammar from "./Grammar.js";
export default class MySQL extends Grammar {
    /**
     * Wrap column/table identifier for MySQL
     */
    wrap(value) {
        // Handle array case - if it's an array that got passed by mistake
        if (Array.isArray(value)) {
            return value.map(v => this.wrap(v)).join(', ');
        }
        const strValue = String(value || '');
        if (strValue === '*')
            return strValue;
        if (strValue === '' || strValue === 'undefined' || strValue === 'null')
            return '';
        // Handle column AS alias pattern (e.g., "table.column as alias")
        if (strValue.includes(' as ') || strValue.includes(' AS ')) {
            const asIndex = strValue.toLowerCase().indexOf(' as ');
            const columnPart = strValue.substring(0, asIndex).trim();
            const aliasPart = strValue.substring(asIndex + 4).trim();
            const wrappedColumn = this.wrap(columnPart);
            const wrappedAlias = this.wrap(aliasPart);
            return `${wrappedColumn} AS ${wrappedAlias}`;
        }
        if (strValue.includes('.')) {
            const parts = strValue.split('.');
            if (parts[parts.length - 1] === '*') {
                // For table.*, wrap table name but keep * as is
                const tablePart = parts.slice(0, -1).map(part => `\`${part}\``).join('.');
                return `${tablePart}.*`;
            }
            return parts.map(part => `\`${part}\``).join('.');
        }
        return `\`${strValue}\``;
    }
    /**
     * Wrap value with backticks for MySQL
     */
    wrapValue(value) {
        if (value === '*')
            return value;
        // Escape backticks by doubling them
        return `\`${value.replace(/`/g, '``')}\``;
    }
    /**
     * Wrap column name for MySQL (alias for wrap method)
     */
    wrapColumn(value) {
        return this.wrap(value);
    }
    /**
     * Internal LIMIT compilation with OFFSET for MySQL
     */
    compileLimitInternal(query) {
        let sql = '';
        if (query.queries.limits.queries && query.queries.limits.queries.length > 0) {
            sql = `LIMIT ${query.queries.limits.queries[0]}`;
        }
        else if (query.queries.offset.queries && query.queries.offset.queries.length > 0) {
            // MySQL requires LIMIT when using OFFSET
            sql = 'LIMIT 18446744073709551615';
        }
        if (query.queries.offset.queries && query.queries.offset.queries.length > 0) {
            sql += ` OFFSET ${query.queries.offset.queries[0]}`;
        }
        return sql;
    }
    /**
     * MySQL doesn't need separate OFFSET compilation
     */
    compileOffset(_query) {
        return ''; // Handled in compileLimit
    }
    /**
     * Compile INSERT ON DUPLICATE KEY UPDATE for MySQL
     */
    compileInsertOnDuplicateKeyUpdate(builder, data, updateData) {
        const baseInsertSql = this.compileInsert(builder, [data]);
        if (!updateData || Object.keys(updateData).length === 0) {
            return baseInsertSql;
        }
        const updatePairs = Object.keys(updateData)
            .filter(key => updateData[key])
            .map(key => `${this.wrap(key)} = VALUES(${this.wrap(key)})`)
            .join(', ');
        if (updatePairs) {
            return `${baseInsertSql} ON DUPLICATE KEY UPDATE ${updatePairs}`;
        }
        return baseInsertSql;
    }
    /**
     * Return FOR UPDATE lock string for MySQL
     */
    lockForUpdate() {
        return 'FOR UPDATE';
    }
    /**
     * Return LOCK IN SHARE MODE lock string for MySQL
     */
    sharedLock() {
        return 'LOCK IN SHARE MODE';
    }
    /**
     * Compile INSERT IGNORE statement for MySQL
     */
    compileInsertIgnore(builder, data) {
        const table = this.wrapTable(builder.from || builder.table);
        const columns = Object.keys(data);
        const wrappedColumns = columns.map(col => this.wrap(col));
        const placeholders = columns.map(() => '?');
        return `INSERT IGNORE INTO ${table} (${wrappedColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    }
    /**
     * Compile REPLACE statement for MySQL
     */
    compileReplace(builder, data) {
        const table = this.wrapTable(builder.from || builder.table);
        const columns = Object.keys(data);
        const wrappedColumns = columns.map(col => this.wrap(col));
        const placeholders = columns.map(() => '?');
        return `REPLACE INTO ${table} (${wrappedColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    }
    /**
     * Compile TRUNCATE statement for MySQL
     */
    compileTruncate(builder) {
        const table = this.wrapTable(builder.from || builder.table);
        return `TRUNCATE TABLE ${table}`;
    }
    /**
     * Compile SELECT with LOCK IN SHARE MODE for MySQL
     */
    compileSharedLock(builder) {
        const selectSql = this.compileSelect(builder);
        return `${selectSql} ${this.sharedLock()}`;
    }
    /**
     * Compile SELECT with FOR UPDATE for MySQL
     */
    compileExclusiveLock(builder) {
        const selectSql = this.compileSelect(builder);
        return `${selectSql} ${this.lockForUpdate()}`;
    }
    /**
     * Format date with MySQL DATE_FORMAT function
     */
    dateFormat(format, column) {
        return `DATE_FORMAT(${this.wrap(column)}, '${format}')`;
    }
    /**
     * Compile UPDATE with JOIN for MySQL
     */
    compileUpdateWithJoin(builder, data) {
        const table = this.wrapTable(builder.from || builder.table);
        const updatePairs = Object.keys(data).map(key => {
            const value = data[key];
            return `${table}.${this.wrap(key)} = ?`;
        });
        let sql = `UPDATE ${table}`;
        // Add JOINs if present
        const joins = builder.components?.joins || builder.queries?.joins?.queries || [];
        if (joins.length > 0) {
            for (const join of joins) {
                const joinTable = this.wrapTable(join.table);
                const condition = join.condition || `${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`;
                sql += ` ${join.type.toUpperCase()} JOIN ${joinTable} ON ${condition}`;
            }
        }
        sql += ` SET ${updatePairs.join(', ')}`;
        return sql;
    }
    /**
     * Compile DELETE with JOIN for MySQL
     */
    compileDeleteWithJoin(builder) {
        const table = this.wrapTable(builder.from || builder.table);
        let sql = `DELETE ${table} FROM ${table}`;
        // Add JOINs if present
        const joins = builder.components?.joins || builder.queries?.joins?.queries || [];
        if (joins.length > 0) {
            for (const join of joins) {
                const joinTable = this.wrapTable(join.table);
                const condition = join.condition || `${this.wrap(join.first)} ${join.operator} ${this.wrap(join.second)}`;
                sql += ` ${join.type.toUpperCase()} JOIN ${joinTable} ON ${condition}`;
            }
        }
        return sql;
    }
    /**
     * Concatenate strings for MySQL
     */
    concatenate(strings) {
        return `CONCAT(${strings.join(', ')})`;
    }
    /**
     * Date function for MySQL (alias for dateFormat)
     */
    dateFunction(format, column) {
        return this.dateFormat(format, column);
    }
}
//# sourceMappingURL=MySQL.js.map