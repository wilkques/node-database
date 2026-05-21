/**
 * Processor - Query Result Processor
 *
 * Processes raw database results into standardized format
 */
export interface ProcessorInterface {
  processSelectResults(results: any): any[];
  processInsertResults(results: any, sequence?: string): any;
  processUpdateResults(results: any): number;
  processDeleteResults(results: any): number;
  processColumnListing(results: any): string[];
}
export default class Processor implements ProcessorInterface {
  /**
   * Process SELECT query results
   */
  processSelectResults(results: any): any[];
  /**
   * Process INSERT query results
   */
  processInsertResults(results: any, sequence?: string): any;
  /**
   * Process UPDATE query results
   */
  processUpdateResults(results: any): number;
  /**
   * Process DELETE query results
   */
  processDeleteResults(results: any): number;
  /**
   * Process column listing results
   */
  processColumnListing(results: any): string[];
  /**
   * Process aggregate results (COUNT, SUM, etc.)
   */
  processAggregateResults(results: any, column: string): any;
  /**
   * Process EXISTS query results
   */
  processExistsResults(results: any): boolean;
  /**
   * Flatten array of values for binding
   */
  flattenBindings(bindings: any[]): any[];
  /**
   * Convert values to appropriate database format
   */
  convertValue(value: any): any;
  /**
   * Prepare values for insertion/update
   */
  prepareValues(values: Record<string, any>): Record<string, any>;
  /**
   * Process individual value based on type
   */
  processValue(value: any, type?: string): any;
  /**
   * Process column metadata
   */
  processColumns(fields: any[]): any[];
  /**
   * Process INSERT and get ID
   */
  processInsertGetId(
    builder: any,
    data: any,
    sequence?: string,
  ): Promise<number>;
  /**
   * Map database column types to standard types
   */
  protected mapColumnType(type: string): string;
  /**
   * Process aggregate results (COUNT, SUM, etc.) - alias for compatibility
   */
  processAggregate(results: any, column?: string): any;
  /**
   * Process INSERT operation results - alias for compatibility
   */
  processInsert(results: any, sequence?: string): any;
  /**
   * Process UPDATE operation results - alias for compatibility
   */
  processUpdate(results: any): any;
  /**
   * Process DELETE operation results - alias for compatibility
   */
  processDelete(results: any): any;
  /**
   * Process SELECT operation results - alias for compatibility
   */
  processSelect(results: any): any[];
  /**
   * Process VACUUM operation results
   */
  processVacuum(results: any): any;
  /**
   * Process ANALYZE operation results
   */
  processAnalyze(results: any): any;
  /**
   * Process PRAGMA operation results
   */
  processPragma(results: any): any;
  /**
   * Normalize column type to standard format
   */
  normalizeColumnType(type: string): string;
  /**
   * Parse nullable flag from various formats
   */
  parseNullable(value: any): boolean;
}
//# sourceMappingURL=Processor.d.ts.map
