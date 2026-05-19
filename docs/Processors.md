# Processors System Documentation

The Processors system is responsible for post-processing query results returned from the database. It handles type conversion, data formatting, and result restructuring to provide JavaScript-native data types and structures. Each database engine has its own Processor class that understands the specific data types and representations used by that database.

## Overview

The Processor system transforms raw database query results into properly typed JavaScript objects. This includes converting database-specific type representations to JavaScript equivalents, handling auto-increment ID retrieval, processing metadata, and formatting output for various use cases.

### Key Components

- **Base Processor** (`lib/queries/processors/Processor.js`) - Abstract base class defining the processing interface
- **MySQLProcessor** (`lib/queries/processors/MySQLProcessor.js`) - MySQL-specific result processing
- **PostgreSQLProcessor** (`lib/queries/processors/PostgreSQLProcessor.js`) - PostgreSQL-specific result processing
- **SQLiteProcessor** (`lib/queries/processors/SQLiteProcessor.js`) - SQLite-specific result processing

## Basic Usage

### Processing SELECT Results

```javascript
import MySQLProcessor from "./lib/queries/processors/MySQLProcessor.js";
import Connection from "./lib/Connection.js";

const connection = new Connection({
  /* config */
});
const processor = new MySQLProcessor();

// Execute query and process results
const result = await connection.select("SELECT * FROM users");
const processedResults = processor.processSelect(result, connection.fields);

console.log(processedResults);
// [ { id: 1, name: 'John', active: true, created_at: Date }, ... ]
```

### Processing INSERT Results

```javascript
// Simple INSERT
const result = await connection.insert("INSERT INTO users ...");
const processed = processor.processInsert(result);

// INSERT and get the auto-increment ID
const id = await connection.insertGetId("INSERT INTO users ...", [], "id");
console.log(id); // The generated ID
```

### Processing UPDATE Results

```javascript
const result = await connection.update("UPDATE users SET ...");
const affected = processor.processUpdate(result);
console.log(affected.affectedRows); // Number of affected rows
```

### Processing DELETE Results

```javascript
const result = await connection.delete("DELETE FROM users ...");
const deleted = processor.processDelete(result);
console.log(deleted.affectedRows); // Number of deleted rows
```

## Type Processing Details

### MySQL Type Processing

MySQL has specific data types that require conversion to JavaScript equivalents:

#### Boolean Conversion (TINYINT(1))

TINYINT(1) columns are commonly used for boolean values in MySQL:

```javascript
// Database: status TINYINT(1) - stored as 0 or 1
const raw = { id: 1, status: 1 };

const processed = processor.processValue(raw.status, "TINYINT(1)");
console.log(processed); // true

const processed2 = processor.processValue(0, "TINYINT(1)");
console.log(processed2); // false
```

#### DateTime to Date Objects

DATETIME and TIMESTAMP columns are converted to JavaScript Date objects:

```javascript
// Database: created_at DATETIME - stored as '2026-05-15 10:30:00'
const raw = { id: 1, created_at: "2026-05-15 10:30:00" };

const processed = processor.processValue(raw.created_at, "DATETIME");
console.log(processed instanceof Date); // true
console.log(processed.toISOString()); // '2026-05-15T10:30:00.000Z'
```

#### JSON Column Processing

JSON columns are automatically parsed from strings to objects:

```javascript
// Database: metadata JSON - stored as '{"tags":["vip","premium"]}'
const raw = { id: 1, metadata: '{"tags":["vip","premium"]}' };

const processed = processor.processValue(raw.metadata, "JSON");
console.log(processed); // { tags: ['vip', 'premium'] }
console.log(typeof processed); // 'object'
```

#### DECIMAL to Number

DECIMAL columns are converted to JavaScript numbers:

```javascript
// Database: price DECIMAL(10,2) - stored as '99.99'
const raw = { id: 1, price: "99.99" };

const processed = processor.processValue(raw.price, "DECIMAL(10,2)");
console.log(processed); // 99.99
console.log(typeof processed); // 'number'
```

#### Auto-Increment ID Handling

When inserting records and retrieving the auto-increment ID:

```javascript
// Execute INSERT
const result = await connection.insert("INSERT INTO users (name) VALUES (?)");

// MySQL returns: { insertId: 42, affectedRows: 1 }
const processedId = processor.processInsertGetId(
  result,
  connection.lastInsertId,
);
console.log(processedId); // 42
```

### PostgreSQL Type Processing

PostgreSQL has rich data types with specific handling requirements:

#### Array Types

PostgreSQL array types (marked with `[]` in type signature) are converted to JavaScript arrays:

```javascript
// Database: tags TEXT[] - stored in PostgreSQL's array format
const raw = { id: 1, tags: ["vip", "premium", "beta"] };

const processed = processor.processValue(raw.tags, "TEXT[]");
console.log(Array.isArray(processed)); // true
console.log(processed); // ['vip', 'premium', 'beta']
```

