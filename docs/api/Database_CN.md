# Database类 API文档

## 概述

`Database`类是查询构建器库的核心入口点，负责数据库连接管理和查询构建器的创建。它提供统一的接口来连接不同类型的数据库，并返回功能完整的查询构建器实例。

### 支持的数据库

- **MySQL** - 世界上最受欢迎的开源数据库
- **PostgreSQL** - 高级的开源对象关系数据库
- **SQLite** - 轻量级的嵌入式数据库

### 主要特性

- 🔌 **统一连接接口** - 无论什么数据库，使用相同的API
- 🚀 **动态驱动加载** - 按需加载数据库驱动，减少包大小
- 🛡️ **自动错误处理** - 提供清晰的错误信息和解决方案
- ⚙️ **灵活配置** - 支持配置对象和参数两种调用方式
- 🎯 **类型安全** - 完整的JSDoc注释和类型定义

## 类方法

### connect()

创建数据库连接并返回查询构建器实例。

#### 语法

```javascript
// 方式1：使用配置对象（推荐）
Database.connect(config);

// 方式2：使用独立参数
Database.connect(driver, host, username, password, database, port, charset);
```

#### 参数

**配置对象方式：**

| 参数              | 类型     | 必填 | 默认值        | 描述                                                             |
| ----------------- | -------- | ---- | ------------- | ---------------------------------------------------------------- |
| `config`          | `Object` | ✅   | -             | 数据库配置对象                                                   |
| `config.driver`   | `string` | ✅   | -             | 数据库驱动 (`'mysql'`\|`'postgres'`\|`'postgresql'`\|`'sqlite'`) |
| `config.host`     | `string` | ❌   | `'localhost'` | 数据库主机地址                                                   |
| `config.username` | `string` | ❌   | `''`          | 数据库用户名                                                     |
| `config.password` | `string` | ❌   | `''`          | 数据库密码                                                       |
| `config.database` | `string` | ❌   | `''`          | 数据库名称                                                       |
| `config.port`     | `number` | ❌   | 自动检测      | 数据库端口                                                       |
| `config.charset`  | `string` | ❌   | `'utf8mb4'`   | 字符集                                                           |
| `config.filename` | `string` | ❌   | -             | SQLite数据库文件路径                                             |
| `config.pool`     | `Object` | ❌   | -             | 连接池配置                                                       |
| `config.ssl`      | `Object` | ❌   | -             | SSL配置（PostgreSQL）                                            |

**独立参数方式：**

| 参数       | 类型     | 必填 | 默认值        | 描述           |
| ---------- | -------- | ---- | ------------- | -------------- |
| `driver`   | `string` | ✅   | -             | 数据库驱动名称 |
| `host`     | `string` | ❌   | `'localhost'` | 数据库主机地址 |
| `username` | `string` | ❌   | `''`          | 数据库用户名   |
| `password` | `string` | ❌   | `''`          | 数据库密码     |
| `database` | `string` | ❌   | `''`          | 数据库名称     |
| `port`     | `number` | ❌   | 自动检测      | 数据库端口     |
| `charset`  | `string` | ❌   | `'utf8mb4'`   | 字符集         |

#### 返回值

`Promise<Builder>` - 查询构建器实例

#### 异常

| 异常类型 | 触发条件           | 解决方案                                                                |
| -------- | ------------------ | ----------------------------------------------------------------------- |
| `Error`  | 不支持的数据库驱动 | 检查driver参数是否为`'mysql'`、`'postgres'`、`'postgresql'`或`'sqlite'` |
| `Error`  | 数据库驱动包未安装 | 按提示执行npm安装命令                                                   |
| `Error`  | 数据库连接失败     | 检查连接参数、网络连接和数据库服务状态                                  |

#### 默认端口

| 数据库     | 默认端口   |
| ---------- | ---------- |
| MySQL      | 3306       |
| PostgreSQL | 5432       |
| SQLite     | 不使用端口 |

## 使用示例

### MySQL连接

```javascript
// 基本MySQL连接
const db = await Database.connect({
  driver: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "myapp",
});

// 使用连接池的MySQL连接
const dbWithPool = await Database.connect({
  driver: "mysql",
  host: "localhost",
  username: "root",
  password: "password",
  database: "myapp",
  pool: {
    min: 2, // 最小连接数
    max: 10, // 最大连接数
    acquire: 30000, // 获取连接超时时间(ms)
    idle: 10000, // 空闲连接超时时间(ms)
  },
});

// 使用独立参数
const dbParams = await Database.connect(
  "mysql",
  "localhost",
  "root",
  "password",
  "myapp",
  3306,
  "utf8mb4",
);
```

### PostgreSQL连接

```javascript
// 基本PostgreSQL连接
const db = await Database.connect({
  driver: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "myapp",
});

// 带SSL的PostgreSQL连接
const dbSSL = await Database.connect({
  driver: "postgresql",
  host: "production-server.com",
  port: 5432,
  username: "appuser",
  password: "securepass",
  database: "production_db",
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
});
```

### SQLite连接

```javascript
// SQLite文件数据库
const db = await Database.connect({
  driver: "sqlite",
  filename: "./data/app.sqlite",
});

// SQLite内存数据库
const memoryDb = await Database.connect({
  driver: "sqlite",
  filename: ":memory:",
});

// 临时SQLite数据库
const tempDb = await Database.connect({
  driver: "sqlite",
  filename: "", // 空字符串表示临时数据库
});
```

