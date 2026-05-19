# Data Modification Examples

This document provides comprehensive examples of data modification operations including INSERT, UPDATE, and DELETE.

## Table of Contents

1. [INSERT Operations](#insert-operations)
2. [UPDATE Operations](#update-operations)
3. [DELETE Operations](#delete-operations)
4. [Atomic Operations](#atomic-operations)
5. [Batch Operations](#batch-operations)
6. [UPSERT Operations](#upsert-operations)

---

## INSERT Operations

### Single Record Insert

```javascript
// Insert a single user
const result = await db.table("users").insert({
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_password",
  status: "active",
  created_at: new Date(),
});

console.log("Inserted ID:", result.insertId);
console.log("Affected rows:", result.affectedRows);
```

### Batch Insert

```javascript
// Insert multiple users at once
const users = [
  {
    name: "Alice Smith",
    email: "alice@example.com",
    status: "active",
  },
  {
    name: "Bob Johnson",
    email: "bob@example.com",
    status: "pending",
  },
  {
    name: "Charlie Brown",
    email: "charlie@example.com",
    status: "active",
  },
];

const batchResult = await db.table("users").insert(users);
console.log("Inserted rows:", batchResult.affectedRows);
```

### Insert with Auto-Generated Fields

```javascript
// Insert with database defaults and auto-generated fields
const newUser = await db.table("users").insert({
  name: "David Wilson",
  email: "david@example.com",
  // id, created_at, updated_at will be auto-generated
});
```

### Insert and Get ID

```javascript
// Insert and immediately get the inserted ID
const userId = await db.table("users").insertGetId({
  name: "Eva Martinez",
  email: "eva@example.com",
  status: "active",
});

console.log("New user ID:", userId);
```

### Insert with Raw Values

```javascript
// Insert with raw SQL expressions
const result = await db.table("posts").insert({
  title: "New Post",
  content: "Post content here",
  user_id: 1,
  created_at: db.raw("NOW()"),
  view_count: db.raw("FLOOR(RAND() * 100)"),
});
```

## UPDATE Operations

### Basic Update

```javascript
// Update a single record
const updateResult = await db.table("users").where("id", 1).update({
  name: "John Smith",
  updated_at: new Date(),
});

console.log("Updated rows:", updateResult.affectedRows);
```

### Conditional Update

```javascript
// Update multiple records with conditions
const statusUpdate = await db
  .table("users")
  .where("last_login", "<", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
  .update({
    status: "inactive",
    updated_at: new Date(),
  });

console.log("Inactive users updated:", statusUpdate.affectedRows);
```

### Update with WHERE IN

```javascript
// Update specific users
const specificUpdate = await db
  .table("users")
  .whereIn("id", [1, 3, 5, 7])
  .update({
    category: "premium",
    updated_at: new Date(),
  });
```

### Update with JOIN

```javascript
// Update based on related table data
const joinUpdate = await db
  .table("users")
  .join("orders", "users.id", "=", "orders.user_id")
  .where("orders.total", ">", 1000)
  .update({
    "users.status": "vip",
    "users.updated_at": new Date(),
  });
```

### Update with Calculations

```javascript
// Update with calculated values
const calculatedUpdate = await db
  .table("products")
  .where("category", "electronics")
  .update({
    sale_price: db.raw("price * 0.9"), // 10% discount
    updated_at: db.raw("NOW()"),
  });
```

### Conditional Update with CASE

```javascript
// Update with conditional logic
const conditionalUpdate = await db.table("users").update({
  membership_level: db
    .case()
    .when((q) => q.where("total_orders", ">", 50), "gold")
    .when((q) => q.where("total_orders", ">", 20), "silver")
    .else("bronze")
    .end(),
  updated_at: new Date(),
});
```

## DELETE Operations

### Basic Delete

```javascript
// Delete a specific record
const deleteResult = await db.table("users").where("id", 5).delete();

console.log("Deleted rows:", deleteResult.affectedRows);
```

### Conditional Delete

```javascript
// Delete inactive users
const cleanupResult = await db
  .table("users")
  .where("status", "inactive")
  .where("last_login", "<", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
  .delete();

console.log("Cleaned up users:", cleanupResult.affectedRows);
```

### Delete with WHERE IN

```javascript
// Delete specific records
const specificDelete = await db
  .table("temporary_logs")
  .whereIn("id", [10, 15, 20, 25])
  .delete();
```

### Delete with JOIN

```javascript
// Delete based on related table data
const relatedDelete = await db
  .table("user_sessions")
  .join("users", "user_sessions.user_id", "=", "users.id")
  .where("users.status", "banned")
  .delete();
```

### Delete All Records (with confirmation)

```javascript
// Delete all records from a table (dangerous!)
const confirmDelete = true; // Make sure this is intentional
if (confirmDelete) {
  const truncateResult = await db.table("temp_data").delete();
  console.log("All records deleted:", truncateResult.affectedRows);
}
```

## Atomic Operations

### Increment

```javascript
// Increment a numeric field
const incrementResult = await db
  .table("posts")
  .where("id", 1)
  .increment("view_count");

// Increment by specific amount
const customIncrement = await db
  .table("users")
  .where("id", 1)
  .increment("points", 50);

// Increment multiple fields
const multiIncrement = await db.table("statistics").where("id", 1).increment({
  page_views: 1,
  unique_visitors: 1,
  total_clicks: 3,
});
```

### Decrement

```javascript
// Decrement inventory
const decrementResult = await db
  .table("products")
  .where("id", 10)
  .decrement("stock", 2);

// Decrement with minimum check
const safeDecrement = await db
  .table("products")
  .where("id", 10)
  .where("stock", ">=", 2)
  .decrement("stock", 2);
```

### Increment/Decrement with Update

```javascript
// Combine increment with other updates
const combinedUpdate = await db
  .table("users")
  .where("id", 1)
  .increment("login_count")
  .update({
    last_login: new Date(),
    updated_at: new Date(),
  });
```

## Batch Operations

### Bulk Insert with Performance

```javascript
// Efficient bulk insert for large datasets
async function bulkInsertUsers(users) {
  const batchSize = 1000;
  const results = [];

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    const result = await db.table("users").insert(batch);
    results.push(result);
  }

  return results;
}

// Usage
const largeUserList = new Array(5000).fill(null).map((_, index) => ({
  name: `User ${index}`,
  email: `user${index}@example.com`,
  status: "active",
}));

const bulkResults = await bulkInsertUsers(largeUserList);
```

### Bulk Update

```javascript
// Update multiple records with different values
async function bulkUpdateUsers(updates) {
  const results = [];

  for (const update of updates) {
    const result = await db
      .table("users")
      .where("id", update.id)
      .update(update.data);
    results.push(result);
  }

  return results;
}

// Usage
const userUpdates = [
  { id: 1, data: { name: "John Updated", status: "premium" } },
  { id: 2, data: { name: "Jane Updated", status: "premium" } },
  { id: 3, data: { name: "Bob Updated", status: "basic" } },
];

const updateResults = await bulkUpdateUsers(userUpdates);
```

### Transaction-based Batch Operations

```javascript
// Batch operations within transaction
async function batchOperationsInTransaction() {
  const transaction = await db.transaction();

  try {
    // Insert new users
    const newUsers = await transaction.table("users").insert([
      { name: "User A", email: "a@example.com" },
      { name: "User B", email: "b@example.com" },
    ]);

    // Update existing users
    await transaction
      .table("users")
      .whereIn("id", [1, 2, 3])
      .update({ updated_at: new Date() });

    // Delete old records
    await transaction
      .table("logs")
      .where("created_at", "<", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .delete();

    await transaction.commit();
    console.log("Batch operations completed successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Batch operations failed:", error);
    throw error;
  }
}
```

## UPSERT Operations

### Insert or Update

```javascript
// Upsert (insert or update if exists)
const upsertResult = await db.table("user_preferences").upsert({
  user_id: 1,
  preference_key: "theme",
  preference_value: "dark",
});

// Multiple upserts
const multipleUpserts = await db.table("settings").upsert([
  { key: "site_title", value: "My Website" },
  { key: "max_users", value: "1000" },
  { key: "maintenance_mode", value: "false" },
]);
```

### Custom Upsert Logic

```javascript
// Manual upsert with custom logic
async function customUpsert(table, data, conflictColumn) {
  const existing = await db
    .table(table)
    .where(conflictColumn, data[conflictColumn])
    .first();

  if (existing) {
    // Update existing record
    const updateData = { ...data };
    delete updateData[conflictColumn]; // Remove conflict column from update
    updateData.updated_at = new Date();

    return await db
      .table(table)
      .where(conflictColumn, data[conflictColumn])
      .update(updateData);
  } else {
    // Insert new record
    data.created_at = new Date();
    data.updated_at = new Date();
    return await db.table(table).insert(data);
  }
}

// Usage
const result = await customUpsert(
  "users",
  {
    email: "unique@example.com",
    name: "Unique User",
    status: "active",
  },
  "email",
);
```

## Data Validation and Error Handling

### Safe Insert with Validation

```javascript
async function safeInsertUser(userData) {
  try {
    // Validate required fields
    if (!userData.name || !userData.email) {
      throw new Error("Name and email are required");
    }

    // Check for existing email
    const existingUser = await db
      .table("users")
      .where("email", userData.email)
      .first();

    if (existingUser) {
      throw new Error("Email already exists");
    }

    // Insert user
    const result = await db.table("users").insert({
      ...userData,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return { success: true, insertId: result.insertId };
  } catch (error) {
    console.error("Failed to insert user:", error.message);
    return { success: false, error: error.message };
  }
}
```

### Safe Update with Concurrency Check

```javascript
async function safeUpdateUser(userId, updateData, expectedVersion) {
  const transaction = await db.transaction();

  try {
    // Check current version
    const currentUser = await transaction
      .table("users")
      .where("id", userId)
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    if (currentUser.version !== expectedVersion) {
      throw new Error("User has been modified by another process");
    }

    // Update with version increment
    const result = await transaction
      .table("users")
      .where("id", userId)
      .where("version", expectedVersion)
      .update({
        ...updateData,
        version: currentUser.version + 1,
        updated_at: new Date(),
      });

    if (result.affectedRows === 0) {
      throw new Error("Update failed - concurrent modification detected");
    }

    await transaction.commit();
    return { success: true, affectedRows: result.affectedRows };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

## Best Practices

### Use Transactions for Related Operations

```javascript
// Good: Use transaction for related operations
async function transferFunds(fromUserId, toUserId, amount) {
  const transaction = await db.transaction();

  try {
    // Deduct from sender
    await transaction
      .table("accounts")
      .where("user_id", fromUserId)
      .decrement("balance", amount);

    // Add to receiver
    await transaction
      .table("accounts")
      .where("user_id", toUserId)
      .increment("balance", amount);

    // Log transaction
    await transaction.table("transaction_log").insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount: amount,
      created_at: new Date(),
    });

    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### Efficient Batch Processing

```javascript
// Good: Process in batches to avoid memory issues
async function processLargeDataset(dataArray, batchSize = 1000) {
  const results = [];

  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);

    try {
      const batchResult = await db.table("processed_data").insert(batch);
      results.push(batchResult);

      // Optional: Add delay to prevent overwhelming database
      if (i + batchSize < dataArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
      throw error;
    }
  }

  return results;
}
```

## Related Documentation

- [Basic Queries](./basic-queries.md) - SELECT operations
- [JOIN Examples](./joins.md) - Table joining operations
- [Transactions](./transactions.md) - Transaction handling
- [Builder API](../api/Builder.md) - Complete query builder reference
