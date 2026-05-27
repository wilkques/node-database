# JOIN Operation Examples

This document provides comprehensive examples of JOIN operations for combining data from multiple tables.

## Table of Contents

1. [Basic JOIN Concepts](#basic-join-concepts)
2. [INNER JOIN](#inner-join)
3. [LEFT JOIN](#left-join)
4. [RIGHT JOIN](#right-join)
5. [CROSS JOIN](#cross-join)
6. [Self JOIN](#self-join)
7. [Multiple JOINs](#multiple-joins)
8. [Conditional JOINs](#conditional-joins)

---

## Basic JOIN Concepts

JOIN operations combine rows from two or more tables based on a related column between them.

### Sample Tables

```javascript
// Users table
{ id: 1, name: 'John Doe', email: 'john@example.com' }
{ id: 2, name: 'Jane Smith', email: 'jane@example.com' }

// Orders table
{ id: 1, user_id: 1, total: 100, status: 'completed' }
{ id: 2, user_id: 1, total: 50, status: 'pending' }
{ id: 3, user_id: 2, total: 75, status: 'completed' }

// Profiles table
{ user_id: 1, bio: 'Software developer', location: 'New York' }
{ user_id: 2, bio: 'Designer', location: 'California' }
```

## INNER JOIN

INNER JOIN returns rows that have matching values in both tables.

### Basic INNER JOIN

```javascript
// Get users and their orders
const userOrders = await db
  .table("users")
  .select("users.name", "orders.total", "orders.status")
  .join("orders", "users.id", "=", "orders.user_id")
  .get();

// Result: Only users who have orders
```

### INNER JOIN with Aliases

```javascript
// Using table aliases for cleaner queries
const result = await db
  .table("users as u")
  .select("u.name", "o.total", "o.status")
  .join("orders as o", "u.id", "=", "o.user_id")
  .get();
```

### INNER JOIN with Conditions

```javascript
// JOIN with additional WHERE conditions
const completedOrders = await db
  .table("users")
  .select("users.name", "orders.total")
  .join("orders", "users.id", "=", "orders.user_id")
  .where("orders.status", "completed")
  .where("orders.total", ">", 50)
  .get();
```

## LEFT JOIN

LEFT JOIN returns all rows from the left table, and matched rows from the right table.

### Basic LEFT JOIN

```javascript
// Get all users and their orders (if any)
const usersWithOrders = await db
  .table("users")
  .select("users.name", "users.email", "orders.total")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .get();

// Result: All users, with NULL for users without orders
```

### LEFT JOIN with Aggregation

```javascript
// Get users with their total order count
const usersOrderCount = await db
  .table("users")
  .select("users.id", "users.name")
  .select(db.raw("COUNT(orders.id) as order_count"))
  .select(db.raw("COALESCE(SUM(orders.total), 0) as total_spent"))
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .groupBy("users.id", "users.name")
  .get();
```

### Find Users Without Orders

```javascript
// Users who have never placed an order
const usersWithoutOrders = await db
  .table("users")
  .select("users.id", "users.name", "users.email")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .whereNull("orders.user_id")
  .get();
```

## RIGHT JOIN

RIGHT JOIN returns all rows from the right table, and matched rows from the left table.

### Basic RIGHT JOIN

```javascript
// Get all orders and their users (if user exists)
const ordersWithUsers = await db
  .table("users")
  .select("orders.id as order_id", "orders.total", "users.name")
  .rightJoin("orders", "users.id", "=", "orders.user_id")
  .get();

// Result: All orders, with NULL for orders without valid users
```

## CROSS JOIN

CROSS JOIN returns the Cartesian product of both tables.

### Basic CROSS JOIN

```javascript
// Generate all combinations (use with caution on large tables)
const combinations = await db
  .table("colors")
  .select("colors.name as color", "sizes.name as size")
  .crossJoin("sizes")
  .get();
```

## Self JOIN

Self JOIN is used to join a table with itself.

### Hierarchical Data

```javascript
// Employees and their managers
const employeesWithManagers = await db
  .table("employees as emp")
  .select("emp.name as employee", "mgr.name as manager")
  .leftJoin("employees as mgr", "emp.manager_id", "=", "mgr.id")
  .get();
```

### Find Related Records

```javascript
// Find users in the same city
const usersInSameCity = await db
  .table("users as u1")
  .select("u1.name as user1", "u2.name as user2", "u1.city")
  .join("users as u2", "u1.city", "=", "u2.city")
  .where("u1.id", "<", db.raw("u2.id")) // Avoid duplicates
  .get();
```

## Multiple JOINs

Combining multiple tables in a single query.

### Three Table JOIN

```javascript
// Users, orders, and order items
const orderDetails = await db
  .table("users")
  .select(
    "users.name as customer",
    "orders.id as order_id",
    "orders.total",
    "order_items.product_name",
    "order_items.quantity",
  )
  .join("orders", "users.id", "=", "orders.user_id")
  .join("order_items", "orders.id", "=", "order_items.order_id")
  .get();
```

### Mixed JOIN Types

```javascript
// Users with profiles and orders (all users, optional orders)
const userCompleteData = await db
  .table("users as u")
  .select("u.name", "u.email", "p.bio", "p.location", "o.total", "o.status")
  .leftJoin("profiles as p", "u.id", "=", "p.user_id")
  .leftJoin("orders as o", "u.id", "=", "o.user_id")
  .get();
```

### Complex Business Logic

```javascript
// Complete order information with customer and product details
const fullOrderView = await db
  .table("orders as o")
  .select(
    "o.id as order_id",
    "o.order_date",
    "o.status",
    "u.name as customer_name",
    "u.email as customer_email",
    "oi.quantity",
    "oi.price",
    "p.name as product_name",
    "p.category",
  )
  .join("users as u", "o.user_id", "=", "u.id")
  .join("order_items as oi", "o.id", "=", "oi.order_id")
  .join("products as p", "oi.product_id", "=", "p.id")
  .where("o.status", "completed")
  .orderBy("o.order_date", "desc")
  .get();
```

## Conditional JOINs

JOINs with complex conditions.

### JOIN with Multiple Conditions

```javascript
// JOIN with multiple conditions
const specialOrders = await db
  .table("users")
  .select("users.name", "orders.total")
  .join("orders", function (join) {
    join
      .on("users.id", "=", "orders.user_id")
      .andOn("orders.total", ">", db.raw("?", [100]))
      .andOn("orders.status", "=", db.raw("?", ["completed"]));
  })
  .get();
```

### Conditional JOIN with OR

```javascript
// JOIN with OR conditions
const flexibleJoin = await db
  .table("users")
  .select("users.name", "contact.value")
  .leftJoin("contacts", function (join) {
    join.on("users.id", "=", "contacts.user_id").andWhere(function (query) {
      query.where("contacts.type", "email").orWhere("contacts.type", "phone");
    });
  })
  .get();
```

### Date-based JOINs

```javascript
// JOIN orders from last 30 days
const recentOrderUsers = await db
  .table("users")
  .select("users.name", "orders.total", "orders.created_at")
  .join("orders", function (join) {
    join
      .on("users.id", "=", "orders.user_id")
      .andOn(
        "orders.created_at",
        ">=",
        db.raw("DATE_SUB(NOW(), INTERVAL 30 DAY)"),
      );
  })
  .get();
```

## Subquery JOINs

Using subqueries in JOIN operations.

### JOIN with Subquery

```javascript
// JOIN with aggregated subquery
const usersWithOrderStats = await db
  .table("users")
  .select("users.name", "order_stats.total_orders", "order_stats.total_spent")
  .leftJoin(
    db
      .table("orders")
      .select("user_id")
      .count("* as total_orders")
      .sum("total as total_spent")
      .groupBy("user_id")
      .as("order_stats"),
    "users.id",
    "=",
    "order_stats.user_id",
  )
  .get();
```

## Performance Considerations

### Indexed JOINs

```javascript
// Ensure JOIN columns are indexed
// Index on orders.user_id and users.id for better performance
const optimizedJoin = await db
  .table("users")
  .select("users.name", "orders.total")
  .join("orders", "users.id", "=", "orders.user_id")
  .where("users.status", "active") // Also index users.status
  .get();
```

### Limiting JOIN Results

```javascript
// Use LIMIT with JOINs carefully
const topUserOrders = await db
  .table("users")
  .select("users.name", "orders.total")
  .join("orders", "users.id", "=", "orders.user_id")
  .orderBy("orders.total", "desc")
  .limit(10)
  .get();
```

## Common JOIN Patterns

### One-to-Many Relationship

```javascript
// User has many orders
const userOrderHistory = await db
  .table("users")
  .select("users.name", "orders.id as order_id", "orders.total")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .orderBy("users.name")
  .orderBy("orders.created_at", "desc")
  .get();
```

### Many-to-Many Relationship

```javascript
// Users and roles through pivot table
const usersWithRoles = await db
  .table("users")
  .select("users.name", "roles.name as role_name")
  .join("user_roles", "users.id", "=", "user_roles.user_id")
  .join("roles", "user_roles.role_id", "=", "roles.id")
  .get();
```

### Hierarchical Data

```javascript
// Category tree
const categoryHierarchy = await db
  .table("categories as c")
  .select("c.name as category", "parent.name as parent_category")
  .leftJoin("categories as parent", "c.parent_id", "=", "parent.id")
  .orderBy("parent.name")
  .orderBy("c.name")
  .get();
```

## Subquery JOINs

### INNER JOIN with Subquery

Join with aggregated data from subqueries:

```javascript
// Users with their order statistics
const usersWithOrderStats = await db
  .table("users")
  .joinSub(
    (subQuery) => {
      subQuery
        .table("orders")
        .select([
          "user_id",
          "COUNT(*) as order_count",
          "SUM(total) as total_spent",
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
    "order_stats.total_spent",
    "order_stats.avg_order_value",
  )
  .get();
```

### LEFT JOIN with Subquery

Include all users even if they have no matching subquery data:

```javascript
// All users with optional review statistics
const usersWithReviews = await db
  .table("users")
  .leftJoinSub(
    (subQuery) => {
      subQuery
        .table("reviews")
        .select([
          "user_id",
          "COUNT(*) as review_count",
          "AVG(rating) as avg_rating",
        ])
        .groupBy("user_id");
    },
    "review_stats",
    "users.id",
    "=",
    "review_stats.user_id",
  )
  .select("users.name", "review_stats.review_count", "review_stats.avg_rating")
  .get();
```

### Complex Subquery JOIN

Multiple levels of aggregation:

```javascript
// Products with sales performance data
const productPerformance = await db
  .table("products")
  .leftJoinSub(
    (subQuery) => {
      subQuery
        .table("order_items")
        .select([
          "product_id",
          "SUM(quantity) as total_sold",
          "SUM(quantity * price) as total_revenue",
          "COUNT(DISTINCT order_id) as order_count",
        ])
        .join("orders", "order_items.order_id", "=", "orders.id")
        .where("orders.status", "completed")
        .where(
          "orders.created_at",
          ">=",
          db.raw("DATE_SUB(NOW(), INTERVAL 30 DAY)"),
        )
        .groupBy("product_id");
    },
    "sales_stats",
    "products.id",
    "=",
    "sales_stats.product_id",
  )
  .leftJoinSub(
    (subQuery) => {
      subQuery
        .table("reviews")
        .select([
          "product_id",
          "COUNT(*) as review_count",
          "AVG(rating) as avg_rating",
        ])
        .groupBy("product_id");
    },
    "review_stats",
    "products.id",
    "=",
    "review_stats.product_id",
  )
  .select(
    "products.name",
    "products.price",
    "sales_stats.total_sold",
    "sales_stats.total_revenue",
    "sales_stats.order_count",
    "review_stats.review_count",
    "review_stats.avg_rating",
  )
  .orderBy("sales_stats.total_revenue", "desc")
  .get();
```

---

## Related Documentation

- [Basic Queries](./basic-queries.md) - Basic SELECT operations
- [Data Modification](./data-modification.md) - INSERT, UPDATE, DELETE
- [Builder API](../api/Builder.md) - Complete query builder reference
