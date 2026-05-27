# Basic Query Examples

This document provides detailed examples of various basic SELECT queries, from simple to complex.

## Table of Contents

1. [Simple SELECT](#simple-select)
2. [WHERE Conditions](#where-conditions)
3. [Sorting](#sorting)
4. [Pagination](#pagination)
5. [Aggregate Functions](#aggregate-functions)
6. [Grouping](#grouping)
7. [DISTINCT](#distinct)
8. [Subqueries](#subqueries)

---

## Simple SELECT

### Select All Columns

```javascript
// Get all fields of all users
const allUsers = await db.table("users").get();

console.log(allUsers);
// Example output:
// [
//   { id: 1, name: 'John', email: 'john@example.com', status: 'active', ... },
//   { id: 2, name: 'Jane', email: 'jane@example.com', status: 'active', ... },
// ]
```

### Select Specific Columns

```javascript
// Select only id, name, and email
const users = await db.table("users").select("id", "name", "email").get();

// Using array syntax
const usersArray = await db
  .table("users")
  .select(["id", "name", "email"])
  .get();

// With table alias
const usersAlias = await db
  .table("users as u")
  .select("u.id", "u.name", "u.email")
  .get();
```

### Column Aliases

```javascript
// Using aliases for columns
const users = await db
  .table("users")
  .select("id", "name as full_name", "email as email_address")
  .get();

// Raw expressions with aliases
const stats = await db
  .table("orders")
  .select("id", db.raw("total * 0.1 as tax_amount"))
  .get();
```

## WHERE Conditions

### Basic Equality

```javascript
// Simple equality
const activeUsers = await db.table("users").where("status", "active").get();

// Explicit operator
const premiumUsers = await db
  .table("users")
  .where("type", "=", "premium")
  .get();
```

### Comparison Operators

```javascript
// Greater than
const adults = await db.table("users").where("age", ">", 18).get();

// Less than or equal
const youngUsers = await db.table("users").where("age", "<=", 25).get();

// Not equal
const nonActiveUsers = await db
  .table("users")
  .where("status", "!=", "active")
  .get();
```

### Multiple Conditions (AND)

```javascript
// Multiple AND conditions
const result = await db
  .table("users")
  .where("status", "active")
  .where("age", ">", 18)
  .where("verified", true)
  .get();

// Array of conditions
const conditions = [
  ["status", "=", "active"],
  ["age", ">", 18],
  ["verified", "=", true],
];
const users = await db.table("users").where(conditions).get();
```

### OR Conditions

```javascript
// Simple OR
const adminOrModerator = await db
  .table("users")
  .where("role", "admin")
  .orWhere("role", "moderator")
  .get();

// Complex OR with grouping
const eligibleUsers = await db
  .table("users")
  .where("status", "active")
  .where(function (query) {
    query.where("age", ">=", 18).orWhere("parent_consent", true);
  })
  .get();
```

### NULL Checks

```javascript
// IS NULL
const usersWithoutEmail = await db.table("users").whereNull("email").get();

// IS NOT NULL
const usersWithEmail = await db.table("users").whereNotNull("email").get();
```

### IN/NOT IN

```javascript
// WHERE IN
const specificUsers = await db
  .table("users")
  .whereIn("id", [1, 2, 3, 4, 5])
  .get();

// WHERE NOT IN
const otherUsers = await db
  .table("users")
  .whereNotIn("status", ["banned", "suspended"])
  .get();
```

### LIKE Patterns

```javascript
// LIKE pattern matching
const johnUsers = await db.table("users").where("name", "LIKE", "John%").get();

// Case-insensitive search (depends on database)
const emailSearch = await db
  .table("users")
  .where("email", "LIKE", "%@gmail.com")
  .get();
```

### BETWEEN

```javascript
// BETWEEN values
const middleAgedUsers = await db
  .table("users")
  .whereBetween("age", [25, 65])
  .get();

// Date ranges
const recentUsers = await db
  .table("users")
  .whereBetween("created_at", ["2024-01-01", "2024-12-31"])
  .get();
```

## Sorting

### Single Column Sort

```javascript
// Ascending (default)
const usersAsc = await db.table("users").orderBy("name").get();

// Descending
const usersDesc = await db.table("users").orderBy("created_at", "desc").get();
```

### Multiple Column Sort

```javascript
// Multiple sort criteria
const sortedUsers = await db
  .table("users")
  .orderBy("status", "asc")
  .orderBy("created_at", "desc")
  .orderBy("name", "asc")
  .get();
```

### Raw Sorting

```javascript
// Custom sorting with raw SQL
const customSort = await db
  .table("products")
  .orderBy(db.raw("CASE WHEN featured = 1 THEN 0 ELSE 1 END"))
  .orderBy("price", "desc")
  .get();
```

## Pagination

### Basic Pagination

```javascript
// Page 1: First 10 records
const page1 = await db.table("users").orderBy("id").limit(10).get();

// Page 2: Records 11-20
const page2 = await db.table("users").orderBy("id").limit(10).offset(10).get();
```

### Dynamic Pagination

```javascript
function paginate(page, perPage) {
  return db
    .table("users")
    .orderBy("id")
    .limit(perPage)
    .offset((page - 1) * perPage);
}

// Get page 3 with 20 items per page
const page3 = await paginate(3, 20).get();
```

### Pagination with Total Count

```javascript
async function getUsersWithPagination(page = 1, perPage = 10) {
  const offset = (page - 1) * perPage;

  // Get data and total count in parallel
  const [users, totalCount] = await Promise.all([
    db
      .table("users")
      .select("id", "name", "email")
      .orderBy("id")
      .limit(perPage)
      .offset(offset)
      .get(),
    db.table("users").count(),
  ]);

  return {
    data: users,
    pagination: {
      page: page,
      perPage: perPage,
      total: totalCount,
      totalPages: Math.ceil(totalCount / perPage),
    },
  };
}
```

## Aggregate Functions

### Count

```javascript
// Total count
const totalUsers = await db.table("users").count();

// Count with conditions
const activeUsers = await db.table("users").where("status", "active").count();

// Count specific column
const usersWithEmail = await db.table("users").count("email");
```

### Sum

```javascript
// Sum of all order totals
const totalRevenue = await db.table("orders").sum("total");

// Sum with conditions
const monthlyRevenue = await db
  .table("orders")
  .where("created_at", ">=", "2024-01-01")
  .sum("total");
```

### Average, Min, Max

```javascript
// Average price
const avgPrice = await db.table("products").avg("price");

// Minimum price
const minPrice = await db.table("products").min("price");

// Maximum price
const maxPrice = await db.table("products").max("price");

// All stats in one query
const priceStats = await db
  .table("products")
  .select(
    db.raw("AVG(price) as avg_price"),
    db.raw("MIN(price) as min_price"),
    db.raw("MAX(price) as max_price"),
    db.raw("COUNT(*) as total_products"),
  )
  .first();
```

## Grouping

### Basic GROUP BY

```javascript
// Count users by status
const usersByStatus = await db
  .table("users")
  .select("status")
  .count("* as user_count")
  .groupBy("status")
  .get();

// Multiple grouping columns
const salesByRegionAndMonth = await db
  .table("orders")
  .select("region", "month")
  .sum("total as total_sales")
  .groupBy("region", "month")
  .get();
```

### HAVING Clause

```javascript
// Groups with conditions
const popularCategories = await db
  .table("products")
  .select("category")
  .count("* as product_count")
  .groupBy("category")
  .having("product_count", ">", 10)
  .get();

// Multiple HAVING conditions
const significantSales = await db
  .table("orders")
  .select("customer_id")
  .sum("total as total_spent")
  .count("* as order_count")
  .groupBy("customer_id")
  .having("total_spent", ">", 1000)
  .having("order_count", ">", 5)
  .get();
```

## DISTINCT

### Select Distinct Values

```javascript
// Unique statuses
const uniqueStatuses = await db.table("users").distinct("status").get();

// Multiple distinct columns
const uniqueLocations = await db
  .table("users")
  .distinct("city", "country")
  .get();
```

### Distinct with Aggregation

```javascript
// Count distinct values
const uniqueCustomers = await db
  .table("orders")
  .countDistinct("customer_id as unique_customers")
  .first();
```

## Subqueries

### IN Subquery

```javascript
// Users who have placed orders
const usersWithOrders = await db
  .table("users")
  .whereIn("id", function (query) {
    query.select("user_id").from("orders");
  })
  .get();
```

### EXISTS Subquery

```javascript
// Users who exist in orders table
const activeCustomers = await db
  .table("users")
  .whereExists(function (query) {
    query.select("*").from("orders").whereRaw("orders.user_id = users.id");
  })
  .get();
```

### Subquery in SELECT

#### Using selectSub() method (Recommended)

```javascript
// Users with their order count using selectSub
const usersWithOrderCount = await db
  .table("users")
  .select("id", "name", "email")
  .selectSub((subQuery) => {
    subQuery
      .table("orders")
      .select("COUNT(*)")
      .where("orders.user_id", "=", "users.id");
  }, "order_count")
  .get();
```

#### Using raw SQL (Alternative)

```javascript
// Users with their order count using raw SQL
const usersWithOrderCount = await db
  .table("users")
  .select("id", "name", "email")
  .select(
    db.raw(`(
        SELECT COUNT(*) 
        FROM orders 
        WHERE orders.user_id = users.id
    ) as order_count`),
  )
  .get();
```

### FROM Subquery

```javascript
// Query based on aggregated data
const highValueCustomers = await db
  .fromSub((subQuery) => {
    subQuery
      .table("orders")
      .select(["user_id", "SUM(total) as total_spent"])
      .where("status", "completed")
      .groupBy("user_id");
  }, "customer_totals")
  .join("users", "users.id", "=", "customer_totals.user_id")
  .select("users.name", "customer_totals.total_spent")
  .where("total_spent", ">", 1000)
  .get();
```

### JOIN Subquery

```javascript
// Join with aggregated order data
const usersWithStats = await db
  .table("users")
  .leftJoinSub(
    (subQuery) => {
      subQuery
        .table("orders")
        .select([
          "user_id",
          "COUNT(*) as order_count",
          "AVG(total) as avg_order_value",
        ])
        .where("status", "completed")
        .groupBy("user_id");
    },
    "order_stats",
    "users.id",
    "=",
    "order_stats.user_id",
  )
  .select(
    "users.name",
    "users.email",
    "order_stats.order_count",
    "order_stats.avg_order_value",
  )
  .get();
```

## Advanced Examples

### Complex Filtering

```javascript
// Advanced search with multiple criteria
async function searchUsers(filters) {
  let query = db.table("users").select("*");

  if (filters.name) {
    query = query.where("name", "LIKE", `%${filters.name}%`);
  }

  if (filters.email) {
    query = query.where("email", "LIKE", `%${filters.email}%`);
  }

  if (filters.status && filters.status.length > 0) {
    query = query.whereIn("status", filters.status);
  }

  if (filters.ageFrom) {
    query = query.where("age", ">=", filters.ageFrom);
  }

  if (filters.ageTo) {
    query = query.where("age", "<=", filters.ageTo);
  }

  return await query.get();
}

// Usage
const searchResults = await searchUsers({
  name: "John",
  status: ["active", "premium"],
  ageFrom: 25,
  ageTo: 65,
});
```

### Dynamic Query Building

```javascript
// Build query dynamically based on parameters
function buildUserQuery(params) {
  let query = db.table("users");

  // Select columns
  const columns = params.columns || ["id", "name", "email"];
  query = query.select(columns);

  // Apply filters
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.where(key, value);
      }
    });
  }

  // Apply sorting
  if (params.sortBy) {
    const direction = params.sortOrder || "asc";
    query = query.orderBy(params.sortBy, direction);
  }

  // Apply pagination
  if (params.limit) {
    query = query.limit(params.limit);

    if (params.offset) {
      query = query.offset(params.offset);
    }
  }

  return query;
}

// Usage
const users = await buildUserQuery({
  columns: ["id", "name", "email", "status"],
  filters: {
    status: "active",
    verified: true,
  },
  sortBy: "name",
  sortOrder: "asc",
  limit: 20,
  offset: 0,
}).get();
```

## Related Documentation

- [Database Class API](../api/Database.md) - Connection management
- [Builder Class API](../api/Builder.md) - Complete query builder reference
- [JOIN Examples](./joins.md) - Table joining operations
- [Data Modification Examples](./data-modification.md) - INSERT, UPDATE, DELETE
- [Transaction Examples](./transactions.md) - Transaction handling