## 使用模式

### 基本查询流程

```javascript
// 1. 建立连接
const db = await Database.connect({
  driver: "mysql",
  host: "localhost",
  username: "root",
  password: "password",
  database: "testdb",
});

// 2. 使用查询构建器
const users = await db
  .table("users")
  .where("status", "active")
  .orderBy("created_at", "desc")
  .limit(10)
  .get();

console.log("活跃用户:", users);
```

### 错误处理最佳实践

```javascript
try {
  const db = await Database.connect({
    driver: "mysql",
    host: "localhost",
    username: "root",
    password: "wrongpassword",
    database: "testdb",
  });

  // 执行查询...
} catch (error) {
  if (error.message.includes("数据库驱动未安装")) {
    console.error("请安装MySQL驱动: npm install mysql2");
  } else if (error.code === "ER_ACCESS_DENIED_ERROR") {
    console.error("数据库认证失败，请检查用户名和密码");
  } else if (error.code === "ECONNREFUSED") {
    console.error("无法连接数据库，请检查服务是否运行");
  } else {
    console.error("数据库连接错误:", error.message);
  }
}
```

### 环境配置示例

```javascript
// config/database.js
const config = {
  development: {
    driver: "sqlite",
    filename: "./dev-database.sqlite",
  },

  testing: {
    driver: "sqlite",
    filename: ":memory:",
  },

  production: {
    driver: "mysql",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    charset: "utf8mb4",
    pool: {
      min: 2,
      max: 10,
      acquire: 30000,
      idle: 10000,
    },
  },
};

// 使用环境配置
const env = process.env.NODE_ENV || "development";
const db = await Database.connect(config[env]);
```

## 驱动依赖

### 安装说明

不同数据库需要安装对应的驱动包：

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg

# SQLite
npm install sqlite3
```

### 驱动选择

| 数据库     | 推荐驱动  | 说明                  |
| ---------- | --------- | --------------------- |
| MySQL      | `mysql2`  | 支持Promise、性能更好 |
| PostgreSQL | `pg`      | 官方推荐的Node.js驱动 |
| SQLite     | `sqlite3` | 标准SQLite驱动        |

## 性能提示

### 连接池配置

对于生产环境，建议配置连接池：

```javascript
const db = await Database.connect({
  driver: "mysql",
  // ... 其他配置
  pool: {
    min: 2, // 最小连接数
    max: 10, // 最大连接数
    acquire: 30000, // 获取连接超时时间
    idle: 10000, // 空闲超时时间
    evict: 1000, // 检测间隔
    handleDisconnects: true, // 自动处理断连
  },
});
```

### 连接复用

避免频繁创建连接：

```javascript
// ❌ 错误做法 - 频繁创建连接
for (let i = 0; i < 100; i++) {
  const db = await Database.connect(config);
  // 执行查询...
}

// ✅ 正确做法 - 复用连接
const db = await Database.connect(config);
for (let i = 0; i < 100; i++) {
  // 执行查询...
}
```

## 故障排除

### 常见问题

**问题1：Module not found**

```
Error: 数据库驱动未安装，请执行: npm install mysql2
```

**解决方案**：按提示安装对应的数据库驱动包

**问题2：连接超时**

```
Error: connect ETIMEDOUT
```

**解决方案**：

- 检查数据库服务是否运行
- 检查防火墙设置
- 验证主机地址和端口

**问题3：认证失败**

```
Error: ER_ACCESS_DENIED_ERROR
```

**解决方案**：

- 检查用户名和密码
- 确认用户有访问数据库的权限
- 检查主机允许连接的IP范围

**问题4：数据库不存在**

```
Error: ER_BAD_DB_ERROR: Unknown database 'xxx'
```

**解决方案**：

- 确认数据库名称正确
- 创建数据库或使用存在的数据库

## 类型定义

如果你使用TypeScript，可以参考以下类型定义：

```typescript
interface DatabaseConfig {
  driver: "mysql" | "postgres" | "postgresql" | "sqlite";
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  charset?: string;
  filename?: string; // SQLite only
  pool?: PoolConfig;
  ssl?: SSLConfig; // PostgreSQL only
}

interface PoolConfig {
  min?: number;
  max?: number;
  acquire?: number;
  idle?: number;
  evict?: number;
  handleDisconnects?: boolean;
}

interface SSLConfig {
  require?: boolean;
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

class Database {
  static connect(config: DatabaseConfig): Promise<Builder>;
  static connect(
    driver: string,
    host?: string,
    username?: string,
    password?: string,
    database?: string,
    port?: number,
    charset?: string,
  ): Promise<Builder>;
}
```

## 版本历史

| 版本  | 日期       | 变更说明                                |
| ----- | ---------- | --------------------------------------- |
| 1.0.0 | 2024-01-01 | 初始版本，支持MySQL、PostgreSQL、SQLite |

## 相关文档

- [Builder类 API文档](./Builder.md) - 查询构建器核心功能
- [Connection类 API文档](./Connection.md) - 数据库连接管理
- [Grammar类 API文档](./Grammar.md) - SQL语法解析器
- [快速入门指南](../guides/getting-started.md) - 新手入门教程
- [配置指南](../guides/configuration.md) - 详细配置说明
