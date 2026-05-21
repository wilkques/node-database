/**
 * MySQLProcessor - MySQL-specific result processing
 */
import Processor from "./Processor.js";
export default class MySQLProcessor extends Processor {
  /**
   * Process INSERT query results for MySQL
   */
  processInsertResults(results: any, sequence?: string): any;
  /**
   * Process UPDATE query results for MySQL
   */
  processUpdateResults(results: any): number;
  /**
   * Process DELETE query results for MySQL
   */
  processDeleteResults(results: any): number;
  /**
   * Process column listing for MySQL
   */
  processColumnListing(results: any): string[];
  /**
   * Process MySQL-specific data types
   */
  convertValue(value: any): any;
  /**
   * Process MySQL-specific value types
   */
  processValue(value: any, type?: string): any;
  /**
   * Process SELECT results with type conversion based on field metadata
   */
  processSelect(results: any, fields?: any[]): any[];
  /**
   * Process MySQL column metadata
   */
  processColumns(fields: any[]): any[];
  /**
   * Map MySQL column types
   */
  private mapMySQLColumnType;
}
//# sourceMappingURL=MySQLProcessor.d.ts.map
