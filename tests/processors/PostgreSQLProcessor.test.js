/**
 * PostgreSQL Processor Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import PostgreSQLProcessor from '../../lib/queries/processors/PostgreSQLProcessor.js';

describe('PostgreSQLProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new PostgreSQLProcessor();
    });

    describe('processValue', () => {
        it('should process PostgreSQL arrays', () => {
            const arrayValue = '{1,2,3}';
            const result = processor.processValue(arrayValue, 'integer[]');
            expect(result).toEqual(['1', '2', '3']);
        });

        it('should process JSON values', () => {
            const jsonValue = '{"key": "value"}';
            const result = processor.processValue(jsonValue, 'json');
            expect(result).toEqual({ key: 'value' });
        });

        it('should process JSONB values', () => {
            const jsonbValue = '{"users": ["john", "jane"]}';
            const result = processor.processValue(jsonbValue, 'jsonb');
            expect(result).toEqual({ users: ['john', 'jane'] });
        });

        it('should handle UUID values', () => {
            const uuidValue = '550e8400-e29b-41d4-a716-446655440000';
            const result = processor.processValue(uuidValue, 'uuid');
            expect(result).toBe(uuidValue);
        });

        it('should process boolean values', () => {
            expect(processor.processValue('t', 'boolean')).toBe(true);
            expect(processor.processValue('f', 'boolean')).toBe(false);
            expect(processor.processValue('true', 'bool')).toBe(true);
            expect(processor.processValue('1', 'boolean')).toBe(true);
        });

        it('should process numeric values', () => {
            const numericValue = '123.456';
            const result = processor.processValue(numericValue, 'numeric');
            expect(result).toBe(123.456);
        });

        it('should handle null values', () => {
            expect(processor.processValue(null)).toBeNull();
            expect(processor.processValue(undefined)).toBeNull();
        });
    });

    describe('processInsert', () => {
        it('should process INSERT results with RETURNING', () => {
            const mockResult = {
                rows: [{ id: 123 }],
                rowCount: 1
            };

            const result = processor.processInsert(mockResult);
            expect(result).toEqual({
                insertId: 123,
                affectedRows: 1,
                success: true,
                returning: [{ id: 123 }]
            });
        });

        it('should handle INSERT without RETURNING', () => {
            const mockResult = {
                rowCount: 1
            };

            const result = processor.processInsert(mockResult);
            expect(result).toEqual({
                insertId: null,
                affectedRows: 1,
                success: true,
                returning: []
            });
        });
    });

    describe('processAggregate', () => {
        it('should handle bigint COUNT results', () => {
            const mockResult = {
                rows: [{ count: BigInt(42) }]
            };

            const result = processor.processAggregate(mockResult, 'count');
            expect(result).toBe(42);
        });
    });

    describe('processCopy', () => {
        it('should process COPY results', () => {
            const mockResult = {
                rowCount: 100
            };

            const result = processor.processCopy(mockResult);
            expect(result).toEqual({
                rowsProcessed: 100,
                success: true
            });
        });
    });
});