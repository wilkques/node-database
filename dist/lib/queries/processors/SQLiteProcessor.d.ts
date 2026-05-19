/**
 * SQLiteProcessor - SQLite-specific result processing
 */
import Processor from './Processor.js';
export default class SQLiteProcessor extends Processor {
    /**
     * Process INSERT query results for SQLite
     */
    processInsertResults(results: any, sequence?: string): any;
    /**
     * Process UPDATE query results for SQLite
     */
    processUpdateResults(results: any): number;
    /**
     * Process DELETE query results for SQLite
     */
    processDeleteResults(results: any): number;
    /**
     * Process column listing for SQLite
     */
    processColumnListing(results: any): string[];
    /**
     * Process SQLite-specific data types
     */
    convertValue(value: any): any;
    /**
     * Handle SQLite pragma queries
     */
    processPragmaResult(results: any): any;
    /**
     * Process SQLite-specific value types
     */
    processValue(value: any, type?: string): any;
    /**
     * Process SQLite column metadata
     */
    processColumns(fields: any[]): any[];
    /**
     * Process SQLite table info (PRAGMA table_info)
     */
    processTableInfo(results: any[]): any[];
    /**
     * Process SQLite UPDATE results
     */
    processUpdate(results: any): any;
    /**
     * Process SQLite DELETE results
     */
    processDelete(results: any): any;
    /**
     * Process SQLite SELECT results
     */
    processSelect(results: any): any[];
    /**
     * Process SQLite VACUUM results
     */
    processVacuum(results: any): any;
    /**
     * Process SQLite ANALYZE results
     */
    processAnalyze(results: any): any;
    /**
     * Process SQLite PRAGMA results
     */
    processPragma(results: any): any;
}
//# sourceMappingURL=SQLiteProcessor.d.ts.map