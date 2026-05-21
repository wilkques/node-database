/**
 * SQLite Grammar - SQLite-specific SQL compilation
 */
import Grammar from "./Grammar.js";
export default class SQLite extends Grammar {
  /**
   * Wrap column/table identifier for SQLite
   */
  protected wrap(value: string | any): string;
  /**
   * Internal LIMIT compilation - SQLite doesn't support OFFSET without LIMIT
   */
  protected compileLimitInternal(query: any): string;
  /**
   * SQLite doesn't need separate OFFSET compilation
   */
  protected compileOffset(_query: any): string;
  /**
   * Wrap value with square brackets for SQLite
   */
  wrapValue(value: string): string;
  /**
   * Compile PRAGMA statement for SQLite
   */
  compilePragma(pragmaName: string, value?: any): string;
  /**
   * Compile UPSERT (INSERT OR REPLACE) for SQLite
   */
  compileUpsert(builder: any, data: object): string;
  /**
   * Concatenate strings for SQLite
   */
  concatenate(strings: string[]): string;
  /**
   * Date function for SQLite
   */
  dateFunction(format: string, column: string, sqliteFormat?: string): string;
  /**
   * Compile INSERT OR REPLACE for SQLite
   */
  compileReplace(builder: any, data: object): string;
  /**
   * Compile INSERT OR IGNORE for SQLite
   */
  compileInsertIgnore(builder: any, data: object): string;
  /**
   * Compile JOIN clauses for SQLite with RIGHT JOIN handling
   */
  compileJoins(query: any, joins?: any[]): string;
  /**
   * Wrap column identifier (alias for wrap method for test compatibility)
   */
  wrapColumn(column: string): string;
}
//# sourceMappingURL=SQLite.d.ts.map
