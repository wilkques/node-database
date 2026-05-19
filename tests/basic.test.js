/**
 * Basic tests for the Database package
 */

import Database from '../index.js';
import { jest } from '@jest/globals';

// Mock database connections since we don't have actual databases in tests
jest.mock('mysql2/promise', () => ({
    createConnection: jest.fn(),
    createPool: jest.fn(() => ({
        getConnection: jest.fn(() => Promise.resolve({
            execute: jest.fn(),
            release: jest.fn()
        })),
        end: jest.fn(() => Promise.resolve())
    })),
    escape: jest.fn(value => `'${value}'`)
}));

jest.mock('pg', () => ({
    Pool: jest.fn(() => ({
        connect: jest.fn(() => Promise.resolve({
            release: jest.fn()
        })),
        query: jest.fn(),
        end: jest.fn(() => Promise.resolve())
    })),
    Client: jest.fn(() => ({
        connect: jest.fn(() => Promise.resolve()),
        query: jest.fn(),
        end: jest.fn(() => Promise.resolve())
    }))
}));

jest.mock('sqlite3', () => ({
    Database: jest.fn((path, callback) => {
        setTimeout(() => callback(null), 0); // Simulate successful connection
        return {
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            close: jest.fn(callback => callback(null))
        };
    })
}));

describe('Database Package', () => {
    let db;

    afterEach(async () => {
        if (db && db.connection) {
            await db.connection.close();
        }
    });

    describe('Connection', () => {
        test('should connect with object configuration', async () => {
            db = await Database.connect({
                driver: 'mysql',
                host: 'localhost',
                username: 'test',
                password: 'test',
                database: 'test'
            });

            expect(db).toBeDefined();
            expect(db.connection).toBeDefined();
            expect(db.table).toBeInstanceOf(Function);
        });

        test('should connect with string parameters', async () => {
            db = await Database.connect('mysql', 'localhost', 'test', 'test', 'test');

            expect(db).toBeDefined();
            expect(db.connection).toBeDefined();
        });

        test('should throw error for unsupported driver', async () => {
            await expect(Database.connect({
                driver: 'unsupported'
            })).rejects.toThrow('Unsupported driver [unsupported]');
        });
    });

    describe('Query Builder', () => {
        beforeEach(async () => {
            db = await Database.connect({
                driver: 'mysql',
                host: 'localhost',
                username: 'test',
                password: 'test',
                database: 'test'
            });
        });

        test('should build simple SELECT query', () => {
            const builder = db.table('users');
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users`');
        });

        test('should build SELECT with columns', () => {
            const builder = db.table('users').select('id', 'name', 'email');
            const sql = builder.toSql();

            expect(sql).toBe('SELECT `id`, `name`, `email` FROM `users`');
        });

        test('should build SELECT with WHERE clause', () => {
            const builder = db.table('users').where('status', '=', 'active');
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ?');
            expect(builder.bindings.where).toEqual(['active']);
        });

        test('should build SELECT with multiple WHERE clauses', () => {
            const builder = db.table('users')
                .where('status', 'active')
                .where('age', '>', 18);
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` WHERE `status` = ? AND `age` > ?');
            expect(builder.bindings.where).toEqual(['active', 18]);
        });

        test('should build SELECT with OR WHERE', () => {
            const builder = db.table('users')
                .where('name', 'John')
                .orWhere('name', 'Jane');
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` WHERE `name` = ? OR `name` = ?');
        });

        test('should build SELECT with WHERE IN', () => {
            const builder = db.table('users').whereIn('role', ['admin', 'user']);
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` WHERE `role` IN (?, ?)');
            expect(builder.bindings.where).toEqual(['admin', 'user']);
        });

        test('should build SELECT with JOIN', () => {
            const builder = db.table('users as u')
                .join('profiles as p', 'u.id', '=', 'p.user_id');
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` AS `u` INNER JOIN `profiles` AS `p` ON `u`.`id` = `p`.`user_id`');
        });

        test('should build SELECT with ORDER BY', () => {
            const builder = db.table('users')
                .orderBy('created_at', 'desc')
                .orderBy('name', 'asc');
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` ORDER BY `created_at` DESC, `name` ASC');
        });

        test('should build SELECT with LIMIT and OFFSET', () => {
            const builder = db.table('users')
                .limit(10)
                .offset(20);
            const sql = builder.toSql();

            expect(sql).toBe('SELECT * FROM `users` LIMIT 10 OFFSET 20');
        });

        test('should build INSERT query', () => {
            const data = { name: 'John', email: 'john@example.com' };
            const sql = db.grammar.compileInsert(db.table('users'), data);

            expect(sql).toBe('INSERT INTO `users` (`name`, `email`) VALUES (?, ?)');
        });

        test('should build UPDATE query', () => {
            const builder = db.table('users').where('id', 1);
            const data = { name: 'John Smith' };
            const sql = db.grammar.compileUpdate(builder, data);

            expect(sql).toBe('UPDATE `users` SET `name` = ? WHERE `id` = ?');
        });

        test('should build DELETE query', () => {
            const builder = db.table('users').where('status', 'inactive');
            const sql = db.grammar.compileDelete(builder);

            expect(sql).toBe('DELETE FROM `users` WHERE `status` = ?');
        });
    });

    describe('Grammar', () => {
        test('should wrap column names correctly', () => {
            expect(db.grammar.wrapColumn('name')).toBe('`name`');
            expect(db.grammar.wrapColumn('users.name')).toBe('`users`.`name`');
            expect(db.grammar.wrapColumn('*')).toBe('*');
        });

        test('should wrap table names correctly', () => {
            expect(db.grammar.wrapTable('users')).toBe('`users`');
        });

        test('should handle different operators', () => {
            const testCases = [
                ['=', '='],
                ['!=', '!='],
                ['<>', '<>'],
                ['like', 'like'],
                ['in', 'in']
            ];

            testCases.forEach(([input, expected]) => {
                const builder = db.table('users').where('name', input, 'test');
                const sql = builder.toSql();
                expect(sql).toContain(`\`name\` ${expected} ?`);
            });
        });
    });

    describe('Connection Types', () => {
        test('should create SQLite connection', async () => {
            const sqliteDb = await Database.connect({
                driver: 'sqlite',
                database: ':memory:'
            });

            expect(sqliteDb).toBeDefined();
            await sqliteDb.connection.close();
        });

        test('should create PostgreSQL connection', async () => {
            const pgDb = await Database.connect({
                driver: 'postgres',
                host: 'localhost',
                username: 'test',
                password: 'test',
                database: 'test'
            });

            expect(pgDb).toBeDefined();
            await pgDb.connection.close();
        });
    });

    describe('Query Builder Chainability', () => {
        beforeEach(async () => {
            db = await Database.connect({
                driver: 'mysql',
                host: 'localhost',
                username: 'test',
                password: 'test',
                database: 'test'
            });
        });

        test('should allow method chaining', () => {
            const builder = db.table('users')
                .select('id', 'name')
                .where('status', 'active')
                .orderBy('created_at', 'desc')
                .limit(10);

            expect(builder.toSql()).toBe(
                'SELECT `id`, `name` FROM `users` WHERE `status` = ? ORDER BY `created_at` DESC LIMIT 10'
            );
        });

        test('should clone builder correctly', () => {
            const original = db.table('users').where('status', 'active');
            const cloned = original.clone().where('age', '>', 18);

            expect(original.bindings.where).toEqual(['active']);
            expect(cloned.bindings.where).toEqual(['active', 18]);
        });
    });
});