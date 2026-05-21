# Database Query Builder

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![Databases](https://img.shields.io/badge/MySQL%20%7C%20PostgreSQL%20%7C%20SQLite-blue.svg)
![Tests](https://img.shields.io/badge/Tests-156%20Passed-brightgreen.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**现代 Node.js 数据库查询构建器**  
_支持 MySQL、PostgreSQL 和 SQLite_

[快速开始](#快速开始) • [API 文档](#api-文档) • [示例](#示例) • [功能特性](#功能特性)

**🌍 语言**: [English](README.md) | [中文](README_CN.md)

</div>

---

## 🚀 概述

一个强大、类型安全的 Node.js 数据库查询构建器，具有流畅的 API 和完整文档。支持复杂查询、事务处理、联表操作和条件表达式，适用于现代 JavaScript/TypeScript 项目。

## ✨ 功能特性

### 🔧 核心特性

- **🎯 流畅 API** - 链式方法调用，直观易用
- **🔄 多数据库支持** - MySQL、PostgreSQL、SQLite 统一接口
- **⚡ 高性能** - 优化的查询生成和连接管理
- **🔒 SQL 注入防护** - 自动参数化查询，安全可靠

### 📝 查询特性

- **🔍 复杂查询** - SELECT、WHERE、ORDER BY、GROUP BY、HAVING
- **🔗 联表操作** - INNER、LEFT、RIGHT、CROSS JOIN 和子查询
- **📊 聚合函数** - COUNT、SUM、AVG、MAX、MIN
- **🎛️ 条件表达式** - 完整的 CASE WHEN 支持
- **🔄 事务处理** - 完整的事务支持和回滚机制

### 🛠️ 高级特性

- **📁 子查询** - WHERE、FROM、JOIN 中的嵌套查询
- **🧮 数据修改** - INSERT、UPDATE、DELETE、UPSERT
- **🔢 原子操作** - INCREMENT、DECREMENT 原子计数器
- **📋 批量操作** - 优化的批量插入和更新
- **📊 查询日志** - 全面的查询调试和性能监控

## 📦 安装

### 1. 通过 npm 安装

```bash
# 安装数据库查询构建器
npm install @wilkques/database

# 安装你需要的数据库驱动
npm install mysql2          # MySQL 数据库
npm install pg              # PostgreSQL 数据库
npm install better-sqlite3  # SQLite 数据库
```

### 2. 从源码安装

```bash
# 克隆仓库
git clone https://github.com/wilkques/node-database.git
cd database
npm install
```

## 🚀 快速开始

### 导入和基本连接

```javascript
// 默认导入（推荐）
import Database from "@wilkques/database";

// 命名导入（可选）
import { Database, Builder } from "@wilkques/database";

// CommonJS（如果使用 require）
const Database = require("@wilkques/database").default;

// MySQL 连接
const db = await Database.connect({
  driver: "mysql",
  host: "localhost",
  username: "user",
  password: "password",
  database: "mydb",
  port: 3306,
});

// PostgreSQL 连接
const db = await Database.connect({
  driver: "postgres",
  host: "localhost",
  username: "user",
  password: "password",
  database: "mydb",
  port: 5432,
});

// SQLite 连接
const db = await Database.connect({
  driver: "sqlite",
  database: "./database.db",
});
```

### 基本查询

```javascript
// 简单查询
const users = await db
  .table("users")
  .select("id", "name", "email")
  .where("active", true)
  .orderBy("created_at", "desc")
  .limit(10)
  .get();

// 条件查询
const posts = await db
  .table("posts")
  .select("title", "content", "author_id")
  .where("status", "published")
  .where("created_at", ">", "2024-01-01")
  .whereIn("category_id", [1, 2, 3])
  .get();

// 联表查询
const userPosts = await db
  .table("users", "u")
  .select("u.name", "p.title", "p.created_at")
  .leftJoin("posts p", "u.id", "p.author_id")
  .where("u.active", true)
  .orderBy("p.created_at", "desc")
  .get();
```

### 条件表达式 (CASE WHEN)

```javascript
// 简单 CASE 语句
const users = await db
  .table("users")
  .select(
    "name",
    "email",
    db
      .case("status")
      .when("active", "活跃")
      .when("inactive", "非活跃")
      .when("banned", "已禁用")
      .else("未知")
      .end("status_text"),
  )
  .get();

// 复杂条件 CASE
const orders = await db
  .table("orders")
  .select(
    "id",
    "total",
    db
      .case()
      .when((q) => q.where("total", ">", 1000), "大订单")
      .when((q) => q.where("total", ">", 500), "中订单")
      .else("小订单")
      .end("order_type"),
  )
  .get();

// 在 UPDATE 中使用 CASE
await db.table("products").update({
  status: db
    .case("inventory")
    .when(0, "缺货")
    .when((q) => q.where("inventory", "<", 10), "库存不足")
    .else("有库存")
    .end(),
});
```

### 数据修改

```javascript
// 插入数据
const result = await db.table("users").insert({
  name: "张三",
  email: "zhangsan@example.com",
  created_at: new Date(),
});

// 批量插入
await db.table("users").insert([
  { name: "用户1", email: "user1@example.com" },
  { name: "用户2", email: "user2@example.com" },
]);

// 更新数据
await db.table("users").where("id", 1).update({
  name: "李四",
  updated_at: new Date(),
});

// 原子操作
await db.table("posts").where("id", 1).increment("view_count", 1);

// Upsert 操作
await db.table("settings").upsert({
  key: "theme",
  value: "dark",
});
```

### 事务处理

```javascript
const transaction = await db.transaction();

try {
  // 创建订单
  const orderId = await transaction.table("orders").insertGetId({
    user_id: userId,
    total: orderTotal,
    status: "pending",
  });

  // 添加订单项
  await transaction.table("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    })),
  );

  // 更新库存
  for (const item of items) {
    await transaction
      .table("products")
      .where("id", item.product_id)
      .decrement("stock", item.quantity);
  }

  await transaction.commit();
  console.log("订单创建成功");
} catch (error) {
  await transaction.rollback();
  console.error("订单创建失败:", error);
}
```

## 📚 API 文档

### 核心类

- **[Database 类](docs/api/Database_CN.md)** - 数据库连接管理和核心功能
- **[Builder 类](docs/api/Builder_CN.md)** - 完整的查询构建器 API 参考

### 详细指南

- **[快速开始指南](docs/examples/quick-start_CN.md)** - 完整的入门教程
- **[基本查询](docs/examples/basic-queries_CN.md)** - SELECT 查询详解
- **[联表操作](docs/examples/joins_CN.md)** - 表联接完整指南
- **[数据修改](docs/examples/data-modification_CN.md)** - CRUD 操作详解
- **[事务处理](docs/examples/transactions_CN.md)** - 事务管理和数据一致性
- **[查询日志](docs/examples/query-logging_CN.md)** - 调试和性能监控

### 系统文档

- **[Grammar 语法系统](docs/Grammar_CN.md)** - SQL 编译和数据库特定语法
- **[Processors 处理器系统](docs/Processors_CN.md)** - 结果处理和类型转换

## 💾 支持的数据库

| 数据库         | 版本支持 | 驱动           | 功能支持    | 查询日志  |
| -------------- | -------- | -------------- | ----------- | --------- |
| **MySQL**      | 5.7+     | mysql2         | ✅ 完全支持 | ✅ 已启用 |
| **PostgreSQL** | 9.6+     | pg             | ✅ 完全支持 | ✅ 已启用 |
| **SQLite**     | 3.x      | better-sqlite3 | ✅ 完全支持 | ✅ 已启用 |

### 查询日志支持

所有数据库驱动现在都支持全面的查询日志记录：

- **📝 SQL 语句记录** - 带有正确语法高亮的完整查询文本
- **⚙️ 参数绑定** - 所有查询参数及其值
- **⏱️ 执行计时** - 精确的查询执行时间（毫秒）
- **🕐 时间戳跟踪** - 每个查询执行的确切时间
- **🎛️ 日志管理** - 启用、禁用、清除和检索查询日志

## 🧪 测试

项目包含完整的测试套件：

```bash
npm test
```

**测试覆盖率：**

- ✅ **156 个测试全部通过**
- ✅ **11 个测试套件覆盖**
- ✅ **所有核心功能已验证**

## 📁 项目结构

```
lib/
├── Database.js              # 主数据库类
├── queries/                 # 查询构建器
│   ├── Builder.js          # 查询构建器主类
│   ├── grammar/            # SQL 语法编译器
│   └── processors/         # 结果处理器
├── connections/            # 数据库连接管理
docs/                       # 完整文档
├── api/                   # API 参考
└── examples/              # 使用示例
tests/                     # 测试套件
examples/                  # 示例代码
```

## 🔧 高级用法

### 自定义查询

```javascript
// 原生 SQL 查询
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

// 子查询
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

### 查询日志和调试

```javascript
// 启用查询日志
db.connection.enableQueryLog();

// 执行一些查询
await db.table("users").select("*").where("active", true).get();
await db.table("posts").select("title", "content").limit(10).get();
await db.raw("SELECT COUNT(*) as total FROM orders WHERE status = ?", [
  "completed",
]);

// 获取详细的查询日志信息
const queryLog = db.connection.getQueryLog();

queryLog.forEach((entry, index) => {
  console.log(`查询 ${index + 1}:`);
  console.log(`  SQL: ${entry.sql}`);
  console.log(`  参数: [${entry.bindings.join(", ")}]`);
  console.log(`  时间戳: ${entry.timestamp.toISOString()}`);
  console.log(`  耗时: ${entry.duration}ms`);
  console.log("");
});

// 查询日志管理
console.log(`记录的查询总数: ${queryLog.length}`);
console.log(`日志已启用: ${db.connection.isQueryLogEnabled()}`);

// 清空日志
db.connection.clearQueryLog();

// 禁用日志
db.connection.disableQueryLog();
```

### 查询日志功能特性

- **📊 详细日志记录** - 捕获 SQL、参数、时间戳和执行时间
- **🔍 性能监控** - 跟踪查询执行时间以进行优化
- **🛠️ 调试支持** - 完整的查询历史记录用于故障排除
- **📈 统计分析** - 分析查询模式和性能指标
- **🎯 全面支持** - 在所有数据库驱动 (MySQL、PostgreSQL、SQLite) 中可用

#### 数据库特定日志记录

```javascript
// 所有驱动都支持相同的查询日志 API
const drivers = ["mysql", "postgres", "sqlite"];

for (const driver of drivers) {
  const db = await Database.connect({ driver /* 其他配置 */ });

  // 启用日志记录 - 在所有驱动上都有效
  db.connection.enableQueryLog();

  // 执行查询 - 自动记录并计时
  await db.table("users").select("*").get();

  // 查看具有驱动特定 SQL 语法的日志
  const logs = db.connection.getQueryLog();
  console.log(`${driver.toUpperCase()} SQL:`, logs[0].sql);
  // MySQL:      SELECT `id`, `name` FROM `users`
  // PostgreSQL: SELECT "id", "name" FROM "users"
  // SQLite:     SELECT [id], [name] FROM [users]
}
```

```javascript
// 性能分析示例
db.connection.enableQueryLog();

// 执行应用程序查询
await executeApplicationQueries();

// 分析性能
const logs = db.connection.getQueryLog();
const totalTime = logs.reduce((sum, entry) => sum + entry.duration, 0);
const avgTime = totalTime / logs.length;
const slowQueries = logs.filter((entry) => entry.duration > 100); // > 100ms

console.log(`查询总数: ${logs.length}`);
console.log(`总执行时间: ${totalTime}ms`);
console.log(`平均查询时间: ${avgTime.toFixed(2)}ms`);
console.log(`慢查询 (>100ms): ${slowQueries.length}`);

// 记录慢查询以进行优化
slowQueries.forEach((query) => {
  console.log(`慢查询: ${query.sql} (${query.duration}ms)`);
});
```

## 🤝 贡献

欢迎贡献和改进！

## 📄 许可证

[MIT 许可证](LICENSE)

---

<div align="center">

**🌟 如果这个项目对你有帮助，请给它一个星标！**

用 ❤️ 为 Node.js 社区构建

</div>
