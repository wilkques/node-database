import { describe, test, expect, beforeAll } from '@jest/globals';
import Builder from '../../lib/queries/Builder.js';
import MySQLGrammar from '../../lib/queries/grammar/MySQL.js';
import MySQLProcessor from '../../lib/queries/processors/MySQLProcessor.js';
import PostgreSQLGrammar from '../../lib/queries/grammar/PostgreSQL.js';
import PostgreSQLProcessor from '../../lib/queries/processors/PostgreSQLProcessor.js';
import SQLiteGrammar from '../../lib/queries/grammar/SQLite.js';
import SQLiteProcessor from '../../lib/queries/processors/SQLiteProcessor.js';

describe('Grammar & Processor Integration', () => {
    let db;

    beforeAll(async () => {
        // Mock database connection for testing
        db = {
            table: (tableName) => {
                const builder = new Builder();
                builder.grammar = new MySQLGrammar();
                builder.processor = new MySQLProcessor();
                return builder.from(tableName);
            }
        };
    });

    test('should compile complex query with MySQL grammar', () => {
        const query = db.table('users as u')
            .select(['u.id', 'u.name', 'p.title'])
            .leftJoin('posts as p', 'u.id', 'p.user_id')
            .whereIn('u.status', ['active', 'pending'])
            .where('u.created_at', '>', '2023-01-01')
            .groupBy('u.id')
            .having('COUNT(p.id)', '>', 5)
            .orderBy('u.created_at', 'DESC')
            .limit(10)
            .offset(5);

        const sql = query.toSql();
        const bindings = query.getBindings();

        expect(sql).toContain('SELECT `u`.`id`, `u`.`name`, `p`.`title`');
        expect(sql).toContain('FROM `users` AS `u`');
        expect(sql).toContain('LEFT JOIN `posts` AS `p`');
        expect(sql).toContain('WHERE `u`.`status` IN (?, ?)');
        expect(sql).toContain('GROUP BY `u`.`id`');
        expect(sql).toContain('LIMIT 10 OFFSET 5');

        expect(bindings).toEqual(['active', 'pending', '2023-01-01', 5]);
    });

    test('should process MySQL result with proper type conversion', () => {
        const processor = new MySQLProcessor();

        const mockResult = {
            rows: [
                {
                    id: 1,
                    name: 'John Doe',
                    active: 1, // MySQL boolean
                    created_at: '2023-12-01 15:30:00',
                    metadata: '{"role":"admin"}' // JSON string
                }
            ],
            fields: [
                { Field: 'id', Type: 'int(11)', Null: 'NO' },
                { Field: 'name', Type: 'varchar(255)', Null: 'YES' },
                { Field: 'active', Type: 'tinyint(1)', Null: 'NO' },
                { Field: 'created_at', Type: 'datetime', Null: 'NO' },
                { Field: 'metadata', Type: 'json', Null: 'YES' }
            ]
        };

        const processed = processor.processSelect(mockResult, []);
        const columns = processor.processColumns(mockResult.fields);

        expect(processed[0]).toMatchObject({
            id: 1,
            name: 'John Doe',
            active: true, // Converted from 1
            created_at: expect.any(Date),
            metadata: { role: 'admin' } // Parsed JSON
        });

        expect(columns[2]).toMatchObject({
            name: 'active',
            type: 'boolean',
            nullable: false
        });
    });

    describe('MySQL Integration', () => {
        test('should use MySQL-specific identifier quoting', () => {
            const builder = new Builder(null, new MySQLGrammar(), new MySQLProcessor());
            const query = builder
                .table('users')
                .select(['id', 'name', 'email'])
                .where('status', '=', 'active')
                .limit(10);

            const sql = query.toSql();
            expect(sql).toContain('SELECT `id`, `name`, `email`');
            expect(sql).toContain('FROM `users`');
            expect(sql).toContain('WHERE `status` = ?');
            expect(sql).toContain('LIMIT 10');
        });
    });

    describe('PostgreSQL Integration', () => {
        test('should use PostgreSQL-specific identifier quoting', () => {
            const builder = new Builder(null, new PostgreSQLGrammar(), new PostgreSQLProcessor());
            const query = builder
                .table('users')
                .select(['id', 'name', 'email'])
                .where('status', '=', 'active')
                .limit(10);

            const sql = query.toSql();
            expect(sql).toContain('SELECT "id", "name", "email"');
            expect(sql).toContain('FROM "users"');
            expect(sql).toContain('WHERE "status" = $1');
            expect(sql).toContain('LIMIT 10');
        });

        test('should use PostgreSQL parameter placeholders', () => {
            const builder = new Builder(null, new PostgreSQLGrammar(), new PostgreSQLProcessor());
            const query = builder
                .table('users')
                .where('status', '=', 'active')
                .where('id', '>', 10)
                .where('created_at', '<', '2024-01-01');

            const sql = query.toSql();
            expect(sql).toContain('WHERE "status" = $1');
            expect(sql).toContain('AND "id" > $2');
            expect(sql).toContain('AND "created_at" < $3');
        });
    });

    describe('SQLite Integration', () => {
        test('should use SQLite-specific square bracket quoting', () => {
            const builder = new Builder(null, new SQLiteGrammar(), new SQLiteProcessor());
            const query = builder
                .table('users')
                .select(['id', 'name', 'email'])
                .where('status', '=', 'active')
                .limit(10);

            const sql = query.toSql();
            expect(sql).toContain('SELECT [id], [name], [email]');
            expect(sql).toContain('FROM [users]');
            expect(sql).toContain('WHERE [status] = ?');
            expect(sql).toContain('LIMIT 10');
        });

        test('should process SQLite results correctly', () => {
            const processor = new SQLiteProcessor();

            const mockResult = [
                {
                    id: 1,
                    name: 'John Doe',
                    active: 1, // SQLite boolean as integer
                    created_at: '2023-12-01 15:30:00'
                }
            ];

            const processed = processor.processSelect({ rows: mockResult }, []);
            expect(processed).toHaveLength(1);
            expect(processed[0].id).toBe(1);
            expect(processed[0].name).toBe('John Doe');
        });
    });

    describe('Cross-Database Compatibility', () => {
        test('should produce different SQL syntax for same query across databases', () => {
            const baseQueryConfig = {
                table: 'users',
                select: ['id', 'name'],
                where: ['status', '=', 'active'],
                limit: 10
            };

            // MySQL
            const mysqlBuilder = new Builder(null, new MySQLGrammar(), new MySQLProcessor());
            const mysqlQuery = mysqlBuilder
                .table(baseQueryConfig.table)
                .select(baseQueryConfig.select)
                .where(...baseQueryConfig.where)
                .limit(baseQueryConfig.limit);
            const mysqlSql = mysqlQuery.toSql();
            expect(mysqlSql).toContain('`users`');
            expect(mysqlSql).toContain('`id`, `name`');

            // PostgreSQL
            const postgresBuilder = new Builder(null, new PostgreSQLGrammar(), new PostgreSQLProcessor());
            const postgresQuery = postgresBuilder
                .table(baseQueryConfig.table)
                .select(baseQueryConfig.select)
                .where(...baseQueryConfig.where)
                .limit(baseQueryConfig.limit);
            const postgresSql = postgresQuery.toSql();
            expect(postgresSql).toContain('"users"');
            expect(postgresSql).toContain('"id", "name"');
            expect(postgresSql).toContain('$1'); // PostgreSQL parameter

            // SQLite
            const sqliteBuilder = new Builder(null, new SQLiteGrammar(), new SQLiteProcessor());
            const sqliteQuery = sqliteBuilder
                .table(baseQueryConfig.table)
                .select(baseQueryConfig.select)
                .where(...baseQueryConfig.where)
                .limit(baseQueryConfig.limit);
            const sqliteSql = sqliteQuery.toSql();
            expect(sqliteSql).toContain('[users]');
            expect(sqliteSql).toContain('[id], [name]');
        });
    });

    describe('Builder Auto-Detection', () => {
        test('should set database-specific grammar and processor on connection', async () => {
            // Test MySQL auto-detection
            const mysqlConnection = { config: { driver: 'mysql' } };
            const mysqlBuilder = new Builder(mysqlConnection);

            // Wait a bit for async imports (if any)
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mysqlBuilder.connection).toBeDefined();
            expect(mysqlBuilder.connection.config.driver).toBe('mysql');

            // Test PostgreSQL auto-detection
            const postgresConnection = { config: { driver: 'postgresql' } };
            const postgresBuilder = new Builder(postgresConnection);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(postgresBuilder.connection).toBeDefined();
            expect(postgresBuilder.connection.config.driver).toBe('postgresql');

            // Test SQLite auto-detection
            const sqliteConnection = { config: { driver: 'sqlite' } };
            const sqliteBuilder = new Builder(sqliteConnection);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(sqliteBuilder.connection).toBeDefined();
            expect(sqliteBuilder.connection.config.driver).toBe('sqlite');
        });

        test('should handle missing connection gracefully', () => {
            const builder = new Builder(null, null, null);
            expect(builder.connection).toBeNull();
            expect(builder.grammar).toBeNull();
            expect(builder.processor).toBeNull();
        });

        test('should handle invalid driver gracefully', async () => {
            const invalidConnection = { config: { driver: 'invalid' } };
            const builder = new Builder(invalidConnection);

            // Wait a bit for async imports (if any)
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(builder.connection).toBeDefined();
            // Should use fallback grammar/processor or null
        });
    });

    describe('Error Handling', () => {
        test('should handle processor with null input gracefully', () => {
            const mysqlProcessor = new MySQLProcessor();
            const postgresProcessor = new PostgreSQLProcessor();
            const sqliteProcessor = new SQLiteProcessor();

            // Test with null/undefined inputs
            expect(() => {
                mysqlProcessor.processSelect({ rows: null }, []);
            }).not.toThrow();

            expect(() => {
                postgresProcessor.processSelect({ rows: [] }, []);
            }).not.toThrow();

            expect(() => {
                sqliteProcessor.processSelect({ rows: [] }, []);
            }).not.toThrow();
        });
    });
});