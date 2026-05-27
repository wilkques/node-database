# 快速开始指南

## 介绍

欢迎使用数据库查询构建器！这是一个灵活、易用的Node.js数据库查询构建器，支持MySQL、PostgreSQL和SQLite。本指南将帮助你快速了解基本使用方式。

## 安装

```bash
npm install
```

### 数据库驱动安装

根据你使用的数据库，安装相应的驱动：

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg

# SQLite
npm install better-sqlite3
```

## 初始化连接

### 基本连接

创建数据库连接是使用查询构建器的第一步。使用 `Database.connect()` 方法建立连接。

```javascript
import Database from "./Database/index.js";

// 连接到MySQL
const db = await Database.connect({
  driver: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "myapp",
  charset: "utf8mb4",
});

console.log("✅ 数据库连接成功！");
```

### 不同数据库的连接方式

**PostgreSQL连接：**

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

**SQLite连接：**

```javascript
const db = await Database.connect({
  driver: "sqlite",
  filename: "./database.sqlite",
});
```

## 基本查询

### 简单SELECT查询

选择特定列的数据：

```javascript
// 查询所有用户的id、name和email
const users = await db.table("users").select("id", "name", "email").get();

console.log(users);
// 输出: [{ id: 1, name: 'John', email: 'john@example.com' }, ...]
```

### WHERE条件过滤

使用 `where()` 方法添加条件来过滤数据：

```javascript
// 查询所有活跃用户
const activeUsers = await db
  .table("users")
  .select("id", "name", "status")
  .where("status", "active")
  .get();

// 多条件查询（AND）
const results = await db
  .table("users")
  .where("status", "active")
  .where("age", ">", 18)
  .where("verified", true)
  .get();

// 使用OR条件
const premiumOrAdmin = await db
  .table("users")
  .where("role", "admin")
  .orWhere("premium", true)
  .get();
```

### 排序和分页

```javascript
// 按创建时间降序排列，获取最新的10条记录
const latestPosts = await db
  .table("posts")
  .select("id", "title", "created_at")
  .orderBy("created_at", "desc")
  .limit(10)
  .get();

// 分页查询：第2页，每页20条
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

### 聚合函数

```javascript
// 统计总数
const totalUsers = await db.table("users").count();
console.log(`总用户数：${totalUsers}`);

// 计算平均值
const avgAge = await db.table("users").avg("age");
console.log(`平均年龄：${avgAge}`);

// 获取最大值和最小值
const maxPrice = await db.table("products").max("price");
const minPrice = await db.table("products").min("price");

// 求和
const totalRevenue = await db.table("orders").sum("amount");

// 按组统计
const usersByStatus = await db
  .table("users")
  .select("status")
  .selectRaw("COUNT(*) as count")
  .groupBy("status")
  .get();
// 输出: [{ status: 'active', count: 150 }, { status: 'inactive', count: 50 }]
```

## JOIN操作

### 内连接（INNER JOIN）

```javascript
// 连接用户表和订单表
const userOrders = await db
  .table("users")
  .select("users.id", "users.name", "orders.order_number", "orders.amount")
  .join("orders", "users.id", "=", "orders.user_id")
  .get();
```

### 左连接（LEFT JOIN）

```javascript
// 获取所有用户及其订单（如果有的话）
const usersWithOrders = await db
  .table("users")
  .select("users.id", "users.name", "orders.order_number")
  .leftJoin("orders", "users.id", "=", "orders.user_id")
  .get();
```

### 多表连接

```javascript
// 连接多个表
const fullData = await db
  .table("users as u")
  .select("u.id", "u.name", "p.bio", "o.order_number", "o.amount")
  .leftJoin("profiles as p", "u.id", "=", "p.user_id")
  .leftJoin("orders as o", "u.id", "=", "o.user_id")
  .where("u.status", "active")
  .orderBy("o.created_at", "desc")
  .get();
```

## 数据修改

### 插入数据

```javascript
// 插入单条记录
const result = await db.table("users").insert({
  name: "Alice",
  email: "alice@example.com",
  status: "active",
  created_at: new Date(),
});

console.log("插入ID:", result.insertId);

// 批量插入
const users = [
  { name: "Bob", email: "bob@example.com", status: "active" },
  { name: "Charlie", email: "charlie@example.com", status: "active" },
  { name: "David", email: "david@example.com", status: "pending" },
];

const bulkResult = await db.table("users").insert(users);
console.log("插入行数:", bulkResult.affectedRows);
```

