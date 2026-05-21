/**
 * MySQL Grammar - MySQL-specific SQL compilation
 */
import Grammar from "./Grammar.js";
export default class MySQL extends Grammar {
  /**
   * Wrap column/table identifier for MySQL
   */
  protected wrap(value: string | any): string;
  /**
   * Wrap value with backticks for MySQL
   */
  wrapValue(value: string): string;
  /**
   * Wrap column name for MySQL (alias for wrap method)
   */
  wrapColumn(value: string): string;
  /**
   * Internal LIMIT compilation with OFFSET for MySQL
   */
  protected compileLimitInternal(query: any): string;
  /**
   * MySQL doesn't need separate OFFSET compilation
   */
  protected compileOffset(_query: any): string;
  /**
   * Compile INSERT ON DUPLICATE KEY UPDATE for MySQL
   */
  compileInsertOnDuplicateKeyUpdate(
    builder: any,
    data: object,
    updateData?: object | null,
  ): string;
  /**
   * Return FOR UPDATE lock string for MySQL
   */
  lockForUpdate(): string;
  /**
   * Return LOCK IN SHARE MODE lock string for MySQL
   */
  sharedLock(): string;
  /**
   * Compile INSERT IGNORE statement for MySQL
   */
  compileInsertIgnore(builder: any, data: object): string;
  /**
   * Compile REPLACE statement for MySQL
   */
  compileReplace(builder: any, data: object): string;
  /**
   * Compile TRUNCATE statement for MySQL
   */
  compileTruncate(builder: any): string;
  /**
   * Compile SELECT with LOCK IN SHARE MODE for MySQL
   */
  compileSharedLock(builder: any): string;
  /**
   * Compile SELECT with FOR UPDATE for MySQL
   */
  compileExclusiveLock(builder: any): string;
  /**
   * Format date with MySQL DATE_FORMAT function
   */
  dateFormat(format: string, column: string): string;
  /**
   * Compile UPDATE with JOIN for MySQL
   */
  compileUpdateWithJoin(builder: any, data: object): string;
  /**
   * Compile DELETE with JOIN for MySQL
   */
  compileDeleteWithJoin(builder: any): string;
  /**
   * Concatenate strings for MySQL
   */
  concatenate(strings: string[]): string;
  /**
   * Date function for MySQL (alias for dateFormat)
   */
  dateFunction(format: string, column: string): string;
}
//# sourceMappingURL=MySQL.d.ts.map
