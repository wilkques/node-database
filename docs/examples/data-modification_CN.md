# 数据修改示例

本文档提供了INSERT、UPDATE、DELETE等数据修改操作的详细示例。

## 目录

1. [INSERT - 插入数据](#insert---插入数据)
2. [UPDATE - 更新数据](#update---更新数据)
3. [DELETE - 删除数据](#delete---删除数据)
4. [INCREMENT和DECREMENT](#increment和decrement)
5. [批量操作](#批量操作)
6. [插入和更新的返回值](#插入和更新的返回值)
7. [错误处理](#错误处理)
8. [实际场景](#实际场景)

---

## INSERT - 插入数据

### 插入单条记录

#### 基本插入

```javascript
// 插入一个新用户
const result = await db.table("users").insert({
  name: "John Doe",
  email: "john@example.com",
  status: "active",
  created_at: new Date(),
});

console.log(result);
// 输出:
// {
//   insertId: 1,
//   affectedRows: 1
// }

console.log("用户ID:", result.insertId);
```

#### 指定所有字段

```javascript
// 完整字段插入
const user = await db.table("users").insert({
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "123-456-7890",
  status: "pending",
  verified: false,
  created_at: new Date(),
  updated_at: new Date(),
});
```

#### 只指定某些字段

```javascript
// 其他字段会使用数据库默认值
const minimalInsert = await db.table("users").insert({
  name: "Bob Johnson",
  email: "bob@example.com",
  // status 会使用数据库的默认值
  // created_at 会使用数据库的默认值（CURRENT_TIMESTAMP）
});
```

### 批量插入

#### 插入多条记录

```javascript
// 批量插入用户
const users = [
  {
    name: "Alice",
    email: "alice@example.com",
    status: "active",
    created_at: new Date(),
  },
  {
    name: "Bob",
    email: "bob@example.com",
    status: "active",
    created_at: new Date(),
  },
  {
    name: "Charlie",
    email: "charlie@example.com",
    status: "pending",
    created_at: new Date(),
  },
];

const result = await db.table("users").insert(users);

console.log(result);
// 输出:
// {
//   insertId: 1,  // 第一条记录的ID
//   affectedRows: 3  // 插入的总行数
// }

console.log(`已插入${result.affectedRows}条用户记录`);
```

#### 大批量插入

```javascript
// 为了性能，可以分批插入
async function bulkInsertUsers(allUsers, batchSize = 1000) {
  for (let i = 0; i < allUsers.length; i += batchSize) {
    const batch = allUsers.slice(i, i + batchSize);
    await db.table("users").insert(batch);
    console.log(
      `已插入 ${Math.min(i + batchSize, allUsers.length)} / ${allUsers.length}`,
    );
  }
}

// 生成10,000个用户并分批插入
const usersToInsert = Array.from({ length: 10000 }, (_, i) => ({
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  status: "active",
  created_at: new Date(),
}));

await bulkInsertUsers(usersToInsert);
```

### 使用DEFAULT值

```javascript
// 某些字段使用数据库定义的默认值
const product = await db.table("products").insert({
  name: "Product A",
  price: 99.99,
  stock: 100,
  // status 使用数据库默认值
  // created_at 使用数据库的 CURRENT_TIMESTAMP
});
```

---

## UPDATE - 更新数据

### 更新单条记录

#### 按主键更新

```javascript
// 更新特定用户
const result = await db.table("users").where("id", 1).update({
  name: "John Smith",
  email: "john.smith@example.com",
  updated_at: new Date(),
});

console.log(result);
// 输出:
// {
//   affectedRows: 1
// }
```

#### 使用find()快速更新

```javascript
// find() 是 where('id', ...) 的快捷方式
const result = await db.table("users").find(1).update({
  status: "inactive",
  last_login: new Date(),
});
```

### 条件更新

#### 多条件更新

```javascript
// 更新所有状态为pending的订单
const result = await db.table("orders").where("status", "pending").update({
  status: "processing",
  updated_at: new Date(),
});

console.log(`更新了${result.affectedRows}条订单`);
```

#### 复杂条件更新

```javascript
// 更新所有inactive且超过30天未登录的用户
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const result = await db
  .table("users")
  .where("status", "inactive")
  .where("last_login", "<", thirtyDaysAgo)
  .update({
    status: "archived",
  });

console.log(`已归档${result.affectedRows}个旧账户`);
```

### 使用表达式更新

#### 增加字段值

```javascript
// 将库存增加10
const result = await db
  .table("products")
  .where("id", 5)
  .update({
    stock: db.raw("stock + 10"),
    updated_at: new Date(),
  });
```

#### 计算字段

```javascript
// 重新计算产品的平均评分
const result = await db
  .table("products")
  .where("id", 5)
  .update({
    avg_rating: db.raw(
      `(SELECT AVG(rating) FROM reviews WHERE product_id = 5)`,
    ),
    updated_at: new Date(),
  });
```

#### 根据其他表更新

```javascript
// 基于另一个表的值更新（JOIN UPDATE）
// 更新每个用户的订单数
const result = await db.table("users as u").update({
  order_count: db.raw(`(SELECT COUNT(*) FROM orders WHERE user_id = u.id)`),
  updated_at: new Date(),
});
```

### 部分字段更新

```javascript
// 只更新需要改变的字段
const result = await db
  .table("users")
  .where("id", 1)
  .update({
    last_login: new Date(),
    login_count: db.raw("login_count + 1"),
    // 其他字段保持不变
  });
```

---

## DELETE - 删除数据

### 删除单条记录

```javascript
// 删除特定用户
const result = await db.table("users").where("id", 1).delete();

console.log(result);
// 输出:
// {
//   affectedRows: 1
// }
```

### 条件删除

#### 删除多条记录

```javascript
// 删除所有inactive用户
const result = await db.table("users").where("status", "inactive").delete();

console.log(`已删除${result.affectedRows}个用户`);
```

#### 删除过期数据

```javascript
// 删除超过一年的日志
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

const result = await db
  .table("logs")
  .where("created_at", "<", oneYearAgo)
  .delete();

console.log(`已清理${result.affectedRows}条旧日志`);
```

#### 复杂条件删除

```javascript
// 删除没有订单且创建时间超过90天的用户
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const result = await db
  .table("users as u")
  .where("u.created_at", "<", ninetyDaysAgo)
  .where(
    (query) => {
      query
        .table("orders")
        .select(db.raw("1"))
        .whereRaw("orders.user_id = u.id");
    },
    "=",
    0,
  ) // 没有任何订单
  .delete();

console.log(`已删除${result.affectedRows}个不活跃的用户`);
```

### 删除中的风险

#### 使用软删除替代硬删除

```javascript
// ✅ 推荐：软删除（标记为已删除，不实际删除）
const softDelete = await db.table("users").where("id", 1).update({
  deleted_at: new Date(),
});

// 查询时排除已删除的记录
const activeUsers = await db.table("users").whereNull("deleted_at").get();

// ❌ 避免：硬删除（永久删除，可能导致外键约束错误）
// const hardDelete = await db.table('users').where('id', 1).delete();
```

#### 级联删除

```javascript
// 在删除用户前，先删除相关订单
async function deleteUserSafely(userId) {
  const transaction = await db.transaction();

  try {
    // 先删除订单
    await transaction.table("orders").where("user_id", userId).delete();

    // 再删除用户
    await transaction.table("users").where("id", userId).delete();

    await transaction.commit();
    console.log("✅ 用户已安全删除");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 删除失败:", error.message);
  }
}

await deleteUserSafely(1);
```

---

## INCREMENT和DECREMENT

### 递增字段

```javascript
// 增加用户的登录次数
const result = await db.table("users").where("id", 1).increment("login_count");

// 增加指定数量
const result2 = await db
  .table("users")
  .where("id", 1)
  .increment("login_count", 5);

// 增加多个字段
const result3 = await db.table("users").where("id", 1).increment({
  login_count: 1,
  points: 10,
});
```

### 递减字段

```javascript
// 减少库存
const result = await db.table("products").where("id", 5).decrement("stock");

// 减少指定数量
const result2 = await db.table("products").where("id", 5).decrement("stock", 2);

// 减少多个字段
const result3 = await db.table("orders").where("id", 1).decrement({
  quantity: 1,
  total_amount: 9.99,
});
```

### 实际应用

```javascript
// 处理库存：每次有新订单就减少库存
async function createOrder(userId, productId, quantity) {
  // 减少产品库存
  await db
    .table("products")
    .where("id", productId)
    .decrement("stock", quantity);

  // 创建订单
  const order = await db.table("orders").insert({
    user_id: userId,
    product_id: productId,
    quantity: quantity,
    status: "pending",
    created_at: new Date(),
  });

  // 增加用户的购买次数
  await db.table("users").where("id", userId).increment("total_orders");

  return order;
}
```

---

## 批量操作

### 批量更新不同的值

```javascript
// 批量更新：为不同的订单设置不同的状态
async function updateOrdersWithDifferentStatus(updates) {
  // updates: [
  //   { id: 1, status: 'shipped', shipping_date: '2024-01-01' },
  //   { id: 2, status: 'delivered', delivered_date: '2024-01-05' },
  //   { id: 3, status: 'cancelled', reason: 'Customer request' }
  // ]

  for (const update of updates) {
    const { id, ...data } = update;
    await db
      .table("orders")
      .where("id", id)
      .update({
        ...data,
        updated_at: new Date(),
      });
  }
}
```

### 批量插入后获取ID

```javascript
// 插入后获取所有插入的记录ID
async function bulkInsertAndGetIds(records) {
  const result = await db.table("products").insert(records);

  // 获取插入的所有记录
  const inserted = await db
    .table("products")
    .where("id", ">=", result.insertId)
    .where("id", "<", result.insertId + result.affectedRows)
    .select("id", "name")
    .get();

  return inserted;
}

const newProducts = await bulkInsertAndGetIds([
  { name: "Product 1", price: 10 },
  { name: "Product 2", price: 20 },
  { name: "Product 3", price: 30 },
]);

console.log(newProducts);
```

---

## 插入和更新的返回值

### INSERT返回值

```javascript
const result = await db.table("users").insert({
  name: "John",
  email: "john@example.com",
});

console.log(result);
// {
//   insertId: 1,        // 新插入记录的ID（仅对AUTO_INCREMENT有效）
//   affectedRows: 1,    // 插入的行数
//   warningCount: 0,    // 警告数
//   message: ''         // 消息
// }
```

### UPDATE返回值

```javascript
const result = await db.table("users").where("id", 1).update({ name: "Jane" });

console.log(result);
// {
//   affectedRows: 1,        // 受影响的行数
//   changedRows: 1,         // 实际改变的行数（可能 <= affectedRows）
//   warningCount: 0,        // 警告数
//   message: ''             // 消息
// }
```

### DELETE返回值

```javascript
const result = await db.table("users").where("status", "inactive").delete();

console.log(result);
// {
//   affectedRows: 5,        // 删除的行数
//   warningCount: 0,        // 警告数
//   message: ''             // 消息
// }
```

---

## 错误处理

### 处理约束错误

```javascript
try {
  // 尝试插入重复的邮箱（假设有UNIQUE约束）
  await db.table("users").insert({
    name: "John",
    email: "john@example.com",
  });

  // 再次插入相同邮箱会失败
  await db.table("users").insert({
    name: "Jane",
    email: "john@example.com", // 重复！
  });
} catch (error) {
  if (error.code === "ER_DUP_ENTRY") {
    console.error("❌ 邮箱已存在");
  } else if (error.code === "ER_NO_REFERENCED_ROW") {
    console.error("❌ 外键约束失败");
  } else {
    console.error("❌ 数据库错误:", error.message);
  }
}
```

### 验证数据

```javascript
async function insertUserWithValidation(userData) {
  // 验证必填字段
  if (!userData.name || !userData.email) {
    throw new Error("name和email是必填的");
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    throw new Error("邮箱格式不正确");
  }

  // 检查邮箱是否已存在
  const existing = await db
    .table("users")
    .where("email", userData.email)
    .first();

  if (existing) {
    throw new Error("该邮箱已被注册");
  }

  // 验证通过，执行插入
  return await db.table("users").insert({
    ...userData,
    created_at: new Date(),
  });
}
```

---

## 实际场景

### 场景1：订单处理流程

```javascript
async function processOrder(userId, items) {
  const transaction = await db.transaction();

  try {
    // 1. 创建订单
    const order = await transaction.table("orders").insert({
      user_id: userId,
      status: "pending",
      total_amount: items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      created_at: new Date(),
    });

    // 2. 添加订单项
    const orderItems = items.map((item) => ({
      order_id: order.insertId,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    await transaction.table("order_items").insert(orderItems);

    // 3. 减少库存
    for (const item of items) {
      await transaction
        .table("products")
        .where("id", item.productId)
        .decrement("stock", item.quantity);
    }

    // 4. 更新用户统计
    await transaction.table("users").where("id", userId).increment({
      total_orders: 1,
      total_spent: order.total_amount,
    });

    await transaction.commit();
    console.log("✅ 订单处理成功");
    return order;
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 订单处理失败:", error.message);
    throw error;
  }
}
```

### 场景2：用户注册

```javascript
async function registerUser(userData) {
  const transaction = await db.transaction();

  try {
    // 1. 创建用户
    const user = await transaction.table("users").insert({
      name: userData.name,
      email: userData.email,
      password: userData.passwordHash,
      status: "pending_verification",
      created_at: new Date(),
    });

    // 2. 创建用户档案
    await transaction.table("user_profiles").insert({
      user_id: user.insertId,
      bio: "",
      avatar: null,
      created_at: new Date(),
    });

    // 3. 创建欢迎通知
    await transaction.table("notifications").insert({
      user_id: user.insertId,
      type: "welcome",
      message: "欢迎加入我们！",
      created_at: new Date(),
    });

    await transaction.commit();
    console.log("✅ 用户注册成功");
    return user;
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 注册失败:", error.message);
    throw error;
  }
}
```

### 场景3：数据清理

```javascript
async function cleanupOldData() {
  const transaction = await db.transaction();

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // 1. 清理过期会话
    const sessionCount = await transaction
      .table("sessions")
      .where("expires_at", "<", new Date())
      .delete();

    console.log(`已清理 ${sessionCount.affectedRows} 条过期会话`);

    // 2. 归档旧日志
    const logCount = await transaction
      .table("logs")
      .where("created_at", "<", ninetyDaysAgo)
      .update({
        archived: true,
        archived_at: new Date(),
      });

    console.log(`已归档 ${logCount.affectedRows} 条旧日志`);

    // 3. 删除未完成的临时订单
    const tempOrderCount = await transaction
      .table("orders")
      .where("status", "pending")
      .where("created_at", "<", ninetyDaysAgo)
      .delete();

    console.log(`已删除 ${tempOrderCount.affectedRows} 个过期订单`);

    await transaction.commit();
    console.log("✅ 数据清理完成");
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 清理失败:", error.message);
    throw error;
  }
}
```

### 场景4：数据迁移

```javascript
async function migrateUserData() {
  const transaction = await db.transaction();

  try {
    // 1. 获取所有需要迁移的用户
    const users = await transaction.table("users").where("version", "1").get();

    // 2. 为每个用户创建新的记录结构
    for (const user of users) {
      // 创建新的用户档案
      await transaction.table("user_profiles_v2").insert({
        legacy_id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        created_at: user.created_at,
      });
    }

    // 3. 更新原始表标记迁移完成
    await transaction.table("users").where("version", "1").update({
      version: "2",
      migrated_at: new Date(),
    });

    await transaction.commit();
    console.log(`✅ 已迁移 ${users.length} 个用户`);
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 迁移失败:", error.message);
    throw error;
  }
}
```

---

## 最佳实践

### 1. 始终使用事务处理多步操作

```javascript
// ✅ 推荐
const transaction = await db.transaction();
try {
    // 多个操作
    await transaction.table(...).insert(...);
    await transaction.table(...).update(...);
    await transaction.commit();
} catch (error) {
    await transaction.rollback();
}

// ❌ 避免：多个独立的数据库调用容易导致数据不一致
```

### 2. 验证数据再修改

```javascript
// ✅ 推荐
const user = await db.table("users").find(userId);
if (!user) throw new Error("用户不存在");

await db.table("users").where("id", userId).update(newData);

// ❌ 避免：直接修改而不检查
```

### 3. 使用软删除而不是硬删除

```javascript
// ✅ 推荐：软删除
await db.table("users").where("id", 1).update({ deleted_at: new Date() });

// ❌ 避免：硬删除（除非确实需要永久删除）
// await db.table('users').where('id', 1).delete();
```

### 4. 在修改敏感数据时记录审计日志

```javascript
async function updateUserSensitiveData(userId, changes) {
  const transaction = await db.transaction();

  try {
    // 记录审计日志
    await transaction.table("audit_logs").insert({
      user_id: userId,
      action: "update",
      changes: JSON.stringify(changes),
      timestamp: new Date(),
    });

    // 执行更新
    await transaction.table("users").where("id", userId).update(changes);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```
