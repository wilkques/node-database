# Builder Class API Documentation

## Overview

The `Builder` class implements a fluent query API, supporting method chaining to build complex database queries. It provides all necessary methods for SELECT, WHERE, ORDER BY, LIMIT and other SQL operations, enabling developers to build database queries with elegant chained syntax.

### Key Features

- 🔗 **Method Chaining** - Fluent API design with unlimited method chaining
- 🛡️ **Parameter Binding** - Automatic SQL injection prevention
- 📊 **Aggregate Functions** - Support for COUNT, MAX, MIN, AVG, SUM, etc.
- 🔄 **Subquery Support** - Support for nested queries and complex conditions
- ⚙️ **Multi-Database Compatibility** - Unified API for MySQL, PostgreSQL, SQLite
- 🎯 **Type Safe** - Complete JSDoc annotations and type definitions
- 📝 **Data Modification** - Complete data operations including insert, update, delete, increment, decrement

## Core Query Methods

### select()

Select columns to retrieve. Accepts various input formats and supports raw SQL expressions.

#### Syntax

```javascript
select(columns);
```

#### Parameters

| Parameter | Type                       | Required | Description                                                                                                                                                                                                                                  |
| --------- | -------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns` | `Array\|string\|...string` | ✅       | Columns to select. Supports:<br/>- String: 'col1, col2, col3' (comma-separated)<br/>- Array: ['col1', 'col2', 'col3']<br/>- Multiple arguments: .select('col1', 'col2', 'col3')<br/>- Raw expressions: .select(db.raw('COUNT(\*) as total')) |

#### Return Value

`Builder` - Returns query builder instance for method chaining

#### Exceptions

| Exception Type | Trigger Condition         | Solution                                          |
| -------------- | ------------------------- | ------------------------------------------------- |
| `Error`        | Invalid columns parameter | Ensure column names are in string or array format |

#### Usage Examples

**String format (comma-separated):**

```javascript
db.table("users").select("id, name, email").get();
```

**Array format (recommended):**

```javascript
db.table("users").select(["id", "name", "email"]).get();
```

**Multiple parameters format:**

```javascript
db.table("users").select("id", "name", "email").get();
```

**Raw SQL expressions:**

```javascript
db.table("orders")
  .select("id", db.raw("COUNT(*) as total"))
  .groupBy("user_id")
  .get();
```

---

### where()

Add WHERE clause to filter query results. Supports multiple calling methods including simple comparisons, nested conditions, and subqueries.

#### Syntax

```javascript
where(column, [operator], [value], [andOr]);
```

#### Parameters

| Parameter  | Type                               | Required | Default | Description                                                                                                                                                                                                                                                               |
| ---------- | ---------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `column`   | `string\|Array\|Function\|Builder` | ✅       | -       | Filter condition. Supports:<br/>- String: column name (e.g., 'email', 'age')<br/>- Array: multiple conditions [['col1', '=', 'val1'], ['col2', '>', 'val2']]<br/>- Function: nested condition callback for grouping<br/>- Builder: subquery                               |
| `operator` | `string`                           | ❌       | null    | Comparison operator. Supports:<br/>- Equality: '=', '<>', '!='<br/>- Comparison: '>', '>=', '<', '<='<br/>- Pattern: 'LIKE', 'NOT LIKE'<br/>- Range: 'IN', 'NOT IN', 'BETWEEN'<br/>- Null: 'IS NULL', 'IS NOT NULL'<br/>- Defaults to '=' when omitted (2-parameter call) |
| `value`    | `any`                              | ❌       | null    | Comparison value. Supports:<br/>- Primitive values: string, number, boolean, null<br/>- Builder: subquery<br/>- Function: subquery callback<br/>- db.raw(): raw SQL expressions                                                                                           |
| `andOr`    | `string`                           | ❌       | 'and'   | Logical operator ('and' or 'or') to combine with previous condition                                                                                                                                                                                                       |

#### Return Value

`Builder` - Returns query builder instance for method chaining

#### Usage Examples

**Simple equality:**

```javascript
db.table("users").where("status", "=", "active").get();
```

**Implicit equality operator (2-parameter call):**

```javascript
db.table("users").where("status", "active").get();
```

**Comparison operators:**

```javascript
db.table("products").where("price", ">", 100).where("stock", ">=", 10).get();
```

---

### whereIn()

Filter rows where column value is in a given array of values.

#### Syntax

```javascript
whereIn(column, values, [andOr]);
```

#### Usage Examples

```javascript
db.table("users").whereIn("id", [1, 2, 3, 4, 5]).get();