#### JSON/JSONB Processing

PostgreSQL's JSON and JSONB types are parsed to JavaScript objects:

```javascript
// Database: metadata JSONB - stored as {'nested': {'value': true}}
const raw = { id: 1, metadata: { nested: { value: true } } };

const processed = processor.processValue(raw.metadata, "JSONB");
console.log(processed.nested.value); // true
```

#### UUID Handling

PostgreSQL's UUID type is preserved as a string:

```javascript
// Database: user_id UUID - stored as '550e8400-e29b-41d4-a716-446655440000'
const raw = { user_id: "550e8400-e29b-41d4-a716-446655440000" };

const processed = processor.processValue(raw.user_id, "UUID");
console.log(typeof processed); // 'string'
```

#### RETURNING Clause Support

PostgreSQL's RETURNING clause returns the inserted/updated rows directly:

```javascript
// Query: INSERT INTO users (...) VALUES (...) RETURNING id, name, email
const result = await connection.insert(query);

// Result already contains the returned rows
const processed = processor.processSelect(result, connection.fields);
console.log(processed); // [ { id: 42, name: 'John', email: '...' } ]
```

### SQLite Type Processing

SQLite uses a simplified type system with dynamic typing:

#### String to Number Conversion

SQLite stores numbers as strings, requiring conversion based on column type:

```javascript
// Database: age INTEGER - stored as '25' (string)
const raw = { id: "1", name: "John", age: "25" };

const processedAge = processor.processValue(raw.age, "INTEGER");
console.log(processedAge); // 25
console.log(typeof processedAge); // 'number'
```

#### Boolean Conversion (1/0)

SQLite uses 1 and 0 for boolean values:

```javascript
// Database: active INTEGER - stored as 1 or 0
const raw = { id: 1, active: 1 };

const processed = processor.processValue(raw.active, "BOOLEAN");
console.log(processed); // true

const processed2 = processor.processValue(0, "BOOLEAN");
console.log(processed2); // false
```

#### rowid Handling

SQLite's implicit `rowid` is used for auto-increment values:

```javascript
// Query: INSERT INTO users (name) VALUES (?)
const result = await connection.insert(query);

// SQLite returns: { insertId: 42, changes: 1 }
const id = processor.processInsertGetId(result, connection.lastInsertId);
console.log(id); // 42
```

## Core Methods

### Base Processor Methods

#### `processSelect(result, columns)`

Processes SELECT query results, converting all values to proper JavaScript types.

**Parameters:**

- `result` (array) - Raw result rows from database
- `columns` (array) - Column metadata including types

**Returns:** (array) Processed rows with typed values

**Example:**

```javascript
const rows = processor.processSelect(rawResult, connection.fields);
```

#### `processInsert(result)`

Processes INSERT query results.

**Parameters:**

- `result` (object) - Raw result from database

**Returns:** (object) Result object with insertId and affectedRows

**Example:**

```javascript
const insertResult = processor.processInsert(result);
console.log(insertResult.insertId);
```

#### `processUpdate(result)`

Processes UPDATE query results.

**Parameters:**

- `result` (object) - Raw result from database

**Returns:** (object) Result object with affectedRows

**Example:**

```javascript
const updateResult = processor.processUpdate(result);
console.log(updateResult.affectedRows);
```

#### `processDelete(result)`

Processes DELETE query results.

**Parameters:**

- `result` (object) - Raw result from database

**Returns:** (object) Result object with affectedRows

**Example:**

```javascript
const deleteResult = processor.processDelete(result);
console.log(deleteResult.affectedRows);
```

#### `processValue(value, type)`

Processes a single value based on its database type.

**Parameters:**

- `value` (any) - Value to process
- `type` (string) - Database type string

**Returns:** (any) Converted value

**Example:**

```javascript
const boolValue = processor.processValue(1, "TINYINT(1)");
const date = processor.processValue("2026-05-15 10:30:00", "DATETIME");
```

#### `processColumns(fields)`

Processes column metadata from query results.

**Parameters:**

- `fields` (array) - Column metadata from driver

**Returns:** (array) Standardized column metadata

**Example:**

```javascript
const columns = processor.processColumns(connection.fields);
```

### Specialized Methods

#### `processInsertGetId(query, values, sequence)`

Processes an INSERT query and returns the generated ID.

**Parameters:**

- `query` (string) - SQL INSERT query
- `values` (array) - Query parameters
- `sequence` (string, optional) - Sequence name for PostgreSQL

**Returns:** (number|string) Generated ID

**Example:**

```javascript
const id = await processor.processInsertGetId(insertQuery, [values], null);
```

#### `getTypeConverter(type)`

Returns a converter function for a specific database type.

