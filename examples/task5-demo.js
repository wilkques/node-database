/**
 * Task 5 Demo - PostgreSQL and SQLite Enhanced Features
 */

import PostgreSQLProcessor from '../lib/queries/processors/PostgreSQLProcessor.js';
import SQLiteProcessor from '../lib/queries/processors/SQLiteProcessor.js';
import PostgreSQLGrammar from '../lib/queries/grammar/PostgreSQL.js';
import SQLiteGrammar from '../lib/queries/grammar/SQLite.js';

console.log('🚀 Task 5 Demo - PostgreSQL and SQLite Enhanced Features\n');

// ===== PostgreSQL Demo =====
console.log('📘 PostgreSQL Features:');
console.log('========================');

const pgProcessor = new PostgreSQLProcessor();
const pgGrammar = new PostgreSQLGrammar();

// PostgreSQL array processing
const pgArrayValue = '{john,jane,bob}';
console.log('PostgreSQL array:', pgArrayValue, '→', pgProcessor.processValue(pgArrayValue, 'varchar[]'));

// PostgreSQL JSON processing
const pgJsonValue = '{"users": ["admin", "user"], "count": 2}';
console.log('PostgreSQL JSON:', pgJsonValue, '→', pgProcessor.processValue(pgJsonValue, 'jsonb'));

// PostgreSQL UUID
const pgUuidValue = '550e8400-e29b-41d4-a716-446655440000';
console.log('PostgreSQL UUID:', pgUuidValue, '→', pgProcessor.processValue(pgUuidValue, 'uuid'));

// PostgreSQL boolean
console.log('PostgreSQL boolean (t):', 't', '→', pgProcessor.processValue('t', 'boolean'));
console.log('PostgreSQL boolean (f):', 'f', '→', pgProcessor.processValue('f', 'boolean'));

// PostgreSQL RETURNING clause
const pgReturningResult = pgGrammar.compileReturning({}, ['id', 'name', 'created_at']);
console.log('PostgreSQL RETURNING clause:', pgReturningResult);

// PostgreSQL JSON extract
const pgJsonExtract = pgGrammar.jsonExtract('user_data', 'profile.name', '->>');
console.log('PostgreSQL JSON extract:', pgJsonExtract);

console.log('\n📗 SQLite Features:');
console.log('===================');

const sqliteProcessor = new SQLiteProcessor();
const sqliteGrammar = new SQLiteGrammar();

// SQLite boolean from integer
console.log('SQLite boolean (1):', 1, '→', sqliteProcessor.processValue(1, 'boolean'));
console.log('SQLite boolean (0):', 0, '→', sqliteProcessor.processValue(0, 'boolean'));

// SQLite integer conversion
console.log('SQLite integer:', '"123"', '→', sqliteProcessor.processValue('123', 'int'));

// SQLite float conversion
console.log('SQLite float:', '"123.456"', '→', sqliteProcessor.processValue('123.456', 'real'));

// SQLite date processing
const sqliteDateValue = '2023-12-25 10:30:00';
console.log('SQLite date:', sqliteDateValue, '→', sqliteProcessor.processValue(sqliteDateValue, 'datetime'));

// SQLite square bracket wrapping
console.log('SQLite column wrapping:', 'column_name', '→', sqliteGrammar.wrapValue('column_name'));

// SQLite LIMIT with OFFSET handling
const mockQuery = {
    components: { offset: 10 }
};
console.log('SQLite LIMIT -1 OFFSET 10:', sqliteGrammar.compileLimit(mockQuery, null));

// SQLite INSERT OR REPLACE
sqliteGrammar.compileInsert = () => 'INSERT INTO [users] ([name]) VALUES (?)';
const sqliteReplace = sqliteGrammar.compileReplace({}, {});
console.log('SQLite INSERT OR REPLACE:', sqliteReplace);

// SQLite date functions
console.log('SQLite DATE function:', sqliteGrammar.dateFunction('date', 'created_at'));
console.log('SQLite STRFTIME function:', sqliteGrammar.dateFunction('strftime', 'created_at', '%Y-%m-%d'));

// SQLite PRAGMA
console.log('SQLite PRAGMA:', sqliteGrammar.compilePragma('journal_mode', 'WAL'));

console.log('\n✅ All PostgreSQL and SQLite enhanced features demonstrated successfully!');
console.log('\n📊 Summary:');
console.log('- PostgreSQL: RETURNING clauses, arrays, JSON/JSONB, UUID handling');
console.log('- SQLite: Square brackets, LIMIT -1, boolean conversion, date functions');
console.log('- Both: Enhanced value processing and database-specific optimizations');