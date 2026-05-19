/**
 * SQLite Grammar Tests - Enhanced Features
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import SQLiteGrammar from '../../lib/queries/grammar/SQLite.js';

describe('SQLiteGrammar - Enhanced Features', () => {
    let grammar;

    beforeEach(() => {
        grammar = new SQLiteGrammar();
    });

    describe('wrapValue', () => {
        it('should wrap values with square brackets', () => {
            expect(grammar.wrapValue('column_name')).toBe('[column_name]');
            expect(grammar.wrapValue('*')).toBe('*');
        });
    });

    describe('compileLimit', () => {
        it('should compile LIMIT clause without offset', () => {
            const mockQuery = {
                components: { offset: null }
            };

            expect(grammar.compileLimit(mockQuery, 10)).toBe('LIMIT 10');
            expect(grammar.compileLimit(mockQuery, null)).toBe('');
        });

        it('should compile LIMIT with OFFSET', () => {
            const mockQuery = {
                components: { offset: 5 }
            };

            const result = grammar.compileLimit(mockQuery, 10);
            expect(result).toBe('LIMIT 10 OFFSET 5');
        });

        it('should use LIMIT -1 when only offset is provided', () => {
            const mockQuery = {
                components: { offset: 5 }
            };

            const result = grammar.compileLimit(mockQuery, null);
            expect(result).toBe('LIMIT -1 OFFSET 5');
        });
    });

    describe('compileOffset', () => {
        it('should return empty string (handled by compileLimit)', () => {
            const mockQuery = {};
            expect(grammar.compileOffset(mockQuery, 5)).toBe('');
        });
    });

    describe('compileReplace', () => {
        it('should compile INSERT OR REPLACE', () => {
            const mockQuery = {};
            grammar.compileInsert = jest.fn(() => 'INSERT INTO [users] ([name]) VALUES (?)');

            const result = grammar.compileReplace(mockQuery, {});
            expect(result).toBe('INSERT OR REPLACE INTO [users] ([name]) VALUES (?)');
        });
    });

    describe('compileInsertIgnore', () => {
        it('should compile INSERT OR IGNORE', () => {
            const mockQuery = {};
            grammar.compileInsert = jest.fn(() => 'INSERT INTO [users] ([name]) VALUES (?)');

            const result = grammar.compileInsertIgnore(mockQuery, {});
            expect(result).toBe('INSERT OR IGNORE INTO [users] ([name]) VALUES (?)');
        });
    });

    describe('compileUpsert', () => {
        it('should use INSERT OR REPLACE for upsert', () => {
            const mockQuery = {};
            grammar.compileReplace = jest.fn(() => 'INSERT OR REPLACE INTO [users] ([name]) VALUES (?)');

            const result = grammar.compileUpsert(mockQuery, {});
            expect(grammar.compileReplace).toHaveBeenCalledWith(mockQuery, {});
        });
    });

    describe('dateFunction', () => {
        it('should compile date functions', () => {
            expect(grammar.dateFunction('date', 'created_at')).toBe('DATE([created_at])');
            expect(grammar.dateFunction('time', 'created_at')).toBe('TIME([created_at])');
            expect(grammar.dateFunction('datetime', 'created_at')).toBe('DATETIME([created_at])');
        });

        it('should compile strftime function', () => {
            const result = grammar.dateFunction('strftime', 'created_at', '%Y-%m-%d');
            expect(result).toBe('STRFTIME(\'%Y-%m-%d\', [created_at])');
        });

        it('should throw error for strftime without format', () => {
            expect(() => {
                grammar.dateFunction('strftime', 'created_at');
            }).toThrow('Format is required for strftime function');
        });

        it('should throw error for unknown function', () => {
            expect(() => {
                grammar.dateFunction('unknown', 'created_at');
            }).toThrow('Unknown date function: unknown');
        });
    });

    describe('compilePragma', () => {
        it('should compile PRAGMA statement without value', () => {
            expect(grammar.compilePragma('journal_mode')).toBe('PRAGMA journal_mode');
        });

        it('should compile PRAGMA statement with value', () => {
            expect(grammar.compilePragma('journal_mode', 'WAL')).toBe('PRAGMA journal_mode = WAL');
        });
    });

    describe('compileJoins', () => {
        it('should warn about RIGHT JOIN conversion', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const joins = [{
                type: 'right',
                table: 'orders',
                first: 'users.id',
                operator: '=',
                second: 'orders.user_id'
            }];

            grammar.wrapTable = jest.fn((table) => `[${table}]`);
            grammar.wrapColumn = jest.fn((col) => `[${col}]`);

            const result = grammar.compileJoins({}, joins);
            expect(consoleSpy).toHaveBeenCalledWith('SQLite does not support RIGHT JOIN, consider restructuring your query');
            expect(result).toBe('LEFT JOIN [orders] ON [users.id] = [orders.user_id]');

            consoleSpy.mockRestore();
        });
    });
});