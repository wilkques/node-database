import { describe, test, expect, beforeEach } from '@jest/globals';
import Grammar from '../../lib/queries/grammar/Grammar.js';
import MySQLGrammar from '../../lib/queries/grammar/MySQL.js';
import Builder from '../../lib/queries/Builder.js';

describe('Grammar - Base Class Enhancement', () => {
    let grammar;
    let mysqlGrammar;
    let builder;

    beforeEach(() => {
        grammar = new Grammar();
        mysqlGrammar = new MySQLGrammar();
        builder = new Builder(null, mysqlGrammar);
    });

    describe('arrayNested', () => {
        test('should process array with default values', () => {
            const input = ['col1', 'col2', 'col3'];
            const result = grammar.arrayNested(input);
            expect(result).toEqual(['col1', 'col2', 'col3']);
        });

        test('should process array with callback function', () => {
            const input = ['col1', 'col2'];
            const result = grammar.arrayNested(input, value => `\`${value}\``);
            expect(result).toEqual(['`col1`', '`col2`']);
        });

        test('should handle raw objects', () => {
            const input = [{ raw: true, value: 'RAW_VALUE' }, 'col2'];
            const result = grammar.arrayNested(input, value => `\`${value}\``);
            expect(result).toEqual(['RAW_VALUE', '`col2`']);
        });

        test('should process array with constant forceValue', () => {
            const input = ['a', 'b', 'c'];
            const result = grammar.arrayNested(input, 'CONST');
            expect(result).toEqual(['CONST', 'CONST', 'CONST']);
        });
    });

    describe('contactBacktick', () => {
        test('should wrap simple column name with backticks', () => {
            const result = grammar.contactBacktick('column');
            expect(result).toBe('`column`');
        });

        test('should wrap table.column format', () => {
            const result = grammar.contactBacktick('table.column');
            expect(result).toBe('`table`.`column`');
        });

        test('should handle raw objects', () => {
            const result = grammar.contactBacktick({ raw: true, value: 'RAW_VALUE' });
            expect(result).toBe('RAW_VALUE');
        });

        test('should handle multiple arguments', () => {
            const result = grammar.contactBacktick('table', 'column');
            expect(result).toBe('`table`.`column`');
        });

        test('should remove existing backticks', () => {
            const result = grammar.contactBacktick('`table`.`column`');
            expect(result).toBe('`table`.`column`');
        });

        test('should handle array input', () => {
            const result = grammar.contactBacktick(['schema', 'table', 'column']);
            expect(result).toBe('`schema`.`table`.`column`');
        });
    });

    describe('concatenate', () => {
        test('should concatenate array of strings', () => {
            const segments = ['SELECT', '`id`', '`name`'];
            const result = grammar.concatenate(segments);
            expect(result).toBe('SELECT `id` `name`');
        });

        test('should handle empty array', () => {
            const result = grammar.concatenate([]);
            expect(result).toBe('');
        });

        test('should handle custom glue', () => {
            const segments = ['`id`', '`name`', '`email`'];
            const result = grammar.concatenate(segments, ', ');
            expect(result).toBe('`id`, `name`, `email`');
        });

        test('should filter out falsy values', () => {
            const segments = ['SELECT', null, '`id`', '', '`name`'];
            const result = grammar.concatenate(segments);
            expect(result).toBe('SELECT `id` `name`');
        });
    });

    describe('compileComponents', () => {
        test('should return array of compiled component strings', () => {
            builder.components.columns = [{ type: 'column', column: 'id' }, { type: 'column', column: 'name' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.joins = [];
            builder.components.wheres = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.orders = [];
            builder.components.limit = null;
            builder.components.offset = null;

            const components = mysqlGrammar.compileComponents(builder);
            expect(Array.isArray(components)).toBe(true);
            expect(components.length).toBeGreaterThan(0);
            expect(components[0]).toContain('SELECT');
            expect(components[1]).toContain('FROM');
        });

        test('should filter out null/empty components', () => {
            builder.components.columns = [{ type: 'column', column: '*' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.joins = [];
            builder.components.wheres = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.orders = [];
            builder.components.limit = null;
            builder.components.offset = null;

            const components = mysqlGrammar.compileComponents(builder);
            // Should have SELECT and FROM components only
            expect(components).toHaveLength(2);
            expect(components[0]).toContain('SELECT');
            expect(components[1]).toContain('FROM');
        });

        test('should handle all component types when present', () => {
            builder.components.columns = [{ type: 'column', column: '*' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.joins = [];
            builder.components.wheres = [{
                type: 'basic',
                column: 'active',
                operator: '=',
                value: 1,
                boolean: 'and'
            }];
            builder.components.groups = ['department'];
            builder.components.havings = [];
            builder.components.orders = [{ column: 'created_at', direction: 'desc' }];
            builder.components.limit = 10;
            builder.components.offset = null;

            const components = mysqlGrammar.compileComponents(builder);
            expect(components.length).toBe(6); // SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT

            // Verify specific components are present
            const componentsStr = components.join(' ');
            expect(componentsStr).toContain('SELECT');
            expect(componentsStr).toContain('FROM');
            expect(componentsStr).toContain('WHERE');
            expect(componentsStr).toContain('GROUP BY');
            expect(componentsStr).toContain('ORDER BY');
            expect(componentsStr).toContain('LIMIT');
        });

        test('should handle builder with minimal components', () => {
            builder.components.columns = [];
            builder.components.from = null;
            builder.components.joins = [];
            builder.components.wheres = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.orders = [];
            builder.components.limit = null;
            builder.components.offset = null;

            const components = mysqlGrammar.compileComponents(builder);
            expect(Array.isArray(components)).toBe(true);
            // Should still have at least SELECT (even if empty columns)
            expect(components.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('improved compileSelect', () => {
        test('should compile basic SELECT statement', () => {
            builder.components.columns = [{ type: 'column', column: 'id' }, { type: 'column', column: 'name' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.joins = [];
            builder.components.wheres = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.orders = [];
            builder.components.limit = null;
            builder.components.offset = null;

            const sql = mysqlGrammar.compileSelect(builder);
            expect(sql).toMatch(/SELECT.*`id`.*`name`.*FROM.*`users`/);
        });

        test('should handle SELECT with WHERE', () => {
            builder.components.columns = [{ type: 'column', column: '*' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.wheres = [{
                type: 'basic',
                column: 'age',
                operator: '>',
                value: 18,
                boolean: 'and'
            }];
            builder.components.joins = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.orders = [];
            builder.components.limit = null;
            builder.components.offset = null;

            const sql = grammar.compileSelect(builder);
            expect(sql).toContain('WHERE');
        });

        test('should compile with LIMIT and OFFSET', () => {
            builder.components.columns = [{ type: 'column', column: '*' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.joins = [];
            builder.components.wheres = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.orders = [];
            builder.components.limit = 10;
            builder.components.offset = 5;

            const sql = grammar.compileSelect(builder);
            expect(sql).toContain('LIMIT 10');
            expect(sql).toContain('OFFSET 5');
        });

        test('should handle SELECT with ORDER BY', () => {
            builder.components.columns = [{ type: 'column', column: '*' }];
            builder.components.from = { type: 'table', table: 'users' };
            builder.components.orders = [{ column: 'created_at', direction: 'desc' }];
            builder.components.joins = [];
            builder.components.wheres = [];
            builder.components.groups = [];
            builder.components.havings = [];
            builder.components.limit = null;
            builder.components.offset = null;

            const sql = grammar.compileSelect(builder);
            expect(sql).toContain('ORDER BY');
        });
    });
});
