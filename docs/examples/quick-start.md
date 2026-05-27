# Quick Start Guide

## Introduction

Welcome to the Database Query Builder! This is a flexible and easy-to-use Node.js database query builder that supports MySQL, PostgreSQL, and SQLite. This guide will help you quickly understand the basic usage.

## Installation

```bash
npm install
```

### Database Driver Installation

Install the appropriate driver based on your database:

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg

# SQLite
npm install better-sqlite3
```

## Initialize Connection

### Basic Connection

Creating a database connection is the first step in using the query builder. Use the `Database.connect()` method to establish a connection.

```javascript
import Database from "./Database/index.js";

// Connect to MySQL
const db = await Database.connect({
  driver: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "myapp",
  charset: "utf8mb4",
});

console.log("✅ Database connection successful!");
```

### Different Database Connection Methods

**PostgreSQL Connection:**

```javascript
const db = await Database.connect({
  driver: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "myapp",
});
```

**SQLite Connection:**

```javascript
const db = await Database.connect({
  driver: "sqlite",
  filename: "./database.sqlite",
});
```

## Basic Queries

### Simple SELECT Queries

Select data from specific columns:

```javascript
// Query all users' id, name, and email
const users = await db.table("users").select("id", "name", "email").get();

console.log(users);
// Output: [{ id: 1, name: 'John', email: 'john@example.com' }, ...]
```

### WHERE Condition Filtering

Use the `where()` method to add conditions to filter data:

```javascript
// Query all active users
const activeUsers = await db
  .table("users")
  .select("id", "name", "status")
  .where("status", "active")
  .get();

// Multiple conditions (AND)
const results = await db
  .table("users")
  .where("status", "active")
  .where("age", ">", 18)
  .where("verified", true)
  .get();

// Using OR conditions
const premiumOrAdmin = await db
  .table("users")
  .where("role", "admin")
  .orWhere("premium", true)
  .get();
```

### Sorting and Pagination

```javascript
// Sort by creation time in descending order, get the latest 10 records
const latestPosts = await db
  .table("posts")
  .select("id", "title", "created_at")
  .orderBy("created_at", "desc")
  .limit(10)
  .get();

// Paginated query: page 2, 20 records per page
const perPage = 20;
const currentPage = 2;
const posts = await db
  .table("posts")
  .select("id", "title", "excerpt")
  .orderBy("created_at", "desc")
  .limit(perPage)
  .offset((currentPage - 1) * perPage)
  .get();
```

### Aggregate Functions

```javascript
// Count total
const totalUsers = await db.table("users").count();
console.log(`Total users: ${totalUsers}`);

// Calculate average
const avgAge = await db.table("users").avg("age");
console.log(`Average age: ${avgAge}`);

// Get maximum and minimum values
const maxPrice = await db.table("products").max("price");
const minPrice = await db.table("products").min("price");

// Sum
const totalRevenue = await db.table("orders").sum("amount");

// Group statistics
const usersByStatus = await db
  .table("users")
  .select("status")
  .selectRaw("COUNT(*) as count")
  .groupBy("status")
  .get();
// Output: [{ status: 'active', count: 150 }, { status: 'inactive', count: 50 }]
```

## JOIN Operations

### Inner Join (INNER JOIN)

```javascript
// Join users and orders tables
const userOrders = await db
  .table("users")
  .select("users.id", "users.name", "orders.order_number", "orders.amount")
  .join("orders", "users.id", "=", "orders.user_id")
  .get();
```

### Left Join (LEFT JOIN)

```javascript
// Get all users and their orders (if any)
const usersWithOrders = await db
  .table("users")
  .select("users.id", "users.name", "orders.order_number")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .get();
```

### Multi-table Joins

```javascript
// Join multiple tables
const fullData = await db
  .table("users as u")
  .select("u.id", "u.name", "p.bio", "o.order_number", "o.amount")
  .leftJoin("profiles as p", "u.id", "=", "p.user_id")
  .leftJoin("orders as o", "u.id", "=", "o.user_id")
  .where("u.status", "active")
  .orderBy("o.created_at", "desc")
  .get();
```

## Data Modification

### Inserting Data

```javascript
// Insert single record
const result = await db.table("users").insert({
  name: "Alice",
  email: "alice@example.com",
  status: "active",
  created_at: new Date(),
});

console.log("Insert ID:", result.insertId);

// Batch insert
const users = [
  { name: "Bob", email: "bob@example.com", status: "active" },
  { name: "Charlie", email: "charlie@example.com", status: "active" },
  { name: "David", email: "david@example.com", status: "pending" },
];