db.table("products")
  .whereIn("category_id", [10, 20, 30])
  .where("status", "active")
  .get();
```

---

### orderBy()

Add ORDER BY clause to sort query results.

#### Syntax

```javascript
orderBy(column, [direction]);
```

#### Parameters

| Parameter   | Type     | Required | Default | Description                     |
| ----------- | -------- | -------- | ------- | ------------------------------- |
| `column`    | `string` | ✅       | -       | Column name to sort by          |
| `direction` | `string` | ❌       | `'asc'` | Sort direction: 'asc' or 'desc' |

#### Usage Examples

```javascript
db.table("users").orderBy("created_at", "desc").get();

db.table("products").orderBy("price").orderBy("name", "asc").get();
```

---

### limit()

Limit the number of results returned.

#### Syntax

```javascript
limit(count);
```

#### Usage Examples

```javascript
db.table("users").limit(10).get();
```

---

### offset()

Skip a number of results.

#### Syntax

```javascript
offset(count);
```

#### Usage Examples

```javascript
db.table("users").offset(20).limit(10).get();
```

---

### groupBy()

Add GROUP BY clause for aggregation.

#### Syntax

```javascript
groupBy(columns);
```

#### Usage Examples

```javascript
db.table("orders")
  .select("user_id", db.raw("COUNT(*) as order_count"))
  .groupBy("user_id")
  .get();
```

---

### having()

Add HAVING clause for filtering grouped results.

#### Syntax

```javascript
having(column, [operator], [value]);
```

#### Usage Examples

```javascript
db.table("orders")
  .select("user_id", db.raw("COUNT(*) as order_count"))
  .groupBy("user_id")
  .having("order_count", ">", 5)
  .get();
```

---

## JOIN Methods

### join()

Add INNER JOIN clause.

#### Syntax

```javascript
join(table, first, [operator], second);
```

#### Usage Examples

```javascript
db.table("users")
  .join("orders", "users.id", "=", "orders.user_id")
  .select("users.name", "orders.total")
  .get();
```

### leftJoin()

Add LEFT JOIN clause.

#### Usage Examples

```javascript
db.table("users")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .select("users.name", "orders.total")
  .get();
```

---

## Aggregate Functions

### count()

Count rows.

#### Usage Examples

```javascript
const total = await db.table("users").count();
const activeUsers = await db.table("users").where("status", "active").count();
```

### max()

Get maximum value.

#### Usage Examples

```javascript
const maxPrice = await db.table("products").max("price");
```

### min()

Get minimum value.

#### Usage Examples

```javascript
const minPrice = await db.table("products").min("price");
```

### sum()

Sum values.

#### Usage Examples

```javascript
const totalSales = await db.table("orders").sum("total");
```

### avg()

Calculate average.

#### Usage Examples

```javascript
const avgPrice = await db.table("products").avg("price");
```

---

## Conditional Expressions (CASE WHEN)

### case()

Create CASE WHEN conditional expressions for dynamic value selection.

#### Basic CASE

```javascript
const users = await db
  .table("users")
  .select(
    "name",
    "email",
    db
      .case("status")
      .when("active", "Active")
      .when("inactive", "Inactive")
      .when("banned", "Banned")
      .else("Unknown")
      .end("status_text"),
  )
  .get();
```

#### Conditional CASE

```javascript
const orders = await db
  .table("orders")
  .select(
    "id",
    "total",
    db
      .case()
      .when((q) => q.where("total", ">", 1000), "Large Order")
      .when((q) => q.where("total", ">", 500), "Medium Order")
      .else("Small Order")
      .end("order_type"),
  )
  .get();
