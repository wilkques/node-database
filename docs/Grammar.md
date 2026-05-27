# Grammar System Documentation

The Grammar system is responsible for compiling query builders into database-specific SQL statements. It handles the translation of abstract query operations into concrete SQL syntax, accommodating the specific dialects and features of different database engines.

## Overview

The Grammar system provides a unified interface for generating SQL statements across multiple database systems (MySQL, PostgreSQL, SQLite). Each database has its own Grammar class that extends the base Grammar class, implementing database-specific SQL compilation logic.

### Key Components

- **Base Grammar** (`lib/queries/grammar/Grammar.js`) - Abstract base class defining the compilation interface
- **MySQLGrammar** (`lib/queries/grammar/MySQLGrammar.js`) - MySQL-specific SQL generation
- **PostgreSQLGrammar** (`lib/queries/grammar/PostgreSQLGrammar.js`) - PostgreSQL-specific SQL generation
- **SQLiteGrammar** (`lib/queries/grammar/SQLiteGrammar.js`) - SQLite-specific SQL generation

## Basic Usage

### Simple SELECT Query

```javascript
import MySQLGrammar from "./lib/queries/grammar/MySQLGrammar.js";
import Builder from "./lib/queries/Builder.js";

const grammar = new MySQLGrammar();
const builder = new Builder();

builder
  .select(["id", "name", "email"])
  .from("users")
  .where("status", "=", "active");

const sql = grammar.compileSelect(builder);
console.log(sql);
// Output: SELECT `id`, `name`, `email` FROM `users` WHERE `status` = ?
```

### INSERT Statement

```javascript
const builder = new Builder();
builder.from("users");

const data = {
  name: "John Doe",
  email: "john@example.com",
  created_at: new Date(),
};

const sql = grammar.compileInsert(builder, data);
console.log(sql);
// Output: INSERT INTO `users` (`name`, `email`, `created_at`) VALUES (?, ?, ?)
```

### UPDATE Statement

```javascript
const builder = new Builder();
builder.from("users").where("id", "=", 1);

const data = {
  name: "Jane Doe",
  updated_at: new Date(),
};

const sql = grammar.compileUpdate(builder, data);
console.log(sql);
// Output: UPDATE `users` SET `name` = ?, `updated_at` = ? WHERE `id` = ?
```

### DELETE Statement

```javascript
const builder = new Builder();
builder.from("users").where("status", "=", "inactive");

const sql = grammar.compileDelete(builder);
console.log(sql);
// Output: DELETE FROM `users` WHERE `status` = ?
```

## Database-Specific Features

### MySQL Grammar

MySQL Grammar provides support for MySQL-specific SQL features and dialect:

#### Backtick Identifier Quoting

All identifiers (table names, column names) are wrapped in backticks to prevent conflicts with reserved keywords:

```javascript
// SELECT `id`, `name` FROM `users`
```

#### ON DUPLICATE KEY UPDATE

MySQL's `ON DUPLICATE KEY UPDATE` clause allows insert-or-update operations:

```javascript
const data = {
  id: 1,
  email: "john@example.com",
  visits: 5,
};

const updates = {
  visits: "visits + 1",
};

const sql = grammar.compileInsert(builder, data, updates);
// INSERT INTO `users` (`id`, `email`, `visits`) VALUES (?, ?, ?)
// ON DUPLICATE KEY UPDATE `visits` = visits + 1
```

#### Locking Clauses

MySQL supports explicit locking for concurrent transactions:

```javascript
builder.select(["*"]).from("users").where("id", "=", 1).lockForUpdate(); // Adds FOR UPDATE clause

const sql = grammar.compileSelect(builder);
// SELECT * FROM `users` WHERE `id` = ? FOR UPDATE
```

#### LIMIT/OFFSET Handling

MySQL uses `LIMIT` and `OFFSET` keywords for result pagination:

```javascript
builder.select(["*"]).from("users").limit(10).offset(20);

const sql = grammar.compileSelect(builder);
// SELECT * FROM `users` LIMIT 10 OFFSET 20
```

### PostgreSQL Grammar

PostgreSQL Grammar provides support for PostgreSQL-specific features:

#### Double-Quote Identifier Quoting