const bulkResult = await db.table("users").insert(users);
console.log("Affected rows:", bulkResult.affectedRows);
```

### Updating Data

```javascript
// Update specific user
const updateResult = await db.table("users").where("id", 1).update({
  name: "Alice Smith",
  updated_at: new Date(),
});

console.log("Affected rows:", updateResult.affectedRows);

// Conditional update
const statusUpdateResult = await db
  .table("users")
  .where("age", "<", 18)
  .update({ status: "minor" });

// Increment field value
const incrementResult = await db
  .table("users")
  .where("id", 1)
  .increment("login_count");

// Decrement field value
const decrementResult = await db
  .table("products")
  .where("id", 5)
  .decrement("stock", 2);
```

### Deleting Data

```javascript
// Delete specific record
const deleteResult = await db.table("users").where("id", 1).delete();

console.log("Affected rows:", deleteResult.affectedRows);

// Conditional delete
const expiredDeleteResult = await db
  .table("sessions")
  .where("expires_at", "<", new Date())
  .delete();
```

## Transaction Handling

Transactions ensure that a series of database operations either all succeed or all fail. This is crucial for operations that need to maintain data consistency.

```javascript
// Start transaction
const transaction = await db.transaction();

try {
  // Execute operations within transaction
  const order = await transaction.table("orders").insert({
    user_id: 1,
    status: "pending",
    total_amount: 100,
  });

  // Reduce stock
  await transaction.table("products").where("id", 5).decrement("stock", 2);

  // Log inventory change
  await transaction.table("inventory_logs").insert({
    product_id: 5,
    quantity: -2,
    order_id: order.insertId,
    created_at: new Date(),
  });

  // Commit transaction
  await transaction.commit();
  console.log("✅ Transaction committed successfully");
} catch (error) {
  // Rollback transaction on error
  await transaction.rollback();
  console.error("❌ Transaction rolled back:", error.message);
}
```

## Error Handling

### Basic Error Handling

```javascript
try {
  const user = await db.table("users").where("id", 999).first();

  if (!user) {
    console.log("User not found");
  }
} catch (error) {
  console.error("Database query failed:", error.message);
}
```

### Connection Error Handling

```javascript
try {
  const db = await Database.connect({
    driver: "mysql",
    host: "localhost",
    username: "root",
    password: "wrong_password",
    database: "myapp",
  });
} catch (error) {
  if (error.code === "ER_ACCESS_DENIED_FOR_USER") {
    console.error("❌ Database username or password incorrect");
  } else if (error.code === "ECONNREFUSED") {
    console.error("❌ Cannot connect to database, check if service is running");
  } else {
    console.error("❌ Connection failed:", error.message);
  }
}
```

## Common Patterns and Best Practices

### 1. Safe Parameter Binding

The query builder automatically handles parameter binding to prevent SQL injection:

```javascript
// ✅ Safe - parameters automatically escaped
const userInput = "'; DROP TABLE users; --";
const result = await db.table("users").where("name", userInput).get();