```

#### CASE in UPDATE

```javascript
await db.table("products").update({
  status: db
    .case("inventory")
    .when(0, "Out of Stock")
    .when((q) => q.where("inventory", "<", 10), "Low Stock")
    .else("In Stock")
    .end(),
});
```

---

## Data Modification Methods

### insert()

Insert new records.

#### Usage Examples

```javascript
// Single record
const result = await db.table("users").insert({
  name: "John Doe",
  email: "john@example.com",
  created_at: new Date(),
});

// Multiple records
await db.table("users").insert([
  { name: "User 1", email: "user1@example.com" },
  { name: "User 2", email: "user2@example.com" },
]);
```

### update()

Update existing records.

#### Usage Examples

```javascript
await db.table("users").where("id", 1).update({
  name: "Jane Doe",
  updated_at: new Date(),
});
```

### delete()

Delete records.

#### Usage Examples

```javascript
await db.table("users").where("status", "inactive").delete();
```

### increment()

Increment a numeric column.

#### Usage Examples

```javascript
await db.table("posts").where("id", 1).increment("view_count", 1);
```

### decrement()

Decrement a numeric column.

#### Usage Examples

```javascript
await db.table("products").where("id", 1).decrement("stock", 1);
```

---

## Execution Methods

### get()

Execute the query and return all results.

#### Usage Examples

```javascript
const users = await db.table("users").get();
const activeUsers = await db.table("users").where("status", "active").get();
```

### first()

Execute the query and return the first result.

#### Usage Examples

```javascript
const user = await db.table("users").where("id", 1).first();
```

### find()

Find a record by its primary key.

#### Usage Examples

```javascript
const user = await db.table("users").find(1);
```

---

## Transaction Support

### transaction()

Execute queries within a transaction.

#### Usage Examples

```javascript
const transaction = await db.transaction();

try {
  await transaction.table("users").insert({
    name: "John Doe",
    email: "john@example.com",
  });

  await transaction.table("orders").insert({
    user_id: 1,
    total: 100,
  });

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

## Raw Queries

### raw()

Execute raw SQL queries.

#### Usage Examples

```javascript
const results = await db.raw(
  `
    SELECT u.*, COUNT(o.id) as order_count 
    FROM users u 
    LEFT JOIN orders o ON u.id = o.user_id 
    GROUP BY u.id
    HAVING order_count > ?
`,
  [5],
);
```

---

## Type Definitions

If you're using TypeScript, you can refer to these type definitions:

```typescript
interface Builder {
    // Query methods
    select(columns: string | string[] | ...string[]): Builder;
    where(column: string, operator?: string, value?: any): Builder;
    where(column: string, value: any): Builder;
    whereIn(column: string, values: any[]): Builder;
    orderBy(column: string, direction?: 'asc' | 'desc'): Builder;
    limit(count: number): Builder;
    offset(count: number): Builder;
    groupBy(columns: string | string[]): Builder;
    having(column: string, operator?: string, value?: any): Builder;

    // JOIN methods
    join(table: string, first: string, operator?: string, second?: string): Builder;
    leftJoin(table: string, first: string, operator?: string, second?: string): Builder;

    // Aggregate methods
    count(column?: string): Promise<number>;
    max(column: string): Promise<number>;
    min(column: string): Promise<number>;
    sum(column: string): Promise<number>;
    avg(column: string): Promise<number>;

    // Data modification
    insert(data: object | object[]): Promise<any>;
    update(data: object): Promise<any>;
    delete(): Promise<any>;
    increment(column: string, amount?: number): Promise<any>;
    decrement(column: string, amount?: number): Promise<any>;

    // Execution methods
    get(): Promise<any[]>;
    first(): Promise<any>;
    find(id: any): Promise<any>;

    // CASE WHEN
    case(column?: string): CaseBuilder;
}

interface CaseBuilder {
    when(condition: any, value: any): CaseBuilder;
    else(value: any): CaseBuilder;
    end(alias?: string): any;
}
```

---

## Related Documentation

- [Database Class API Documentation](./Database.md) - Database connection and core functionality
- [Grammar System Documentation](../Grammar.md) - SQL compilation system
- [Processors System Documentation](../Processors.md) - Result processing system
- [Quick Start Guide](../examples/quick-start_EN.md) - Getting started tutorial
- [Basic Queries Guide](../examples/basic-queries_EN.md) - Query examples and patterns