**Parameters:**

- `type` (string) - Database type string

**Returns:** (function) Converter function

**Example:**

```javascript
const converter = processor.getTypeConverter("TINYINT(1)");
const bool = converter(1); // true
```

#### `formatResults(results, format)`

Formats results in different output formats.

**Parameters:**

- `results` (array) - Result rows
- `format` (string) - Format type: 'json', 'csv', 'table'

**Returns:** (string) Formatted output

**Example:**

```javascript
const json = processor.formatResults(results, "json");
const csv = processor.formatResults(results, "csv");
```

#### `toCsv(results, headers)`

Converts results to CSV format.

**Parameters:**

- `results` (array) - Result rows
- `headers` (array, optional) - Column headers

**Returns:** (string) CSV formatted string

**Example:**

```javascript
const csv = processor.toCsv(results, ["id", "name", "email"]);
```

#### `toTable(results)`

Converts results to a formatted table string.

**Parameters:**

- `results` (array) - Result rows

**Returns:** (string) Table formatted string

**Example:**

```javascript
const table = processor.toTable(results);
console.log(table);
// +----+-------+-------------------+
// | id | name  | email             |
// +----+-------+-------------------+
// | 1  | John  | john@example.com  |
// +----+-------+-------------------+
```

## Advanced Usage

### Processing Complex Result Sets

```javascript
// Execute complex query
const query = `
  SELECT u.id, u.name, COUNT(o.id) as order_count,
         SUM(o.total) as total_spent, MAX(o.created_at) as last_order
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  GROUP BY u.id
`;

const rawResults = await connection.select(query);
const processed = processor.processSelect(rawResults, connection.fields);

console.log(processed[0]);
// {
//   id: 1,
//   name: 'John Doe',
//   order_count: 5,
//   total_spent: 499.99,
//   last_order: Date(2026-05-15T...)
// }
```

### Batch INSERT with ID Retrieval

```javascript
const insertQueries = [
  'INSERT INTO users (name, email) VALUES (?, ?)',
  'INSERT INTO users (name, email) VALUES (?, ?)',
  'INSERT INTO users (name, email) VALUES (?, ?)'
];

const ids = [];
for (const query of insertQueries) {
  const result = await connection.insert(query, [...]);
  const id = processor.processInsertGetId(result, connection.lastInsertId);
  ids.push(id);
}

console.log(ids); // [42, 43, 44]
```

### Processing with Column Metadata

```javascript
// Get full result with column information
const result = await connection.select("SELECT * FROM users WHERE active = ?", [
  true,
]);
const columns = processor.processColumns(connection.fields);

// Processed results with type information
const processed = processor.processSelect(result, columns);

// Generate report
const report = {
  totalRows: processed.length,
  columns: columns.map((c) => ({ name: c.name, type: c.type })),
  data: processed,
};

console.log(JSON.stringify(report, null, 2));
```

## Output Formatting Examples

### JSON Format

```javascript
const json = processor.formatResults(results, "json");
// [
//   { "id": 1, "name": "John", "email": "john@example.com" },
//   { "id": 2, "name": "Jane", "email": "jane@example.com" }
// ]
```

### CSV Format

```javascript
const csv = processor.toCsv(results);
// id,name,email
// 1,John Doe,john@example.com
// 2,Jane Smith,jane@example.com
```

### Table Format

```javascript
const table = processor.toTable(results);
// ┌────┬───────────┬──────────────────────┐
// │ id │ name      │ email                │
// ├────┼───────────┼──────────────────────┤
// │ 1  │ John Doe  │ john@example.com     │
// │ 2  │ Jane Smith│ jane@example.com     │
// └────┴───────────┴──────────────────────┘
```

## Best Practices

1. **Always Use Processors** - Let the processor handle type conversion; don't do manual conversions
2. **Preserve Type Information** - Keep column metadata from the driver for accurate type conversion
3. **Understand Database Types** - Each database represents types differently; let the processor handle these differences
4. **Test Type Conversion** - Especially for edge cases like NULL values, empty strings, and zero values
5. **Chain with Grammar** - Use Grammar for SQL generation and Processors for result handling

## Troubleshooting

### Common Issues

**Type Not Converting**

- Problem: Database values not being converted to expected types
- Solution: Ensure column metadata is available and types are correctly identified

**NULL Values Becoming False/0**

- Problem: NULL values being converted instead of preserved
- Solution: Processor should preserve NULL; check type converter implementation

**JSON Parse Errors**

- Problem: JSON columns failing to parse
- Solution: Ensure JSON is valid before insertion; check column type definition

**Performance Issues**

- Problem: Processing large result sets is slow
- Solution: Process only needed columns; consider streaming for very large results

## Examples

For practical, executable examples demonstrating Processors usage with all major features, see `grammar-usage.js` in the examples directory.
