import { describe, test, expect } from '@jest/globals';
import MySQLProcessor from '../../lib/queries/processors/MySQLProcessor.js';

describe('MySQLProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new MySQLProcessor();
    });

    test('should process MySQL-specific column types', () => {
        const fields = [
            { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', Extra: 'auto_increment' },
            { Field: 'created_at', Type: 'timestamp', Null: 'NO', Default: 'CURRENT_TIMESTAMP' }
        ];

        const columns = processor.processColumns(fields);
        expect(columns[0]).toMatchObject({
            name: 'id',
            type: 'integer',
            nullable: false,
            key: 'PRI',
            extra: 'auto_increment'
        });
    });

    test('should handle MySQL boolean conversion', () => {
        expect(processor.processValue(1, 'tinyint(1)')).toBe(true);
        expect(processor.processValue(0, 'tinyint(1)')).toBe(false);
        expect(processor.processValue(1, 'int(11)')).toBe(1);
    });

    test('should process MySQL datetime formats', () => {
        const mysqlDate = '2023-12-01 15:30:00';
        const processed = processor.processValue(mysqlDate, 'datetime');
        expect(processed).toBeInstanceOf(Date);
    });
});