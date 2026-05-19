/**
 * MySQL Processor - MySQL-specific result processing
 */

import Processor from './Processor.js';

export default class MySQLProcessor extends Processor {
    /**
     * Process MySQL column metadata
     *
     * @param {Array} fields - MySQL DESCRIBE result
     * @returns {Array} Processed column information
     */
    processColumns(fields = []) {
        return fields.map(field => {
            const column = {
                name: field.Field || field.name,
                type: this.normalizeMySQLType(field.Type || field.type),
                length: this.extractLength(field.Type),
                nullable: (field.Null || field.nullable) === 'YES',
                default: field.Default !== null ? field.Default : null,
                key: field.Key || null,
                extra: field.Extra || null
            };

            // Handle auto_increment
            if (column.extra && column.extra.includes('auto_increment')) {
                column.autoIncrement = true;
            }

            return column;
        });
    }

    /**
     * Normalize MySQL-specific type names
     */
    normalizeMySQLType(type) {
        if (!type) return 'unknown';

        const lowerType = type.toLowerCase();

        // Handle MySQL-specific type mappings
        if (lowerType.includes('tinyint(1)')) return 'boolean';
        if (lowerType.startsWith('tinyint')) return 'tinyint';
        if (lowerType.startsWith('smallint')) return 'smallint';
        if (lowerType.startsWith('mediumint')) return 'mediumint';
        if (lowerType.startsWith('int')) return 'integer';
        if (lowerType.startsWith('bigint')) return 'bigint';
        if (lowerType.startsWith('decimal') || lowerType.startsWith('numeric')) return 'decimal';
        if (lowerType.startsWith('float')) return 'float';
        if (lowerType.startsWith('double')) return 'double';
        if (lowerType.startsWith('varchar')) return 'varchar';
        if (lowerType.startsWith('char')) return 'char';
        if (lowerType === 'text') return 'text';
        if (lowerType === 'mediumtext') return 'mediumtext';
        if (lowerType === 'longtext') return 'longtext';
        if (lowerType === 'date') return 'date';
        if (lowerType === 'time') return 'time';
        if (lowerType === 'datetime') return 'datetime';
        if (lowerType === 'timestamp') return 'timestamp';
        if (lowerType === 'year') return 'year';

        return type;
    }

    /**
     * Extract length from MySQL type definition
     */
    extractLength(type) {
        if (!type) return null;

        const match = type.match(/\((\d+)\)/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Process MySQL-specific values
     */
    processValue(value, type = '') {
        if (value === null || value === undefined) {
            return null;
        }

        const lowerType = type.toLowerCase();

        // Handle MySQL boolean (tinyint(1))
        if (lowerType.includes('tinyint(1)')) {
            return value === 1 || value === '1' || value === true;
        }

        // Handle MySQL date/time types
        if (lowerType === 'datetime' || lowerType === 'timestamp') {
            if (typeof value === 'string') {
                return new Date(value);
            }
        }

        if (lowerType === 'date') {
            if (typeof value === 'string') {
                return new Date(value + 'T00:00:00.000Z');
            }
        }

        // Handle JSON columns (MySQL 5.7+)
        if (lowerType === 'json' && typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }

        // Handle MySQL SET and ENUM types
        if (lowerType.startsWith('set(') || lowerType.startsWith('enum(')) {
            return value; // Return as string
        }

        // Handle DECIMAL/NUMERIC precision
        if (lowerType.startsWith('decimal') || lowerType.startsWith('numeric')) {
            return parseFloat(value);
        }

        // Default processing
        return super.processValue(value);
    }

    /**
     * Process MySQL SELECT query results with proper type conversion
     *
     * @param {Object} result - Raw query result from driver
     * @param {Array} columns - Selected columns
     * @returns {Array} Processed results
     */
    processSelect(result, columns = []) {
        if (!result.rows) return [];

        // If we have field metadata, use it for type conversion
        const fieldTypes = {};
        if (result.fields) {
            result.fields.forEach(field => {
                fieldTypes[field.Field || field.name] = field.Type || field.type;
            });
        }

        return result.rows.map(row => {
            const processedRow = {};

            for (const [key, value] of Object.entries(row)) {
                const fieldType = fieldTypes[key] || '';
                processedRow[key] = this.processValue(value, fieldType);
            }

            return processedRow;
        });
    }

    /**
     * Process MySQL INSERT result with auto_increment handling
     */
    processInsert(result) {
        const processed = super.processInsert(result);

        // MySQL provides insertId directly
        if (result.insertId) {
            processed.insertId = result.insertId;
        }

        return processed;
    }
}