// ❌ Unsafe - don't do this (if using raw SQL)
// If using raw SQL, you must manually escape parameters
```

### 2. Using Raw SQL Expressions

Sometimes you need to use specific SQL expressions:

```javascript
// Calculate time difference
const recentPosts = await db
  .table("posts")
  .select(db.raw("*, DATEDIFF(NOW(), created_at) as days_old"))
  .where("created_at", ">", db.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
  .get();

// Using functions
const usersWithAge = await db
  .table("users")
  .select("name", db.raw("YEAR(NOW()) - YEAR(birth_date) as age"))
  .get();
```

### 3. Subqueries

```javascript
// IN subquery
const activeUserOrders = await db
  .table("orders")
  .whereIn("user_id", (query) => {
    query.table("users").select("id").where("status", "active");
  })
  .get();

// EXISTS subquery
const usersWithOrders = await db
  .table("users")
  .where(
    (query) => {
      query
        .table("orders")
        .select(db.raw("1"))
        .whereRaw("orders.user_id = users.id");
    },
    ">",
    0,
  )
  .get();
```

### 4. Grouping and HAVING

```javascript
// Count employees by department, only show departments with more than 10 employees
const deptStats = await db
  .table("employees")
  .select("department")
  .selectRaw("COUNT(*) as employee_count")
  .groupBy("department")
  .having("employee_count", ">", 10)
  .get();
```

### 5. Getting Single Records

```javascript
// Use first() to get the first record
const firstUser = await db.table("users").orderBy("created_at").first();

// Use find() to query by primary key
const user = await db.table("users").find(1);
```

## Performance Optimization Tips

### 1. Select Only Needed Columns

```javascript
// ✅ Recommended - select only needed columns
const users = await db.table("users").select("id", "name", "email").get();

// ❌ Avoid - selecting all columns (if many columns exist)
const allUsers = await db.table("users").select("*").get();
```

### 2. Use Indexes

Ensure that columns used in WHERE conditions have appropriate database indexes.

```javascript
// This query should have an index on the status column of users table
const activeUsers = await db.table("users").where("status", "active").get();
```

### 3. Limit Result Count

```javascript
// Use limit() to restrict the number of returned records
const recentPosts = await db
  .table("posts")
  .orderBy("created_at", "desc")
  .limit(10)
  .get();
```

### 4. Batch Operations

```javascript
// Batch insert is more efficient than single inserts
const records = [
  { name: "User1", email: "user1@example.com" },
  { name: "User2", email: "user2@example.com" },
  { name: "User3", email: "user3@example.com" },
];

const result = await db.table("users").insert(records);
// Single database call to insert 3 records
```

### 5. Use Transactions for Related Operations

```javascript
// Multiple operations in a transaction are more efficient
const transaction = await db.transaction();

try {
  // Multiple related operations
  await transaction.table("orders").insert(orderData);
  await transaction.table("order_items").insert(itemsData);
  await transaction.table("inventory").update(inventoryData);

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

## More Resources

- [Builder API Documentation](../api/Builder.md) - Complete method reference
- [Database API Documentation](../api/Database.md) - Connection and configuration details
- [Basic Query Examples](./basic-queries.md) - More SELECT examples
- [JOIN Operation Examples](./joins.md) - Detailed JOIN tutorial
- [Data Modification Examples](./data-modification.md) - INSERT, UPDATE, DELETE examples
- [Transaction Handling Examples](./transactions.md) - Transactions and concurrency control

## Troubleshooting

### Issue: Cannot connect to database

**Symptoms:** `Error: connect ECONNREFUSED`

**Solutions:**

1. Check if database service is running
2. Confirm hostname and port are correct
3. Verify network connection

### Issue: SQL syntax error

**Symptoms:** `Error: ER_PARSE_ERROR`

**Solutions:**

1. Check table and column name spelling
2. Ensure correct operators are used (e.g., `=` not `==`)
3. Review generated SQL to understand the actual query built

### Issue: Parameter binding error

**Symptoms:** `Error: Incorrect number of bindings`

**Solutions:**

1. Ensure all required parameters are provided
2. Check parameter types are correct
3. Use `db.raw()` for special SQL expressions

## Advanced Features

### Subqueries

Query with aggregated data using subqueries:

```javascript
// Users with their order count (SELECT subquery)
const usersWithOrderCount = await db
  .table("users")
  .select("id", "name", "email")
  .selectSub(
    subQuery => {
      subQuery.table("orders")
        .select("COUNT(*)")
        .where("orders.user_id", "=", "users.id");
    },
    "order_count"
  )
  .get();

// High-value customers (FROM subquery)  
const highValueCustomers = await db
  .fromSub(
    subQuery => {
      subQuery.table("orders")
        .select(["user_id", "SUM(total) as total_spent"])
        .where("status", "completed")
        .groupBy("user_id");
    },
    "customer_totals"
  )
  .join("users", "users.id", "=", "customer_totals.user_id")
  .select("users.name", "customer_totals.total_spent")
  .where("total_spent", ">", 1000)
  .get();

// Users with order statistics (JOIN subquery)
const usersWithStats = await db
  .table("users")
  .leftJoinSub(
    subQuery => {
      subQuery.table("orders")
        .select([
          "user_id",
          "COUNT(*) as order_count", 
          "AVG(total) as avg_order_value"
        ])
        .where("status", "completed")
        .groupBy("user_id");
    },
    "order_stats",
    "users.id",
    "=",
    "order_stats.user_id"
  )
  .select(
    "users.name",
    "order_stats.order_count", 
    "order_stats.avg_order_value"
  )
  .get();
```

### Raw SQL Expressions

For complex queries requiring custom SQL:

```javascript
// Custom ORDER BY with subquery
const topUsers = await db
  .table("users")
  .orderByRaw("(SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) DESC")
  .limit(10)
  .get();

// Complex WHERE conditions
const results = await db
  .table("products")
  .whereRaw("price BETWEEN ? AND ?", [100, 500])
  .whereRaw("MATCH(name, description) AGAINST(?)", ["laptop gaming"])
  .get();
```

---

## Next Steps

Now that you understand the basics, continue exploring:

1. Read more detailed [API Documentation](../api/Builder.md)
2. View [Advanced Examples](./advanced-examples.md)
3. Learn [Performance Optimization Tips](../Processors.md)
4. Explore [Database Grammar Support](../Grammar.md)

Happy coding! If you have questions, feel free to submit an Issue.
