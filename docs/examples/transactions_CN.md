# 事务处理示例

本文档提供了数据库事务的详细示例，包括基础事务、高级用法和错误处理。

## 目录

1. [事务基础](#事务基础)
2. [基本事务](#基本事务)
3. [事务中的错误处理](#事务中的错误处理)
4. [嵌套事务](#嵌套事务)
5. [保存点（SAVEPOINT）](#保存点savepoint)
6. [隔离级别](#隔离级别)
7. [实际场景](#实际场景)
8. [常见问题](#常见问题)

---

## 事务基础

### 什么是事务？

事务是一系列数据库操作的逻辑单位，要么全部成功（COMMIT），要么全部失败（ROLLBACK）。事务确保数据的一致性和完整性。

### ACID属性

| 属性                      | 说明                                     | 例子                                         |
| ------------------------- | ---------------------------------------- | -------------------------------------------- |
| **A**tomicity（原子性）   | 事务的所有操作要么全部完成，要么全部失败 | 转账时，扣款和入账必须同时成功或同时失败     |
| **C**onsistency（一致性） | 事务前后数据保持一致                     | 账户总额在转账前后保持相同                   |
| **I**solation（隔离性）   | 并发事务互不影响                         | 一个用户的转账不会看到另一个用户未完成的操作 |
| **D**urability（持久性）  | 已提交的事务数据永久保存                 | COMMIT后，即使断电数据也不会丢失             |

---

## 基本事务

### 最简单的事务

```javascript
// 启动事务
const transaction = await db.transaction();

try {
  // 在事务中执行操作
  const result = await transaction.table("users").insert({
    name: "John Doe",
    email: "john@example.com",
    created_at: new Date(),
  });

  // 其他操作
  await transaction.table("audit_logs").insert({
    action: "user_created",
    user_id: result.insertId,
    timestamp: new Date(),
  });

  // 提交事务 - 所有更改将被保存
  await transaction.commit();
  console.log("✅ 事务提交成功");
} catch (error) {
  // 回滚事务 - 所有更改将被撤销
  await transaction.rollback();
  console.error("❌ 事务回滚:", error.message);
}
```

### 事务的执行流程

```
1. BEGIN TRANSACTION
   ↓
2. 执行多个操作
   - INSERT
   - UPDATE
   - DELETE
   ↓
3. IF (所有操作成功) THEN
     COMMIT (提交，数据保存)
   ELSE
     ROLLBACK (回滚，撤销所有更改)
```

### 事务中的查询操作

```javascript
const transaction = await db.transaction();

try {
  // 读取操作
  const user = await transaction.table("users").find(1);
  console.log("当前用户:", user);

  // 根据读取的数据进行修改
  const newBalance = user.balance - 100;

  if (newBalance < 0) {
    throw new Error("余额不足");
  }

  // 执行更新
  await transaction
    .table("users")
    .where("id", 1)
    .update({ balance: newBalance });

  await transaction.commit();
  console.log("✅ 扣款成功");
} catch (error) {
  await transaction.rollback();
  console.error("❌ 扣款失败:", error.message);
}
```

---

## 事务中的错误处理

### try-catch处理

```javascript
async function transferMoney(fromUserId, toUserId, amount) {
  const transaction = await db.transaction();

  try {
    // 从账户扣款
    const fromUser = await transaction.table("users").find(fromUserId);
    if (fromUser.balance < amount) {
      throw new Error("余额不足");
    }

    await transaction
      .table("users")
      .where("id", fromUserId)
      .decrement("balance", amount);

    // 到账户入款
    await transaction
      .table("users")
      .where("id", toUserId)
      .increment("balance", amount);

    // 记录交易
    await transaction.table("transactions").insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      amount: amount,
      status: "completed",
      created_at: new Date(),
    });

    // 提交事务
    await transaction.commit();
    console.log(`✅ 转账成功：${amount}元`);
    return { success: true, message: "转账成功" };
  } catch (error) {
    // 发生错误时回滚
    await transaction.rollback();
    console.error("❌ 转账失败:", error.message);
    return { success: false, message: error.message };
  }
}

// 使用
const result = await transferMoney(1, 2, 100);
if (!result.success) {
  // 处理错误
}
```

### 区分不同类型的错误

```javascript
async function processPayment(orderId, paymentData) {
  const transaction = await db.transaction();

  try {
    // 验证订单
    const order = await transaction.table("orders").find(orderId);
    if (!order) {
      throw new Error("ORDER_NOT_FOUND"); // 业务错误
    }

    if (order.status !== "pending") {
      throw new Error("ORDER_ALREADY_PAID"); // 业务错误
    }

    // 处理支付
    const payment = await transaction.table("payments").insert({
      order_id: orderId,
      amount: paymentData.amount,
      method: paymentData.method,
      status: "processing",
      created_at: new Date(),
    });

    // 更新订单状态
    await transaction.table("orders").where("id", orderId).update({
      status: "paid",
      payment_id: payment.insertId,
    });

    await transaction.commit();
    return { success: true };
  } catch (error) {
    await transaction.rollback();

    // 根据错误类型返回不同的响应
    if (error.message === "ORDER_NOT_FOUND") {
      return { success: false, error: "order_not_found" };
    } else if (error.message === "ORDER_ALREADY_PAID") {
      return { success: false, error: "order_already_paid" };
    } else {
      return { success: false, error: "payment_failed" };
    }
  }
}
```

### 重试机制

```javascript
async function executeWithRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const transaction = await db.transaction();

    try {
      const result = await operation(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();

      // 如果是最后一次尝试，则抛出错误
      if (attempt === maxRetries) {
        throw error;
      }

      // 根据错误类型决定是否重试
      if (error.code === "DEADLOCK_DETECTED") {
        console.log(`🔄 死锁，重试 (${attempt}/${maxRetries})`);
        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      } else {
        // 其他错误不重试
        throw error;
      }
    }
  }
}

// 使用
const result = await executeWithRetry(async (transaction) => {
  const user = await transaction.table("users").find(1);
  await transaction.table("users").where("id", 1).increment("points", 10);
  return user;
});
```

---

## 嵌套事务

### 嵌套事务的注意事项

```javascript
// 并非所有数据库都支持真正的嵌套事务
// MySQL、PostgreSQL、SQLite的支持情况不同

async function outerTransaction() {
  const transaction = await db.transaction();

  try {
    // 外层事务操作
    const user = await transaction.table("users").insert({
      name: "User 1",
    });

    // 内层事务（如果支持）
    try {
      await transaction.table("profiles").insert({
        user_id: user.insertId,
        bio: "Bio text",
      });
    } catch (innerError) {
      // 内层错误处理
      console.error("内层操作失败:", innerError.message);
      // 可以选择继续或放弃整个事务
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("外层事务失败:", error.message);
  }
}
```

---

## 保存点(SAVEPOINT)

### 使用保存点进行部分回滚

```javascript
const transaction = await db.transaction();

try {
  // 操作1
  const user = await transaction.table("users").insert({
    name: "John",
    email: "john@example.com",
  });

  // 创建保存点
  const savepoint1 = await transaction.savepoint("after_user_insert");

  try {
    // 操作2 - 在保存点后执行
    await transaction.table("profiles").insert({
      user_id: user.insertId,
      bio: "Invalid bio", // 假设这会失败
    });
  } catch (error) {
    // 只回滚到保存点，不回滚整个事务
    await transaction.rollbackToSavepoint("after_user_insert");
    console.log("✅ 操作2回滚，但用户插入保留");
  }

  // 继续其他操作
  await transaction.table("audit_logs").insert({
    user_id: user.insertId,
    action: "profile_creation_attempted",
  });

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  console.error("❌ 事务失败:", error.message);
}
```

---

## 隔离级别

### 隔离级别概述

```javascript
// MySQL中的四种隔离级别

const levels = {
  "READ UNCOMMITTED": "最低级别，可能读取未提交的数据",
  "READ COMMITTED": "只能读取已提交的数据（默认）",
  "REPEATABLE READ": "同一事务中读取的数据保持一致",
  SERIALIZABLE: "最高级别，完全隔离",
};
```

### 设置隔离级别

```javascript
async function operationWithIsolationLevel() {
  const transaction = await db.transaction();

  try {
    // 设置隔离级别为REPEATABLE READ
    // 注意：具体的API可能因驱动而异
    // 某些驱动可能通过连接配置设置隔离级别

    // 执行操作
    const user = await transaction.table("users").find(1);

    // 在这个事务期间，即使其他事务修改了user，
    // 这个事务再次读取user时看到的仍是相同的数据

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
}
```

### 隔离级别带来的问题

```javascript
// 脏读（Dirty Read）- READ UNCOMMITTED可能出现
// 一个事务读取了另一个未提交事务的数据

// 不可重复读（Non-repeatable Read）
// 一个事务中两次读取同一行数据，结果不同

// 幻读（Phantom Read）- REPEATABLE READ可能出现
// 一个事务中两次查询结果的行数不同

async function demonstratePhantomRead() {
  const transaction = await db.transaction();

  try {
    // 第一次查询
    let activeUsers = await transaction
      .table("users")
      .where("status", "active")
      .count();
    console.log("第一次查询，活跃用户数:", activeUsers); // 假设结果是10

    // 在这期间，其他事务可能插入了新的活跃用户

    // 第二次查询
    activeUsers = await transaction
      .table("users")
      .where("status", "active")
      .count();
    console.log("第二次查询，活跃用户数:", activeUsers); // 可能是11（幻读）

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
}
```

---

## 实际场景

### 场景1：电商订单处理

```javascript
async function createOrderWithTransaction(userId, items) {
  const transaction = await db.transaction();

  try {
    // 1. 创建订单记录
    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const order = await transaction.table("orders").insert({
      user_id: userId,
      status: "pending",
      total_amount: totalAmount,
      created_at: new Date(),
    });

    console.log(`📦 订单已创建，ID: ${order.insertId}`);

    // 2. 添加订单项目
    for (const item of items) {
      await transaction.table("order_items").insert({
        order_id: order.insertId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity,
      });

      // 3. 更新产品库存
      await transaction
        .table("products")
        .where("id", item.productId)
        .decrement("stock", item.quantity);

      console.log(`📉 产品${item.productId}库存已减少${item.quantity}`);
    }

    // 4. 更新用户统计
    await transaction.table("users").where("id", userId).increment({
      total_orders: 1,
      total_spent: totalAmount,
    });

    console.log(`👤 用户${userId}统计已更新`);

    // 5. 创建支付记录
    const payment = await transaction.table("payments").insert({
      order_id: order.insertId,
      amount: totalAmount,
      method: "pending",
      status: "awaiting_payment",
      created_at: new Date(),
    });

    console.log(`💳 支付记录已创建`);

    // 所有操作成功，提交事务
    await transaction.commit();
    console.log("✅ 订单创建事务完成");

    return {
      success: true,
      orderId: order.insertId,
      totalAmount: totalAmount,
    };
  } catch (error) {
    // 任何操作失败都会回滚所有更改
    await transaction.rollback();
    console.error("❌ 订单创建失败，所有更改已回滚:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

// 使用示例
const result = await createOrderWithTransaction(1, [
  { productId: 5, quantity: 2, price: 29.99 },
  { productId: 10, quantity: 1, price: 49.99 },
]);

if (result.success) {
  console.log(`订单${result.orderId}总金额：$${result.totalAmount}`);
}
```

### 场景2：账户转账

```javascript
async function transferFunds(fromAccountId, toAccountId, amount) {
  const transaction = await db.transaction();

  try {
    // 1. 检查出账账户余额
    const fromAccount = await transaction
      .table("accounts")
      .where("id", fromAccountId)
      .first();

    if (!fromAccount) {
      throw new Error("源账户不存在");
    }

    if (fromAccount.balance < amount) {
      throw new Error("余额不足");
    }

    // 2. 检查收账账户是否存在
    const toAccount = await transaction
      .table("accounts")
      .where("id", toAccountId)
      .first();

    if (!toAccount) {
      throw new Error("目标账户不存在");
    }

    // 3. 扣款（从出账账户）
    await transaction
      .table("accounts")
      .where("id", fromAccountId)
      .decrement("balance", amount);

    // 4. 入账（到收账账户）
    await transaction
      .table("accounts")
      .where("id", toAccountId)
      .increment("balance", amount);

    // 5. 记录交易历史
    const transfer = await transaction.table("transfers").insert({
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount: amount,
      status: "completed",
      created_at: new Date(),
    });

    // 6. 更新账户的最后交易时间
    await transaction
      .table("accounts")
      .where("id", fromAccountId)
      .update({ last_transaction_at: new Date() });

    await transaction
      .table("accounts")
      .where("id", toAccountId)
      .update({ last_transaction_at: new Date() });

    // 提交事务
    await transaction.commit();

    console.log(
      `✅ 转账完成：从账户${fromAccountId}转${amount}元到账户${toAccountId}`,
    );

    return {
      success: true,
      transferId: transfer.insertId,
      amount: amount,
    };
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 转账失败:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

// 使用
const transfer = await transferFunds(101, 102, 1000);
```

### 场景3：库存预留和确认

```javascript
async function reserveAndConfirmInventory(orderId, items) {
  const transaction = await db.transaction();
  const reservations = [];

  try {
    console.log("📦 开始库存预留流程...");

    // 阶段1：预留库存
    for (const item of items) {
      const product = await transaction
        .table("products")
        .where("id", item.productId)
        .first();

      if (!product || product.stock < item.quantity) {
        throw new Error(`产品${item.productId}库存不足`);
      }

      // 创建预留记录
      const reservation = await transaction
        .table("inventory_reservations")
        .insert({
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          status: "reserved",
          reserved_at: new Date(),
        });

      reservations.push(reservation.insertId);
      console.log(`✅ 产品${item.productId}已预留${item.quantity}件`);
    }

    // 阶段2：执行库存扣减
    for (const item of items) {
      await transaction
        .table("products")
        .where("id", item.productId)
        .decrement("stock", item.quantity);

      console.log(`📉 产品${item.productId}库存已扣减${item.quantity}件`);
    }

    // 阶段3：更新订单和预留状态
    await transaction.table("orders").where("id", orderId).update({
      status: "inventory_confirmed",
      confirmed_at: new Date(),
    });

    for (const reservationId of reservations) {
      await transaction
        .table("inventory_reservations")
        .where("id", reservationId)
        .update({
          status: "confirmed",
          confirmed_at: new Date(),
        });
    }

    // 提交事务
    await transaction.commit();
    console.log("✅ 库存预留和确认流程完成");

    return { success: true, reservations: reservations };
  } catch (error) {
    // 回滚会自动撤销所有预留和扣减
    await transaction.rollback();
    console.error("❌ 库存操作失败，所有预留已取消:", error.message);

    return { success: false, error: error.message };
  }
}
```

### 场景4：数据同步

```javascript
async function syncDataBetweenTables() {
  const transaction = await db.transaction();

  try {
    console.log("🔄 开始数据同步...");

    // 从源表读取数据
    const sourceData = await transaction
      .table("source_table")
      .where("synced", false)
      .get();

    console.log(`📖 读取${sourceData.length}条未同步数据`);

    // 批量插入到目标表
    if (sourceData.length > 0) {
      const targetData = sourceData.map((row) => ({
        external_id: row.id,
        name: row.name,
        value: row.value,
        synced_at: new Date(),
      }));

      await transaction.table("target_table").insert(targetData);
      console.log(`✅ 已插入${sourceData.length}条数据到目标表`);
    }

    // 标记源表的数据为已同步
    const updateResult = await transaction
      .table("source_table")
      .where("synced", false)
      .update({
        synced: true,
        synced_at: new Date(),
      });

    console.log(`✅ 标记${updateResult.affectedRows}条数据为已同步`);

    // 创建同步日志
    await transaction.table("sync_logs").insert({
      source_table: "source_table",
      target_table: "target_table",
      rows_synced: sourceData.length,
      synced_at: new Date(),
    });

    await transaction.commit();
    console.log("✅ 数据同步完成");

    return { success: true, rowsSynced: sourceData.length };
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 数据同步失败:", error.message);

    return { success: false, error: error.message };
  }
}
```

---

## 常见问题

### Q1: 事务超时了怎么办？

```javascript
// 解决方案：增加超时时间或分解大操作
async function operationWithTimeout() {
  const transaction = await db.transaction();

  try {
    // 分解大批量操作
    const items = await db.table("items").get();
    const batchSize = 100;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      for (const item of batch) {
        await transaction.table("processed_items").insert({
          item_id: item.id,
          processed_at: new Date(),
        });
      }

      console.log(
        `✅ 已处理${Math.min(i + batchSize, items.length)}/${items.length}条`,
      );
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 操作失败:", error.message);
  }
}
```

### Q2: 如何处理死锁？

```javascript
// 解决方案：按照一致的顺序访问资源
async function avoidDeadlock(userId1, userId2, amount) {
  // 确保总是以相同的顺序访问两个账户（按ID排序）
  const [first, second] =
    userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const transaction = await db.transaction();

  try {
    // 总是先操作ID较小的账户
    const account1 = await transaction
      .table("accounts")
      .where("id", first)
      .first();

    const account2 = await transaction
      .table("accounts")
      .where("id", second)
      .first();

    // 执行操作
    if (first === userId1) {
      await transaction
        .table("accounts")
        .where("id", first)
        .decrement("balance", amount);
      await transaction
        .table("accounts")
        .where("id", second)
        .increment("balance", amount);
    } else {
      await transaction
        .table("accounts")
        .where("id", first)
        .increment("balance", amount);
      await transaction
        .table("accounts")
        .where("id", second)
        .decrement("balance", amount);
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
  }
}
```

### Q3: 事务中可以进行多少操作？

```javascript
// 最佳实践：保持事务简洁，只包含必要的操作
// ✅ 推荐：相关的操作分组在一个事务中
const transaction = await db.transaction();
try {
  await transaction.table("orders").insert(orderData);
  await transaction.table("order_items").insert(itemsData);
  await transaction.table("inventory").update(inventoryData);
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}

// ❌ 避免：在一个事务中进行无关的大量操作
```
