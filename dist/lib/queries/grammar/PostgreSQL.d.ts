/**
 * PostgreSQL Grammar - PostgreSQL-specific SQL compilation
 */
import Grammar from "./Grammar.js";
export default class PostgreSQL extends Grammar {
  /**
   * Wrap column/table identifier for PostgreSQL
   */
  protected wrap(value: string | any): string;
  /**
   * Wrap value with double quotes for PostgreSQL
   */
  wrapValue(value: string): string;
  /**
   * Compile RETURNING clause for PostgreSQL
   */
  compileReturning(query: any, columns?: string[] | null): string;
  /**
   * Compile INSERT with RETURNING for PostgreSQL
   */
  compileInsert(query: any, data: object[]): string;
  /**
   * Compile UPDATE with RETURNING for PostgreSQL
   */
  compileUpdate(query: any, data: object): string;
  /**
   * Compile OFFSET - public interface for testing
   */
  compileOffset(query: any, offset?: number): string;
  /**
   * Compile INSERT with RETURNING for PostgreSQL
   */
  compileInsertReturning(query: any, data: object, columns?: string[]): string;
  /**
   * Generate JSON extraction expressions for PostgreSQL
   */
  jsonExtract(column: string, path: string, operator?: string): string;
  /**
   * Compile WHERE clauses with PostgreSQL parameter placeholders
   */
  protected compileWheres(query: any): string;
}
//# sourceMappingURL=PostgreSQL.d.ts.map
