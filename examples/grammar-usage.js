/**
 * Grammar & Processors System - Comprehensive Usage Examples
 *
 * This file demonstrates practical usage of the Grammar and Processors systems
 * for different database engines (MySQL, PostgreSQL, SQLite).
 */

// ============================================================================
// EXAMPLE 1: Simple SELECT Queries
// ============================================================================

import MySQLGrammar from '../lib/queries/grammar/MySQLGrammar.js';
import PostgreSQLGrammar from '../lib/queries/grammar/PostgreSQLGrammar.js';
import SQLiteGrammar from '../lib/queries/grammar/SQLiteGrammar.js';
import Builder from '../lib/queries/Builder.js';

/**
 * Example 1.1: Basic SELECT - Single Table
 */
export function example_basic_select() {
  console.log('\n=== Example 1.1: Basic SELECT ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder.select(['id', 'name', 'email']).from('users');

  const sql = grammar.compileSelect(builder);
  console.log('MySQL:      ', sql);
  // Output: SELECT `id`, `name`, `email` FROM `users`

  // Same query with PostgreSQL
  const pgGrammar = new PostgreSQLGrammar();
  const pgSql = pgGrammar.compileSelect(builder);
  console.log('PostgreSQL: ', pgSql);
  // Output: SELECT "id", "name", "email" FROM "users"

  // Same query with SQLite
  const sqliteGrammar = new SQLiteGrammar();
  const sqliteSql = sqliteGrammar.compileSelect(builder);
  console.log('SQLite:     ', sqliteSql);
  // Output: SELECT [id], [name], [email] FROM [users]
}

/**
 * Example 1.2: SELECT with WHERE Clause
 */
export function example_select_with_where() {
  console.log('\n=== Example 1.2: SELECT with WHERE Clause ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['id', 'name', 'email'])
    .from('users')
    .where('status', '=', 'active')
    .where('age', '>', 18);

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `id`, `name`, `email` FROM `users` WHERE `status` = ? AND `age` > ?
  // Parameters: ['active', 18]
}

/**
 * Example 1.3: SELECT with OR Conditions
 */
export function example_select_with_or() {
  console.log('\n=== Example 1.3: SELECT with OR Conditions ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['id', 'name', 'email'])
    .from('users')
    .where('status', '=', 'active')
    .orWhere('role', '=', 'admin');

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `id`, `name`, `email` FROM `users` WHERE `status` = ? OR `role` = ?
}

/**
 * Example 1.4: SELECT with LIMIT and OFFSET
 */
export function example_select_pagination() {
  console.log('\n=== Example 1.4: SELECT with Pagination ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['id', 'name', 'email'])
    .from('users')
    .where('status', '=', 'active')
    .orderBy('created_at', 'desc')
    .limit(10)
    .offset(20);

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `id`, `name`, `email` FROM `users` WHERE `status` = ?
  //         ORDER BY `created_at` DESC LIMIT 10 OFFSET 20
}

// ============================================================================
// EXAMPLE 2: JOINs and Complex Queries
// ============================================================================

/**
 * Example 2.1: INNER JOIN
 */
export function example_inner_join() {
  console.log('\n=== Example 2.1: INNER JOIN ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['users.id', 'users.name', 'orders.id as order_id', 'orders.total'])
    .from('users')
    .join('orders', 'users.id', '=', 'orders.user_id')
    .where('orders.total', '>', 100);

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `users`.`id`, `users`.`name`, `orders`.`id` as `order_id`, `orders`.`total`
  //         FROM `users` INNER JOIN `orders` ON `users`.`id` = `orders`.`user_id`
  //         WHERE `orders`.`total` > ?
}

/**
 * Example 2.2: LEFT JOIN with aggregation
 */
export function example_left_join_aggregation() {
  console.log('\n=== Example 2.2: LEFT JOIN with Aggregation ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['users.id', 'users.name', 'COUNT(orders.id) as order_count', 'SUM(orders.total) as total_spent'])
    .from('users')
    .leftJoin('orders', 'users.id', '=', 'orders.user_id')
    .groupBy('users.id', 'users.name')
    .having('order_count', '>', 0)
    .orderBy('total_spent', 'desc');

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `users`.`id`, `users`.`name`, COUNT(`orders`.`id`) as `order_count`,
  //         SUM(`orders`.`total`) as `total_spent` FROM `users`
  //         LEFT JOIN `orders` ON `users`.`id` = `orders`.`user_id`
  //         GROUP BY `users`.`id`, `users`.`name` HAVING `order_count` > ?
  //         ORDER BY `total_spent` DESC
}

/**
 * Example 2.3: Multiple JOINs
 */
export function example_multiple_joins() {
  console.log('\n=== Example 2.3: Multiple JOINs ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['users.name', 'orders.id', 'products.name as product_name', 'order_items.quantity'])
    .from('users')
    .join('orders', 'users.id', '=', 'orders.user_id')
    .join('order_items', 'orders.id', '=', 'order_items.order_id')
    .join('products', 'order_items.product_id', '=', 'products.id')
    .where('orders.status', '=', 'completed');

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Demonstrates chaining multiple JOIN operations
}

// ============================================================================
// EXAMPLE 3: INSERT Statements
// ============================================================================

/**
 * Example 3.1: Simple INSERT
 */
export function example_simple_insert() {
  console.log('\n=== Example 3.1: Simple INSERT ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();
  builder.from('users');

  const data = {
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active'
  };

  const sql = grammar.compileInsert(builder, data);
  console.log(sql);
  // Output: INSERT INTO `users` (`name`, `email`, `status`) VALUES (?, ?, ?)
  // Parameters: ['John Doe', 'john@example.com', 'active']
}

/**
 * Example 3.2: INSERT with timestamp
 */
export function example_insert_with_timestamp() {
  console.log('\n=== Example 3.2: INSERT with Timestamp ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();
  builder.from('users');

  const data = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sql = grammar.compileInsert(builder, data);
  console.log(sql);
  // Output: INSERT INTO `users` (`name`, `email`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?)
}

/**
 * Example 3.3: Batch INSERT (multiple rows)
 */
export function example_batch_insert() {
  console.log('\n=== Example 3.3: Batch INSERT ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();
  builder.from('users');

  // Multiple data rows - typically handled by the connection layer
  const dataRows = [
    { name: 'John', email: 'john@example.com', status: 'active' },
    { name: 'Jane', email: 'jane@example.com', status: 'active' },
    { name: 'Bob', email: 'bob@example.com', status: 'inactive' }
  ];

  // Grammar compiles single row; connection handles batching
  const sql = grammar.compileInsert(builder, dataRows[0]);
  console.log('Template SQL:', sql);
  // Parameters for each row would be handled by the connection
}

/**
 * Example 3.4: MySQL - INSERT ON DUPLICATE KEY UPDATE
 */
export function example_insert_on_duplicate_key() {
  console.log('\n=== Example 3.4: INSERT ON DUPLICATE KEY UPDATE (MySQL) ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();
  builder.from('user_scores');

  const data = {
    user_id: 1,
    score: 100,
    level: 5
  };

  const onDuplicate = {
    score: 'score + ?',  // Increment score
    level: '?'           // Set new level
  };

  const sql = grammar.compileInsert(builder, data, onDuplicate);
  console.log(sql);
  // Output: INSERT INTO `user_scores` (`user_id`, `score`, `level`) VALUES (?, ?, ?)
  //         ON DUPLICATE KEY UPDATE `score` = score + ?, `level` = ?
}

/**
 * Example 3.5: PostgreSQL - INSERT with RETURNING
 */
export function example_insert_with_returning() {
  console.log('\n=== Example 3.5: INSERT with RETURNING (PostgreSQL) ===');

  const grammar = new PostgreSQLGrammar();
  const builder = new Builder();
  builder.from('users');

  const data = {
    name: 'Alice',
    email: 'alice@example.com'
  };

  const sql = grammar.compileInsert(builder, data);
  console.log(sql);
  // Output: INSERT INTO "users" ("name", "email") VALUES (?, ?) RETURNING "id"
  // PostgreSQL automatically includes RETURNING clause
}

// ============================================================================
// EXAMPLE 4: UPDATE Statements
// ============================================================================

/**
 * Example 4.1: Simple UPDATE
 */
export function example_simple_update() {
  console.log('\n=== Example 4.1: Simple UPDATE ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('users')
    .where('id', '=', 1);

  const data = {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    updated_at: new Date().toISOString()
  };

  const sql = grammar.compileUpdate(builder, data);
  console.log(sql);
  // Output: UPDATE `users` SET `name` = ?, `email` = ?, `updated_at` = ? WHERE `id` = ?
}

/**
 * Example 4.2: UPDATE with multiple conditions
 */
export function example_update_multiple_conditions() {
  console.log('\n=== Example 4.2: UPDATE with Multiple Conditions ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('users')
    .where('status', '=', 'inactive')
    .where('last_login', '<', '2026-01-01');

  const data = {
    status: 'archived',
    reason: 'Inactive for 5 months'
  };

  const sql = grammar.compileUpdate(builder, data);
  console.log(sql);
  // Output: UPDATE `users` SET `status` = ?, `reason` = ?
  //         WHERE `status` = ? AND `last_login` < ?
}

/**
 * Example 4.3: UPDATE with calculation
 */
export function example_update_with_calculation() {
  console.log('\n=== Example 4.3: UPDATE with Calculation ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('user_scores')
    .where('user_id', '=', 1);

  const data = {
    score: 'score + ?',  // Calculated increment
    level: 'CASE WHEN score > ? THEN level + 1 ELSE level END'
  };

  const sql = grammar.compileUpdate(builder, data);
  console.log(sql);
  // Note: Raw calculation expressions need special handling at connection level
}

// ============================================================================
// EXAMPLE 5: DELETE Statements
// ============================================================================

/**
 * Example 5.1: Simple DELETE
 */
export function example_simple_delete() {
  console.log('\n=== Example 5.1: Simple DELETE ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('users')
    .where('id', '=', 1);

  const sql = grammar.compileDelete(builder);
  console.log(sql);
  // Output: DELETE FROM `users` WHERE `id` = ?
}

/**
 * Example 5.2: DELETE with multiple conditions
 */
export function example_delete_multiple_conditions() {
  console.log('\n=== Example 5.2: DELETE with Multiple Conditions ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('sessions')
    .where('expired_at', '<', new Date().toISOString())
    .where('status', '=', 'expired');

  const sql = grammar.compileDelete(builder);
  console.log(sql);
  // Output: DELETE FROM `sessions` WHERE `expired_at` < ? AND `status` = ?
}

/**
 * Example 5.3: DELETE with LIMIT (MySQL specific)
 */
export function example_delete_with_limit() {
  console.log('\n=== Example 5.3: DELETE with LIMIT (MySQL) ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('logs')
    .where('level', '=', 'debug')
    .limit(1000);

  const sql = grammar.compileDelete(builder);
  console.log(sql);
  // Output: DELETE FROM `logs` WHERE `level` = ? LIMIT 1000
}

// ============================================================================
// EXAMPLE 6: Database-Specific Features
// ============================================================================

/**
 * Example 6.1: MySQL - FOR UPDATE (Row Locking)
 */
export function example_mysql_for_update() {
  console.log('\n=== Example 6.1: MySQL - FOR UPDATE (Row Locking) ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['id', 'balance'])
    .from('accounts')
    .where('id', '=', 1)
    .lockForUpdate();

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `id`, `balance` FROM `accounts` WHERE `id` = ? FOR UPDATE
  // Used in transactions to prevent concurrent modifications
}

/**
 * Example 6.2: MySQL - LOCK IN SHARE MODE
 */
export function example_mysql_lock_in_share_mode() {
  console.log('\n=== Example 6.2: MySQL - LOCK IN SHARE MODE ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select(['id', 'balance'])
    .from('accounts')
    .where('id', '=', 1)
    .sharedLock();

  const sql = grammar.compileSelect(builder);
  console.log(sql);
  // Output: SELECT `id`, `balance` FROM `accounts` WHERE `id` = ? LOCK IN SHARE MODE
}

/**
 * Example 6.3: PostgreSQL - RETURNING with multiple columns
 */
export function example_postgresql_returning() {
  console.log('\n=== Example 6.3: PostgreSQL - RETURNING ===');

  const grammar = new PostgreSQLGrammar();
  const builder = new Builder();
  builder.from('users');

  const data = {
    name: 'Bob',
    email: 'bob@example.com',
    created_at: new Date().toISOString()
  };

  const sql = grammar.compileInsert(builder, data);
  console.log(sql);
  // Output: INSERT INTO "users" ("name", "email", "created_at") VALUES (?, ?, ?) RETURNING "id"
}

/**
 * Example 6.4: SQLite - LIMIT handling
 */
export function example_sqlite_limit() {
  console.log('\n=== Example 6.4: SQLite - LIMIT Handling ===');

  const grammar = new SQLiteGrammar();
  const builder = new Builder();

  builder
    .select(['*'])
    .from('users')
    .orderBy('created_at', 'desc');

  const sql = grammar.compileSelect(builder);
  console.log('Without explicit limit:', sql);
  // SQLite adds LIMIT -1 for unlimited results

  builder.limit(10);
  const sqlWithLimit = grammar.compileSelect(builder);
  console.log('With limit(10):       ', sqlWithLimit);
}

// ============================================================================
// EXAMPLE 7: Complex Real-World Scenarios
// ============================================================================

/**
 * Example 7.1: E-commerce Order Summary Report
 */
export function example_ecommerce_order_report() {
  console.log('\n=== Example 7.1: E-commerce Order Summary Report ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .select([
      'users.id',
      'users.name',
      'users.email',
      'COUNT(orders.id) as total_orders',
      'SUM(orders.total) as total_spent',
      'AVG(orders.total) as avg_order_value',
      'MAX(orders.created_at) as last_order_date'
    ])
    .from('users')
    .leftJoin('orders', 'users.id', '=', 'orders.user_id')
    .where('users.status', '=', 'active')
    .groupBy('users.id', 'users.name', 'users.email')
    .having('total_orders', '>', 0)
    .orderBy('total_spent', 'desc')
    .limit(100);

  const sql = grammar.compileSelect(builder);
  console.log(sql);
}

/**
 * Example 7.2: Content Management - Publishing Draft Articles
 */
export function example_publish_articles() {
  console.log('\n=== Example 7.2: Content Management - Publishing Articles ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  builder
    .from('articles')
    .where('status', '=', 'draft')
    .where('published_at', '!=', null)
    .where('author_id', '=', 5);

  const updateData = {
    status: 'published',
    updated_at: new Date().toISOString()
  };

  const sql = grammar.compileUpdate(builder, updateData);
  console.log(sql);
  // Output: UPDATE `articles` SET `status` = ?, `updated_at` = ?
  //         WHERE `status` = ? AND `published_at` != ? AND `author_id` = ?
}

/**
 * Example 7.3: Analytics - User Activity Tracking
 */
export function example_user_activity_insert() {
  console.log('\n=== Example 7.3: Analytics - User Activity Tracking ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();
  builder.from('user_activities');

  const activity = {
    user_id: 42,
    action: 'login',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0...',
    created_at: new Date().toISOString()
  };

  const sql = grammar.compileInsert(builder, activity);
  console.log(sql);
}

/**
 * Example 7.4: Data Cleanup - Remove old records
 */
export function example_cleanup_old_records() {
  console.log('\n=== Example 7.4: Data Cleanup - Remove Old Records ===');

  const grammar = new MySQLGrammar();
  const builder = new Builder();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  builder
    .from('temporary_files')
    .where('created_at', '<', thirtyDaysAgo)
    .where('status', '=', 'expired')
    .limit(10000);

  const sql = grammar.compileDelete(builder);
  console.log(sql);
  // Demonstrates safe deletion with time-based condition and limit
}

// ============================================================================
// EXAMPLE 8: Cross-Database Compatibility
// ============================================================================

/**
 * Example 8.1: Same query, different databases
 */
export function example_cross_database() {
  console.log('\n=== Example 8.1: Cross-Database Query Compilation ===');

  const builder = new Builder();
  builder
    .select(['id', 'name', 'email'])
    .from('users')
    .where('status', '=', 'active')
    .limit(10);

  const mysqlGrammar = new MySQLGrammar();
  const postgresGrammar = new PostgreSQLGrammar();
  const sqliteGrammar = new SQLiteGrammar();

  console.log('MySQL:      ', mysqlGrammar.compileSelect(builder));
  console.log('PostgreSQL: ', postgresGrammar.compileSelect(builder));
  console.log('SQLite:     ', sqliteGrammar.compileSelect(builder));

  // Notice the different identifier quoting and syntax variations
}

// ============================================================================
// EXAMPLE 9: Running All Examples
// ============================================================================

/**
 * Master function to run all examples
 */
export function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Grammar & Processors System - Comprehensive Examples         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // SELECT Examples
  example_basic_select();
  example_select_with_where();
  example_select_with_or();
  example_select_pagination();

  // JOIN Examples
  example_inner_join();
  example_left_join_aggregation();
  example_multiple_joins();

  // INSERT Examples
  example_simple_insert();
  example_insert_with_timestamp();
  example_batch_insert();
  example_insert_on_duplicate_key();
  example_insert_with_returning();

  // UPDATE Examples
  example_simple_update();
  example_update_multiple_conditions();
  example_update_with_calculation();

  // DELETE Examples
  example_simple_delete();
  example_delete_multiple_conditions();
  example_delete_with_limit();

  // Database-Specific Examples
  example_mysql_for_update();
  example_mysql_lock_in_share_mode();
  example_postgresql_returning();
  example_sqlite_limit();

  // Real-World Examples
  example_ecommerce_order_report();
  example_publish_articles();
  example_user_activity_insert();
  example_cleanup_old_records();

  // Cross-Database Examples
  example_cross_database();

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  All examples completed!                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

// Execute examples if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export default {
  runAllExamples,
  example_basic_select,
  example_select_with_where,
  example_select_with_or,
  example_select_pagination,
  example_inner_join,
  example_left_join_aggregation,
  example_multiple_joins,
  example_simple_insert,
  example_insert_with_timestamp,
  example_batch_insert,
  example_insert_on_duplicate_key,
  example_insert_with_returning,
  example_simple_update,
  example_update_multiple_conditions,
  example_update_with_calculation,
  example_simple_delete,
  example_delete_multiple_conditions,
  example_delete_with_limit,
  example_mysql_for_update,
  example_mysql_lock_in_share_mode,
  example_postgresql_returning,
  example_sqlite_limit,
  example_ecommerce_order_report,
  example_publish_articles,
  example_user_activity_insert,
  example_cleanup_old_records,
  example_cross_database
};
