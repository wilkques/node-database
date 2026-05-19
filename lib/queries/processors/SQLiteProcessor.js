/**
 * SQLite Processor - SQLite-specific result processing
 */

import Processor from './Processor.js';

export default class SQLiteProcessor extends Processor {
    /**
     * Process SQLite INSERT with rowid
     *
     * @param {Object} query - Query builder instance
     * @param {Object} values - Values to insert
     * @param {string} sequence - Optional sequence name (not used in SQLite)
     * @returns {number|string} Generated ID
     */
    async processInsertGetId(query, values, sequence = null) {
        const result = await query.insert(values);
        return result.lastInsertRowId || result.insertId || null;
    }

    /**
     * Process SQLite value types
     *
     * @param {any} value - Raw value from database
     * @param {string} type - Column type (optional)
     * @returns {any} Processed value
     */
    processValue(value, type = '') {
        if (value === null || value === undefined) return null;

        // SQLite stores everything as strings, numbers, or blobs
        // Convert based on expected type
        const lowerType = type.toLowerCase();

        // Handle SQLite boolean (stored as integers)
        if (lowerType === 'boolean' || lowerType === 'bool') {
            return value === 1 || value === '1' || value === 'true' || value === true;
        }

        // Handle SQLite integers
        if (lowerType.includes('int') && typeof value === 'string') {
            const num = parseInt(value, 10);
            return isNaN(num) ? value : num;
        }

        // Handle SQLite real/float/double
        if ((lowerType.includes('real') || lowerType.includes('float') || lowerType.includes('double'))
            && typeof value === 'string') {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        }

        // Handle SQLite text that might be JSON
        if (lowerType === 'text' || lowerType === 'json') {
            if (typeof value === 'string' && this.isJsonString(value)) {
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            }
        }

        // Handle SQLite date/datetime as strings or convert to Date
        if (lowerType.includes('date') || lowerType.includes('time')) {
            if (typeof value === 'string') {
                // Try to parse as Date if it looks like a date
                const dateValue = new Date(value);
                if (!isNaN(dateValue.getTime())) {
                    return dateValue;
                }
            }
            return value;
        }

        return super.processValue(value);
    }

    /**
     * Process SQLite SELECT results
     *
     * @param {Object} result - Raw query result from SQLite driver
     * @param {Array} columns - Selected columns
     * @returns {Array} Processed results
     */
    processSelect(result, columns = []) {
        // SQLite drivers might return different formats
        const rows = result.rows || result || [];
        if (!Array.isArray(rows)) return [];

        return rows.map(row => this.processSelectRow(row, columns));
    }

    /**
     * Process SQLite INSERT results
     *
     * @param {Object} result - Raw query result from SQLite driver
     * @returns {Object} Processed insert result
     */
    processInsert(result) {
        return {
            insertId: result.lastInsertRowId || result.insertId || result.lastID || null,
            affectedRows: result.changes || result.affectedRows || 0,
            success: true
        };
    }

    /**
     * Process SQLite UPDATE results
     *
     * @param {Object} result - Raw query result from SQLite driver
     * @returns {Object} Processed update result
     */
    processUpdate(result) {
        return {
            affectedRows: result.changes || result.affectedRows || 0,
            success: true
        };
    }

    /**
     * Process SQLite DELETE results
     *
     * @param {Object} result - Raw query result from SQLite driver
     * @returns {Object} Processed delete result
     */
    processDelete(result) {
        return {
            affectedRows: result.changes || result.affectedRows || 0,
            success: true
        };
    }

    /**
     * Process SQLite aggregation results
     *
     * @param {Object} result - Raw aggregation result
     * @param {string} func - Aggregate function name
     * @returns {number} Processed aggregate value
     */
    processAggregate(result, func = 'count') {
        const rows = result.rows || result || [];
        if (!Array.isArray(rows) || rows.length === 0) {
            return 0;
        }

        const row = rows[0];
        const value = row.aggregate || row[func] || Object.values(row)[0];

        if (value === null || value === undefined) {
            return 0;
        }

        return Number(value) || 0;
    }

    /**
     * Process SQLite VACUUM results
     *
     * @param {Object} result - Raw VACUUM result
     * @returns {Object} Processed vacuum result
     */
    processVacuum(result) {
        return {
            success: true,
            message: 'Database vacuum completed successfully'
        };
    }

    /**
     * Process SQLite ANALYZE results
     *
     * @param {Object} result - Raw ANALYZE result
     * @returns {Object} Processed analyze result
     */
    processAnalyze(result) {
        return {
            success: true,
            message: 'Database analyze completed successfully'
        };
    }

    /**
     * Process SQLite PRAGMA results
     *
     * @param {Object} result - Raw PRAGMA result
     * @returns {Object} Processed pragma result
     */
    processPragma(result) {
        const rows = result.rows || result || [];
        if (Array.isArray(rows) && rows.length > 0) {
            // Return the first row if it's a query pragma
            return rows[0];
        }
        return {
            success: true,
            message: 'PRAGMA executed successfully'
        };
    }
}