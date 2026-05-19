/**
 * SQLiteProcessor - SQLite-specific result processing
 */

import Processor from './Processor.js';

export default class SQLiteProcessor extends Processor {
    /**
     * Process INSERT query results for SQLite
     */
    processInsertResults(results: any, sequence?: string): any {
        if (!results) return null;

        return {
            insertId: results.lastInsertRowid || results.lastID || 0,
            affectedRows: results.changes || 1
        };
    }

    /**
     * Process UPDATE query results for SQLite
     */
    processUpdateResults(results: any): number {
        return results.changes || 0;
    }

    /**
     * Process DELETE query results for SQLite
     */
    processDeleteResults(results: any): number {
        return results.changes || 0;
    }

    /**
     * Process column listing for SQLite
     */
    processColumnListing(results: any): string[] {
        if (!results || !Array.isArray(results)) return [];

        return results.map((row: any) =>
            row.name || row.column_name || row.cid
        ).filter(Boolean);
    }

    /**
     * Process SQLite-specific data types
     */
    convertValue(value: any): any {
        if (value === null || value === undefined) {
            return null;
        }

        // SQLite stores booleans as integers
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }

        // SQLite date handling
        if (value instanceof Date) {
            return value.toISOString();
        }

        // SQLite doesn't have native JSON, store as text
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return super.convertValue(value);
    }

    /**
     * Handle SQLite pragma queries
     */
    processPragmaResult(results: any): any {
        if (!results || !Array.isArray(results)) return null;

        // Convert pragma results to a more usable format
        if (results.length === 1 && typeof results[0] === 'object') {
            const row = results[0];
            // Handle PRAGMA table_info format
            if ('cid' in row && 'name' in row && 'type' in row) {
                return results; // Return as-is for table info
            }
            // Handle single PRAGMA result - flatten to object
            return row;
        }

        return results;
    }

    /**
     * Process SQLite-specific value types
     */
    processValue(value: any, type?: string): any {
        if (value === null || value === undefined) {
            return null;
        }

        if (!type) {
            return value;
        }

        const lowerType = type.toLowerCase();

        // SQLite boolean handling (stored as integers)
        if (lowerType.includes('boolean') || lowerType === 'bool') {
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
            return Boolean(value);
        }

        // SQLite integer handling
        if (lowerType === 'integer' || lowerType === 'int') {
            if (typeof value === 'string') {
                const parsed = parseInt(value);
                return isNaN(parsed) ? value : parsed;
            }
            return value;
        }

        // SQLite real (float) handling
        if (lowerType === 'real' || lowerType === 'float') {
            if (typeof value === 'string') {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? value : parsed;
            }
            return value;
        }

        // SQLite text handling
        if (lowerType === 'text') {
            // Try to parse as JSON if it looks like JSON
            if (typeof value === 'string' && value.trim().startsWith('{')) {
                try {
                    return JSON.parse(value);
                } catch {
                    return String(value);
                }
            }
            return String(value);
        }

        return super.processValue(value, type);
    }

    /**
     * Process SQLite column metadata
     */
    processColumns(fields: any[]): any[] {
        if (!Array.isArray(fields)) return [];

        return fields.map((field: any) => {
            return {
                cid: field.cid,
                name: field.name,
                type: field.type,
                notNull: field.notnull === 1,
                default: field.dflt_value,
                pk: field.pk === 1
            };
        });
    }

    /**
     * Process SQLite table info (PRAGMA table_info)
     */
    processTableInfo(results: any[]): any[] {
        if (!Array.isArray(results)) return [];

        return results.map((row: any) => ({
            column_id: row.cid,
            column_name: row.name,
            data_type: row.type,
            not_null: row.notnull === 1,
            default_value: row.dflt_value,
            primary_key: row.pk === 1
        }));
    }


    /**
     * Process SQLite UPDATE results
     */
    processUpdate(results: any): any {
        return {
            affectedRows: results.changes || 0,
            success: true
        };
    }

    /**
     * Process SQLite DELETE results
     */
    processDelete(results: any): any {
        return {
            affectedRows: results.changes || 0,
            success: true
        };
    }

    /**
     * Process SQLite SELECT results
     */
    processSelect(results: any): any[] {
        if (Array.isArray(results)) return results;
        if (results && results.rows) return results.rows;
        return results ? [results] : [];
    }

    /**
     * Process SQLite VACUUM results
     */
    processVacuum(results: any): any {
        return {
            success: true,
            message: "Database vacuum completed successfully"
        };
    }

    /**
     * Process SQLite ANALYZE results
     */
    processAnalyze(results: any): any {
        return {
            success: true,
            message: "Database analyze completed successfully"
        };
    }

    /**
     * Process SQLite PRAGMA results
     */
    processPragma(results: any): any {
        // Handle results with 'rows' property (database driver format)
        if (results && results.rows && Array.isArray(results.rows) && results.rows.length > 0) {
            const firstRow = results.rows[0];
            if (firstRow && typeof firstRow === 'object') {
                // If single row with pragma_value, flatten it
                if (firstRow.pragma_value !== undefined) {
                    return { pragma_value: firstRow.pragma_value };
                }
                // Return first row for other PRAGMA results
                return firstRow;
            }
        }

        // Handle direct array results from PRAGMA queries
        if (results && Array.isArray(results) && results.length > 0) {
            const firstRow = results[0];
            if (firstRow && typeof firstRow === 'object') {
                // If single row with pragma_value, flatten it
                if (firstRow.pragma_value !== undefined) {
                    return { pragma_value: firstRow.pragma_value };
                }
                // Return first row for other PRAGMA results
                return firstRow;
            }
        }

        // Handle direct object results
        if (results && typeof results === 'object' && Object.keys(results).length > 0) {
            if (results.pragma_value !== undefined) {
                return results;
            }
            return results;
        }

        return {
            success: true,
            message: "PRAGMA executed successfully"
        };
    }
}