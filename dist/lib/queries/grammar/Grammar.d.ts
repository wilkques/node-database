/**
 * Grammar - Base SQL grammar class for query compilation
 */
export interface GrammarInterface {
    compileSelect(query: any): string;
    compileInsert(query: any, data: object[]): string;
    compileUpdate(query: any, data: object): string;
    compileDelete(query: any): string;
}
export default class Grammar implements GrammarInterface {
    protected tablePrefix: string;
    protected selectComponents: string[];
    /**
     * Compile a SELECT statement
     */
    compileSelect(query: any): string;
    /**
     * Compile INSERT statement
     */
    compileInsert(query: any, data: object[]): string;
    /**
     * Compile UPDATE statement
     */
    compileUpdate(query: any, data: object): string;
    /**
     * Compile DELETE statement
     */
    compileDelete(query: any): string;
    /**
     * Compile SELECT columns
     */
    protected compileColumns(query: any): string;
    /**
     * Compile FROM table
     */
    protected compileFrom(query: any): string;
    /**
     * Compile WHERE clauses
     */
    protected compileWheres(query: any): string;
    /**
     * Compile JOIN clauses
     */
    protected compileJoins(query: any): string;
    /**
     * Compile ORDER BY
     */
    protected compileOrders(query: any): string;
    /**
     * Compile GROUP BY
     */
    protected compileGroups(query: any): string;
    /**
     * Compile HAVING
     */
    protected compileHavings(query: any): string;
    /**
     * Compile LIMIT - public interface for testing
     */
    compileLimit(query: any, limit?: number | null): string;
    /**
     * Internal LIMIT compilation
     */
    protected compileLimitInternal(query: any): string;
    /**
     * Compile OFFSET
     */
    protected compileOffset(query: any): string;
    /**
     * Wrap table name
     */
    protected wrapTable(table: string | any): string;
    /**
     * Wrap column/table identifier
     */
    protected wrap(value: string | any): string;
    /**
     * Capitalize string
     */
    protected capitalize(str: string): string;
    /**
     * Process nested array with optional callback or constant value
     */
    arrayNested(input: any[], callbackOrConstant?: ((value: any) => any) | string): any[];
    /**
     * Wrap identifier(s) with backticks
     */
    contactBacktick(...args: any[]): string;
    /**
     * Wrap string with backticks, handling dots
     */
    private wrapWithBackticks;
    /**
     * Wrap single identifier with backticks, removing existing ones first
     */
    private wrapSingleIdentifier;
    /**
     * Concatenate array of strings with optional separator
     */
    concatenate(strings: string[], glue?: string): string;
    /**
     * Compile individual components of a query
     */
    compileComponents(builder: any): string[];
}
//# sourceMappingURL=Grammar.d.ts.map