All identifiers are wrapped in double quotes:

```javascript
// SELECT "id", "name" FROM "users"
```

#### RETURNING Clause

PostgreSQL's `RETURNING` clause returns the inserted or modified rows:

```javascript
const data = {
  name: "Jane Doe",
  email: "jane@example.com",
};

const sql = grammar.compileInsert(builder, data);
// INSERT INTO "users" ("name", "email") VALUES (?, ?) RETURNING "id"
```

#### Standard LIMIT/OFFSET

PostgreSQL uses the same `LIMIT` and `OFFSET` syntax as MySQL but with consistent semantics:

```javascript
builder.select(["*"]).from("users").limit(10).offset(20);

// SELECT * FROM "users" LIMIT 10 OFFSET 20
```

#### Array and JSON Type Support

PostgreSQL Grammar recognizes and properly handles array and JSON data types:

```javascript
// Array type columns: tags (text[])
// JSON type columns: metadata (json or jsonb)
```

### SQLite Grammar

SQLite Grammar provides support for SQLite's simpler feature set:

#### Square Bracket Identifier Quoting

All identifiers are wrapped in square brackets:

```javascript
// SELECT [id], [name] FROM [users]
```

#### Infinite LIMIT Handling

SQLite uses `-1` to represent an infinite limit (no limit):

```javascript
builder.select(["*"]).from("users");

// If no explicit limit is set, uses: LIMIT -1
```

#### Simplified Type System

SQLite uses a simplified type system with dynamic typing:

```javascript
// SQLite recognizes: INTEGER, REAL, TEXT, BLOB, NULL
```

## Core Methods

### Base Grammar Methods

#### `compileSelect(query)`

Compiles a SELECT query into SQL.

**Parameters:**

- `query` (Builder) - Query builder instance

**Returns:** (string) Compiled SQL statement

**Example:**

```javascript
const sql = grammar.compileSelect(builder);
```

#### `compileInsert(query, data, onDuplicate)`

Compiles an INSERT query into SQL.

**Parameters:**

- `query` (Builder) - Query builder instance
- `data` (object) - Data to insert
- `onDuplicate` (object, optional) - MySQL: update clause for duplicate keys

**Returns:** (string) Compiled SQL statement

**Example:**

```javascript
const sql = grammar.compileInsert(builder, { name: "John" });
```

#### `compileUpdate(query, data)`

Compiles an UPDATE query into SQL.

**Parameters:**

- `query` (Builder) - Query builder instance
- `data` (object) - Data to update

**Returns:** (string) Compiled SQL statement

**Example:**

```javascript
const sql = grammar.compileUpdate(builder, { name: "Jane" });
```

#### `compileDelete(query)`

Compiles a DELETE query into SQL.

**Parameters:**

- `query` (Builder) - Query builder instance

**Returns:** (string) Compiled SQL statement

**Example:**

```javascript
const sql = grammar.compileDelete(builder);
```

#### `arrayNested(array, callback)`

Processes an array with a transformation callback for each element.

**Parameters:**

- `array` (array) - Array to process
- `callback` (function) - Transformation function

**Returns:** (string) Joined result

**Example:**

```javascript
const parts = grammar.arrayNested(["id", "name"], (col) => `\`${col}\``);
// Returns: `id`, `name`
```

#### `contactBacktick(value)`

Formats an identifier with database-specific quotation marks.

**Parameters:**

- `value` (string) - Identifier to wrap

**Returns:** (string) Wrapped identifier

**Example:**

```javascript
const quoted = grammar.contactBacktick("users");
// MySQL: `users`
// PostgreSQL: "users"
// SQLite: [users]
```

### Database-Specific Methods

#### `wrapValue(value)`

Wraps an identifier or value with database-specific formatting.

**Parameters:**

- `value` (string) - Value to wrap

**Returns:** (string) Wrapped value

**Example:**

```javascript
const wrapped = grammar.wrapValue("user_id");
```

#### `getColumnFormat(column)`

Returns a formatted column reference with proper quoting.

**Parameters:**

- `column` (string) - Column name

**Returns:** (string) Formatted column

**Example:**

```javascript
const formatted = grammar.getColumnFormat("users.id");
// MySQL: `users`.`id`
```

#### `compileLimit(query)`

Generates a database-specific LIMIT clause.

**Parameters:**

- `query` (Builder) - Query builder instance

**Returns:** (string) LIMIT clause or empty string

**Example:**

```javascript
const limit = grammar.compileLimit(builder);
// MySQL/PostgreSQL: LIMIT 10 OFFSET 20
// SQLite: LIMIT 10 OFFSET 20
```

#### `lockForUpdate()`

Generates a lock clause for row-level locking (MySQL only).

**Returns:** (string) Lock clause

**Example:**

```javascript
const lock = grammar.lockForUpdate();
// FOR UPDATE
```

## Advanced Usage

### Complex SELECT with JOINs

```javascript
const builder = new Builder();
builder
  .select(["users.id", "users.name", "orders.total"])
  .from("users")
  .join("orders", "users.id", "=", "orders.user_id")
  .where("orders.total", ">", 100)
  .orderBy("orders.created_at", "desc")
  .limit(20);

