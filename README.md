# Database Query Builder

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![Databases](https://img.shields.io/badge/MySQL%20%7C%20PostgreSQL%20%7C%20SQLite-blue.svg)
![Tests](https://img.shields.io/badge/Tests-149%20Passed-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Modern Node.js Database Query Builder**  
_Supports MySQL, PostgreSQL, and SQLite_

[Quick Start](#quick-start) • [API Documentation](#api-documentation) • [Examples](#examples) • [Features](#features)

**🌍 Language**: [English](README.md) | [中文](README_CN.md)

</div>

---

## 🚀 Overview

A powerful, type-safe Node.js database query builder with fluent API and complete documentation. Supports complex queries, transaction handling, join operations, and conditional expressions, suitable for modern JavaScript/TypeScript projects.

## ✨ Features

### 🔧 Core Features

- **🎯 Fluent API** - Chainable method calls, intuitive and easy to use
- **🔄 Multi-Database Support** - Unified interface for MySQL, PostgreSQL, SQLite
- **⚡ High Performance** - Optimized query generation and connection management
- **🔒 SQL Injection Protection** - Automatic parameterized queries, safe and secure

### 📝 Query Features

- **🔍 Complex Queries** - SELECT, WHERE, ORDER BY, GROUP BY, HAVING
- **🔗 JOIN Operations** - INNER, LEFT, RIGHT, CROSS JOIN and subqueries
- **📊 Aggregate Functions** - COUNT, SUM, AVG, MAX, MIN
- **🎛️ Conditional Expressions** - Complete CASE WHEN support
- **🔄 Transaction Handling** - Complete transaction support and rollback mechanism

### 🛠️ Advanced Features

- **📁 Subqueries** - Nested queries in WHERE, FROM, JOIN
- **🧮 Data Modification** - INSERT, UPDATE, DELETE, UPSERT
- **🔢 Atomic Operations** - INCREMENT, DECREMENT atomic counters
- **📋 Batch Operations** - Optimized batch insert and update

## 📦 Installation

### 1. Install via npm

```bash
# Install the database query builder
npm install @wilkques/database

# Install the database driver you need
npm install mysql2          # For MySQL
npm install pg              # For PostgreSQL
npm install better-sqlite3  # For SQLite
```

### 2. Alternative: Install from Source

```bash
# Clone the repository
git clone https://github.com/wilkques/database.git
cd database
npm install
```

## 🚀 Quick Start

### Import and Basic Connection

```javascript
// Default import (recommended)
import Database from "@wilkques/database";

// Named imports (alternative)
import { Database, Builder } from "@wilkques/database";

// CommonJS (if using require)
const Database = require("@wilkques/database").default;

// MySQL connection
const db = await Database.connect({
  driver: "mysql",
  host: "localhost",
  username: "user",
  password: "password",
  database: "mydb",
  port: 3306,
});

// PostgreSQL connection
const db = await Database.connect({
  driver: "postgres",
  host: "localhost",
  username: "user",
  password: "password",
  database: "mydb",
  port: 5432,
});

// SQLite connection
const db = await Database.connect({
  driver: "sqlite",
  database: "./database.db",
});
```

### Basic Queries

```javascript
// Simple query
const users = await db
  .table("users")
  .select("id", "name", "email")
  .where("active", true)
  .orderBy("created_at", "desc")
  .limit(10)
  .get();

// Conditional query
const posts = await db
  .table("posts")
  .select("title", "content", "author_id")
  .where("status", "published")
  .where("created_at", ">", "2024-01-01")
  .whereIn("category_id", [1, 2, 3])
  .get();

// JOIN query
const userPosts = await db
  .table("users", "u")
  .select("u.name", "p.title", "p.created_at")
  .leftJoin("posts p", "u.id", "p.author_id")
  .where("u.active", true)
  .orderBy("p.created_at", "desc")
  .get();
```

### Conditional Expressions (CASE WHEN)

```javascript
// Simple CASE statement
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

// Complex conditional CASE
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

// Using CASE in UPDATE
await db.table("products").update({
  status: db
    .case("inventory")
    .when(0, "Out of Stock")
    .when((q) => q.where("inventory", "<", 10), "Low Stock")
    .else("In Stock")
    .end(),
});
```

### Data Modification

```javascript
// Insert data
const result = await db.table("users").insert({
  name: "John Doe",
  email: "john@example.com",
  created_at: new Date(),
});

// Batch insert
await db.table("users").insert([
  { name: "User 1", email: "user1@example.com" },
  { name: "User 2", email: "user2@example.com" },
]);

// Update data
await db.table("users").where("id", 1).update({
  name: "Jane Doe",
  updated_at: new Date(),
});

// Atomic operations
await db.table("posts").where("id", 1).increment("view_count", 1);

// Upsert operation
await db.table("settings").upsert({
  key: "theme",
  value: "dark",
});
```

### Transaction Handling

```javascript
const transaction = await db.transaction();

try {
  // Create order
  const orderId = await transaction.table("orders").insertGetId({
    user_id: userId,
    total: orderTotal,
    status: "pending",
  });

  // Add order items
  await transaction.table("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    })),
  );

  // Update inventory
  for (const item of items) {
    await transaction
      .table("products")
      .where("id", item.product_id)
      .decrement("stock", item.quantity);
  }

  await transaction.commit();
  console.log("Order created successfully");
} catch (error) {
  await transaction.rollback();
  console.error("Order creation failed:", error);
}
```

## 📚 API Documentation

### Core Classes

- **[Database Class](docs/api/Database.md)** - Database connection management and core functionality
- **[Builder Class](docs/api/Builder.md)** - Complete query builder API reference

### Detailed Guides

- **[Quick Start Guide](docs/examples/quick-start.md)** - Complete getting started tutorial
- **[Basic Queries](docs/examples/basic-queries.md)** - SELECT queries explained
- **[JOIN Operations](docs/examples/joins.md)** - Complete guide to table joins
- **[Data Modification](docs/examples/data-modification.md)** - CRUD operations explained
- **[Transaction Handling](docs/examples/transactions.md)** - Transaction management and data consistency

### System Documentation

- **[Grammar System](docs/Grammar.md)** - SQL compilation and database-specific syntax
- **[Processors System](docs/Processors.md)** - Result processing and type conversion

## 💾 Supported Databases

| Database       | Version Support | Driver         | Feature Support |
| -------------- | --------------- | -------------- | --------------- |
| **MySQL**      | 5.7+            | mysql2         | ✅ Full Support |
| **PostgreSQL** | 9.6+            | pg             | ✅ Full Support |
| **SQLite**     | 3.x             | better-sqlite3 | ✅ Full Support |

## 🧪 Testing

The project includes a complete test suite:

```bash
npm test
```

**Test Coverage:**

- ✅ **149 tests all passed**
- ✅ **9 test suites covered**
- ✅ **All core functionality verified**

## 📁 Project Structure

```
lib/
├── Database.js              # Main database class
├── queries/                 # Query builder
│   ├── Builder.js          # Query builder main class
│   ├── grammar/            # SQL grammar compilers
│   └── processors/         # Result processors
├── connections/            # Database connection management
docs/                       # Complete documentation
├── api/                   # API reference
└── examples/              # Usage examples
tests/                     # Test suite
examples/                  # Example code
```

## 🔧 Advanced Usage

### Custom Queries

```javascript
// Raw SQL queries
const results = await db.raw(
  `
    SELECT u.*, COUNT(p.id) as post_count 
    FROM users u 
    LEFT JOIN posts p ON u.id = p.author_id 
    GROUP BY u.id
    HAVING post_count > ?
`,
  [5],
);

// Subqueries
const activeUsers = await db
  .table("users")
  .whereExists((query) => {
    query
      .table("posts")
      .whereRaw("posts.author_id = users.id")
      .where("posts.status", "published");
  })
  .get();
```

### Query Optimization

```javascript
// Query logging
db.connection.enableQueryLog();
const result = await db.table("users").get();
console.log(db.connection.getQueryLog());
```

## 🤝 Contributing

Contributions and improvements are welcome!

## 📄 License

[MIT License](LICENSE)

---

<div align="center">

**🌟 If this project helps you, please give it a star!**

Made with ❤️ for the Node.js community

</div>
