/**
 * PostgreSQLProcessor - PostgreSQL-specific result processing
 */
import Processor from "./Processor.js";
export default class PostgreSQLProcessor extends Processor {
  /**
   * Process INSERT query results for PostgreSQL
   */
  processInsertResults(results: any, sequence?: string): any;
  /**
   * Process UPDATE query results for PostgreSQL
   */
  processUpdateResults(results: any): number;
  /**
   * Process DELETE query results for PostgreSQL
   */
  processDeleteResults(results: any): number;
  /**
   * Process column listing for PostgreSQL
   */
  processColumnListing(results: any): string[];
  /**
   * Process PostgreSQL-specific data types
   */
  convertValue(value: any): any;
  /**
   * Recursively sanitize object for JSON serialization
   */
  private sanitizeForJson;
  /**
   * Process PostgreSQL-specific value types
   */
  processValue(value: any, type?: string): any;
  /**
   * Process PostgreSQL column metadata
   */
  processColumns(fields: any[]): any[];
  /**
   * Process PostgreSQL COPY results
   */
  processCopy(results: any): any;
  /**
   * Process aggregate results with PostgreSQL specifics
   */
  processAggregate(results: any, column?: string): any;
  /**
   * Process INSERT operation results with PostgreSQL specifics
   */
  processInsert(results: any, sequence?: string): any;
}
//# sourceMappingURL=PostgreSQLProcessor.d.ts.map