const sql = grammar.compileSelect(builder);
```

### Aggregation Queries

```javascript
const builder = new Builder();
builder
  .select(["users.name", "COUNT(*) as order_count"])
  .from("users")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .groupBy("users.id", "users.name")
  .having("order_count", ">", 5);

const sql = grammar.compileSelect(builder);
```

### Subqueries

```javascript
const subquery = new Builder()
  .select(["user_id", "MAX(total) as max_total"])
  .from("orders")
  .groupBy("user_id");

const builder = new Builder();
builder.select(["*"]).from("users").whereIn("id", subquery);

const sql = grammar.compileSelect(builder);
```

## Best Practices

1. **Always Use Builders** - Never manually construct SQL; use the Builder API to ensure proper escaping and formatting
2. **Database Abstraction** - Switch grammar implementations based on configuration, not hard-coded references
3. **Parameterized Queries** - Grammar outputs prepared statements with `?` placeholders for safe execution
4. **Consistent Escaping** - Grammar handles all identifier and value escaping; don't do it manually
5. **Performance Consideration** - Grammar compilation is fast; no need to cache compiled statements

## Troubleshooting

## Raw SQL Expression Handling

The Grammar system properly handles raw SQL expressions to prevent unnecessary identifier wrapping and formatting issues.

### ORDER BY Raw SQL

When using `orderByRaw()`, the Grammar system recognizes raw SQL expressions and processes them correctly:

```javascript
// Raw ORDER BY with subquery - handled correctly
const query = builder
  .table("users")
  .orderByRaw("(SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) DESC");

// Generated SQL (MySQL):
// SELECT * FROM `users` 
// ORDER BY (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) DESC
```

### Key Improvements (v1.0.1)

- **Raw Expression Detection**: The Grammar system now properly identifies raw SQL expressions
- **No Identifier Wrapping**: Raw SQL expressions are not wrapped with database-specific identifiers  
- **No Direction Appending**: Raw ORDER BY expressions maintain their specified direction without additional modification
- **Subquery Support**: Complex subqueries in ORDER BY clauses are preserved exactly as written

### Implementation Details

The Grammar system uses an `isRaw` flag to determine processing behavior:

```javascript
// Internal Grammar processing
const orders = query.queries.orders.queries.map((order) => {
  const column = order.isRaw ? order.column : this.wrap(order.column);
  const direction = order.isRaw ? "" : ` ${(order.direction || "ASC").toUpperCase()}`;
  return `${column}${direction}`;
});
```

This ensures that raw SQL expressions maintain their intended formatting while regular column names receive proper database-specific quoting.

---

### Common Issues

**Identifier Not Quoted**

- Problem: Column names conflict with SQL keywords
- Solution: Grammar automatically quotes identifiers; ensure you're using the grammar system

**Type Conversion Issues**

- Problem: Data types not matching database expectations
- Solution: Use Processors (see Processors.md) to handle type conversion

**SQL Syntax Errors**

- Problem: Invalid SQL being generated
- Solution: Check your Builder configuration; ensure where/join conditions are properly constructed

## Examples

For practical, executable examples demonstrating Grammar usage with all major features, see `grammar-usage.js` in the examples directory.