### 更新数据

```javascript
// 更新特定用户
const updateResult = await db.table("users").where("id", 1).update({
  name: "Alice Smith",
  updated_at: new Date(),
});

console.log("更新行数:", updateResult.affectedRows);

// 条件更新
const statusUpdateResult = await db
  .table("users")
  .where("age", "<", 18)
  .update({ status: "minor" });

// 递增字段值
const incrementResult = await db
  .table("users")
  .where("id", 1)
  .increment("login_count");

// 递减字段值
const decrementResult = await db
  .table("products")
  .where("id", 5)
  .decrement("stock", 2);
```

### 删除数据

```javascript
// 删除特定记录
const deleteResult = await db.table("users").where("id", 1).delete();

console.log("删除行数:", deleteResult.affectedRows);

// 条件删除
const expiredDeleteResult = await db
  .table("sessions")
  .where("expires_at", "<", new Date())
  .delete();
```

## 事务处理

事务确保一系列数据库操作要么全部成功，要么全部失败。这对于需要保证数据一致性的操作非常重要。

```javascript
// 开始事务
const transaction = await db.transaction();

try {
  // 在事务中执行操作
  const order = await transaction.table("orders").insert({
    user_id: 1,
    status: "pending",
    total_amount: 100,
  });

  // 减少库存
  await transaction.table("products").where("id", 5).decrement("stock", 2);

  // 记录库存变更
  await transaction.table("inventory_logs").insert({
    product_id: 5,
    quantity: -2,
    order_id: order.insertId,
    created_at: new Date(),
  });

  // 提交事务
  await transaction.commit();
  console.log("✅ 事务提交成功");
} catch (error) {
  // 发生错误时回滚事务
  await transaction.rollback();
  console.error("❌ 事务回滚:", error.message);
}
```

## 错误处理

### 基本错误处理

```javascript
try {
  const user = await db.table("users").where("id", 999).first();

  if (!user) {
    console.log("用户未找到");
  }
} catch (error) {
  console.error("数据库查询失败:", error.message);
}
```

### 连接错误处理

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
    console.error("❌ 数据库用户名或密码错误");
  } else if (error.code === "ECONNREFUSED") {
    console.error("❌ 无法连接到数据库，请检查服务是否运行");
  } else {
    console.error("❌ 连接失败:", error.message);
  }
}
```

## 常见模式和最佳实践

### 1. 安全的参数绑定

查询构建器自动处理参数绑定以防止SQL注入：

```javascript
// ✅ 安全 - 参数自动转义
const userInput = "'; DROP TABLE users; --";
const result = await db.table("users").where("name", userInput).get();

// ❌ 不安全 - 不要这样做（如果使用原始SQL）
// 如需使用原始SQL，必须手动转义参数
```

### 2. 使用原始SQL表达式

有时需要使用特定的SQL表达式：

```javascript
// 计算时间差
const recentPosts = await db
  .table("posts")
  .select(db.raw("*, DATEDIFF(NOW(), created_at) as days_old"))
  .where("created_at", ">", db.raw("DATE_SUB(NOW(), INTERVAL 7 DAY)"))
  .get();

// 使用函数
const usersWithAge = await db
  .table("users")
  .select("name", db.raw("YEAR(NOW()) - YEAR(birth_date) as age"))
  .get();
```

### 3. 子查询

```javascript
// IN子查询
const activeUserOrders = await db
  .table("orders")
  .whereIn("user_id", (query) => {
    query.table("users").select("id").where("status", "active");
  })
  .get();

// EXISTS子查询
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

### 4. 分组和HAVING

```javascript
// 按部门统计员工数，只显示超过10人的部门
const deptStats = await db
  .table("employees")
  .select("department")
  .selectRaw("COUNT(*) as employee_count")
  .groupBy("department")
  .having("employee_count", ">", 10)
  .get();
```

### 5. 获取单条记录

```javascript
// 使用first()获取第一条记录
const firstUser = await db.table("users").orderBy("created_at").first();

// 使用find()按主键查询
const user = await db.table("users").find(1);
```

## 性能优化建议

### 1. 只选择需要的列

```javascript
// ✅ 推荐 - 只选择需要的列
const users = await db.table("users").select("id", "name", "email").get();

// ❌ 避免 - 选择所有列（如果有大量列）
const allUsers = await db.table("users").select("*").get();
```

### 2. 使用索引

确保WHERE条件中使用的列都有合适的数据库索引。

```javascript
// 这个查询应该在users表的status列上建立索引
const activeUsers = await db.table("users").where("status", "active").get();
```

### 3. 限制结果数量

```javascript
// 使用limit()来限制返回的记录数
const recentPosts = await db
  .table("posts")
  .orderBy("created_at", "desc")
  .limit(10)
  .get();
```

### 4. 批量操作

```javascript
// 批量插入比单条插入更高效
const records = [
  { name: "User1", email: "user1@example.com" },
  { name: "User2", email: "user2@example.com" },
  { name: "User3", email: "user3@example.com" },
];

const result = await db.table("users").insert(records);
// 单次数据库调用插入3条记录
```

### 5. 使用事务处理相关操作

```javascript
// 事务中的多个操作效率更高
const transaction = await db.transaction();

try {
  // 多个相关操作
  await transaction.table("orders").insert(orderData);
  await transaction.table("order_items").insert(itemsData);
  await transaction.table("inventory").update(inventoryData);

  await transaction.commit();
} catch (error) {
  await transaction.rollback();
}
```

## 高级功能

### 子查询

使用子查询进行聚合数据查询：

```javascript
// 用户及其订单数量（SELECT子查询）
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

// 高价值客户（FROM子查询）
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

// 用户订单统计（JOIN子查询）
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

### 原始SQL表达式

对于需要自定义SQL的复杂查询：

```javascript
// 使用子查询的自定义ORDER BY
const topUsers = await db
  .table("users")
  .orderByRaw("(SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) DESC")
  .limit(10)
  .get();

// 复杂WHERE条件
const results = await db
  .table("products")
  .whereRaw("price BETWEEN ? AND ?", [100, 500])
  .whereRaw("MATCH(name, description) AGAINST(?)", ["laptop gaming"])
  .get();
```

---

## 下一步

现在你已经了解了基本用法，继续探索：

1. 阅读更详细的[API文档](../api/Builder.md)
2. 查看[高级示例](./advanced-examples.md)
3. 学习[性能优化技巧](../Processors.md)
4. 探索[数据库语法支持](../Grammar.md)

祝编程愉快！如有问题，请随时提交Issue。

## 更多资源

- [Builder API文档](../api/Builder.md) - 完整的方法参考
- [Database API文档](../api/Database.md) - 连接和配置详情
- [基本查询示例](./basic-queries.md) - 更多SELECT示例
- [JOIN操作示例](./joins.md) - 详细的JOIN教程
- [数据修改示例](./data-modification.md) - INSERT、UPDATE、DELETE示例
- [事务处理示例](./transactions.md) - 事务和并发控制

## 故障排除

### 问题：无法连接到数据库

**症状：** `Error: connect ECONNREFUSED`

**解决方案：**

1. 检查数据库服务是否运行中
2. 确认主机名和端口正确
3. 验证网络连接

### 问题：SQL语法错误

**症状：** `Error: ER_PARSE_ERROR`

**解决方案：**

1. 检查表名和列名拼写
2. 确保使用正确的操作符（例如 `=` 而不是 `==`）
3. 查看生成的SQL语句以了解实际构建的查询

### 问题：参数绑定错误

**症状：** `Error: Incorrect number of bindings`

**解决方案：**

1. 确保提供了所有必需的参数
2. 检查参数类型是否正确
3. 使用 `db.raw()` 处理特殊SQL表达式

## 下一步

现在你已经了解了基本用法，继续探索：

1. 阅读更详细的[API文档](../api/Builder.md)
2. 查看[高级示例](./advanced-examples.md)
3. 学习[性能优化技巧](../Processors.md)
4. 探索[数据库语法支持](../Grammar.md)

祝你使用愉快！如有问题，欢迎提交Issue。
