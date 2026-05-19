# Grammar 语法系统文档

Grammar 系统负责将查询构建器编译成特定数据库的 SQL 语句。它处理抽象查询操作到具体 SQL 语法的转换，适应不同数据库引擎的特定方言和功能。

## 概述

Grammar 系统为多个数据库系统（MySQL、PostgreSQL、SQLite）提供统一的 SQL 语句生成接口。每个数据库都有自己的 Grammar 类，扩展基础 Grammar 类，实现数据库特定的 SQL 编译逻辑。

### 核心组件

- **基础 Grammar** (`lib/queries/grammar/Grammar.js`) - 定义编译接口的抽象基类
- **MySQLGrammar** (`lib/queries/grammar/MySQLGrammar.js`) - MySQL 特定的 SQL 生成
- **PostgreSQLGrammar** (`lib/queries/grammar/PostgreSQLGrammar.js`) - PostgreSQL 特定的 SQL 生成
- **SQLiteGrammar** (`lib/queries/grammar/SQLiteGrammar.js`) - SQLite 特定的 SQL 生成

## 基本用法

### 简单 SELECT 查询

```javascript
import MySQLGrammar from './lib/queries/grammar/MySQLGrammar.js';
import Builder from './lib/queries/Builder.js';

const grammar = new MySQLGrammar();
const builder = new Builder();

builder.select(['id', 'name', 'email'])
  .from('users')
  .where('status', '=', 'active');

const sql = grammar.compileSelect(builder);
console.log(sql);
// 输出: SELECT `id`, `name`, `email` FROM `users` WHERE `status` = ?
```

### INSERT 语句

```javascript
const builder = new Builder();
builder.from('users');

const data = {
  name: 'John Doe',
  email: 'john@example.com',
  created_at: new Date()
};

const sql = grammar.compileInsert(builder, data);
console.log(sql);
// 输出: INSERT INTO `users` (`name`, `email`, `created_at`) VALUES (?, ?, ?)
```

### UPDATE 语句

```javascript
const builder = new Builder();
builder.from('users')
  .where('id', '=', 1);

const data = {
  name: 'Jane Doe',
  updated_at: new Date()
};

const sql = grammar.compileUpdate(builder, data);
console.log(sql);
// 输出: UPDATE `users` SET `name` = ?, `updated_at` = ? WHERE `id` = ?
```

### DELETE 语句

```javascript
const builder = new Builder();
builder.from('users')
  .where('status', '=', 'inactive');

const sql = grammar.compileDelete(builder);
console.log(sql);
// 输出: DELETE FROM `users` WHERE `status` = ?
```

## 数据库特定功能

### MySQL Grammar

MySQL Grammar 提供对 MySQL 特定 SQL 功能和方言的支持：

#### 反引号标识符引用

所有标识符（表名、列名）都用反引号包装，以防止与保留关键字冲突：

```javascript
// SELECT `id`, `name` FROM `users`
```

#### ON DUPLICATE KEY UPDATE

MySQL 的 `ON DUPLICATE KEY UPDATE` 子句允许插入或更新操作：

```javascript
const data = {
  id: 1,
  email: 'john@example.com',
  visits: 5
};

const updates = {
  visits: 'visits + 1'
};

const sql = grammar.compileInsert(builder, data, updates);
// INSERT INTO `users` (`id`, `email`, `visits`) VALUES (?, ?, ?)
// ON DUPLICATE KEY UPDATE `visits` = visits + 1
```

#### 锁定子句

MySQL 支持并发事务的显式锁定：

```javascript
builder.select(['*'])
  .from('users')
  .where('id', '=', 1)
  .lockForUpdate();  // 添加 FOR UPDATE 子句

const sql = grammar.compileSelect(builder);
// SELECT * FROM `users` WHERE `id` = ? FOR UPDATE
```

#### LIMIT/OFFSET 处理

MySQL 使用 `LIMIT` 和 `OFFSET` 关键字进行结果分页：

```javascript
builder.select(['*'])
  .from('users')
  .limit(10)
  .offset(20);

const sql = grammar.compileSelect(builder);
// SELECT * FROM `users` LIMIT 10 OFFSET 20
```

### PostgreSQL Grammar

PostgreSQL Grammar 提供对 PostgreSQL 特定功能的支持：

#### 双引号标识符引用

PostgreSQL 使用双引号包装标识符：

```javascript
const sql = grammar.compileSelect(builder);
// SELECT "id", "name" FROM "users"
```

#### RETURNING 子句

PostgreSQL 支持在 INSERT、UPDATE、DELETE 语句中使用 RETURNING：

```javascript
const sql = grammar.compileInsert(builder, data, ['id', 'created_at']);
// INSERT INTO "users" ("name", "email") VALUES (?, ?) RETURNING "id", "created_at"
```

#### 数组数据类型

PostgreSQL 支持数组数据类型：

```javascript
builder.where('tags', '@>', ['javascript', 'node.js']);
// WHERE "tags" @> ARRAY[?, ?]
```

#### JSON 操作

PostgreSQL 提供丰富的 JSON 操作符：

```javascript
builder.where('data->name', '=', 'John');
// WHERE "data"->'name' = ?

builder.where('data->>email', 'LIKE', '%@gmail.com');
// WHERE "data"->>'email' LIKE ?
```

### SQLite Grammar

SQLite Grammar 提供对 SQLite 特定功能的支持：

#### 简单标识符引用

SQLite 使用双引号或方括号包装标识符：

```javascript
const sql = grammar.compileSelect(builder);
// SELECT "id", "name" FROM "users"
```

#### LIMIT 和 OFFSET

SQLite 支持 LIMIT 和 OFFSET，但语法略有不同：

```javascript
builder.limit(10).offset(5);
// SELECT * FROM "users" LIMIT 10 OFFSET 5
```

#### 自增主键

SQLite 使用 INTEGER PRIMARY KEY AUTOINCREMENT：

```javascript
// 在表创建时：
// CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT)
```

#### FTS（全文搜索）

SQLite 支持全文搜索：

```javascript
builder.whereRaw('users MATCH ?', ['john']);
// WHERE users MATCH ?
```

## 编译方法

### compileSelect()

编译 SELECT 查询：

```javascript
const components = [
  'columns',    // SELECT 列
  'from',       // FROM 表
  'joins',      // JOIN 连接
  'wheres',     // WHERE 条件
  'groups',     // GROUP BY 分组
  'havings',    // HAVING 条件
  'orders',     // ORDER BY 排序
  'limit',      // LIMIT 限制
  'offset'      // OFFSET 偏移
];

const sql = grammar.compileSelect(builder);
```

### compileInsert()

编译 INSERT 语句：

```javascript
const data = { name: 'John', email: 'john@example.com' };
const sql = grammar.compileInsert(builder, data);
```

### compileUpdate()

编译 UPDATE 语句：

```javascript
const data = { name: 'Jane' };
const sql = grammar.compileUpdate(builder, data);
```

### compileDelete()

编译 DELETE 语句：

```javascript
const sql = grammar.compileDelete(builder);
```

## 参数绑定

### 基本参数绑定

```javascript
// WHERE name = ?
builder.where('name', '=', 'John');

// 绑定参数: ['John']
const bindings = builder.getBindings();
```

### 复杂参数绑定

```javascript
// WHERE id IN (?, ?, ?)
builder.whereIn('id', [1, 2, 3]);

// WHERE created_at BETWEEN ? AND ?
builder.whereBetween('created_at', ['2024-01-01', '2024-12-31']);

// 绑定参数: [1, 2, 3, '2024-01-01', '2024-12-31']
const bindings = builder.getBindings();
```

### 原始 SQL 表达式

```javascript
// 原始 SQL 不会被转义
builder.select(db.raw('COUNT(*) as total'));
builder.whereRaw('created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)');

const sql = grammar.compileSelect(builder);
// SELECT COUNT(*) as total FROM users WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)
```

## 自定义 Grammar

### 扩展基础 Grammar

```javascript
import Grammar from './Grammar.js';

class CustomGrammar extends Grammar {
    /**
     * 包装列名
     */
    wrapValue(value) {
        if (value === '*') return value;
        return `[${value}]`; // 使用方括号
    }
    
    /**
     * 编译 LIMIT 子句
     */
    compileLimit(query, limit) {
        return `TOP ${limit}`;
    }
    
    /**
     * 自定义函数支持
     */
    compileCustomFunction(functionName, args) {
        switch (functionName) {
            case 'ISNULL':
                return `ISNULL(${args.join(', ')})`;
            default:
                return super.compileCustomFunction(functionName, args);
        }
    }
}
```

### 注册自定义 Grammar

```javascript
import Database from './Database.js';
import CustomGrammar from './CustomGrammar.js';

// 注册自定义 Grammar
Database.registerGrammar('custom', CustomGrammar);

// 使用自定义 Grammar
const db = await Database.connect({
    driver: 'custom',
    // ... 其他配置
});
```

## 高级功能

### 条件编译

```javascript
const grammar = new MySQLGrammar();

// 根据条件编译不同的 SQL
if (database === 'mysql') {
    sql = grammar.compileSelect(builder);
} else if (database === 'postgres') {
    const pgGrammar = new PostgreSQLGrammar();
    sql = pgGrammar.compileSelect(builder);
}
```

### 查询优化

```javascript
// 启用查询缓存
grammar.enableQueryCache();

// 使用索引提示（MySQL）
builder.useIndex('idx_user_status');
const sql = grammar.compileSelect(builder);
// SELECT * FROM `users` USE INDEX (`idx_user_status`)
```

### 调试支持

```javascript
// 启用调试模式
grammar.enableDebug();

const sql = grammar.compileSelect(builder);
const bindings = builder.getBindings();

console.log('SQL:', sql);
console.log('Bindings:', bindings);
console.log('Compiled SQL:', grammar.interpolate(sql, bindings));
```

## 性能考虑

### Grammar 缓存

```javascript
// Grammar 实例可以重用
const grammar = new MySQLGrammar();

// 多次使用同一个 grammar 实例
const sql1 = grammar.compileSelect(builder1);
const sql2 = grammar.compileSelect(builder2);
```

### 避免重复编译

```javascript
// 缓存编译结果
const queryCache = new Map();

function getCachedSQL(builder) {
    const key = builder.toSql();
    
    if (!queryCache.has(key)) {
        const sql = grammar.compileSelect(builder);
        queryCache.set(key, sql);
    }
    
    return queryCache.get(key);
}
```

## 故障排除

### 常见问题

**标识符冲突：**
```javascript
// 错误：使用保留关键字作为列名
builder.select('order'); // 'order' 是保留关键字

// 正确：使用引用包装
builder.select(grammar.wrapColumn('order'));
// MySQL: SELECT `order`
// PostgreSQL: SELECT "order"
```

**参数绑定错误：**
```javascript
// 错误：手动字符串连接
builder.whereRaw(`name = '${userInput}'`); // SQL 注入风险

// 正确：使用参数绑定
builder.whereRaw('name = ?', [userInput]); // 安全
```

**语法不兼容：**
```javascript
// 检查数据库类型
if (grammar instanceof MySQLGrammar) {
    // MySQL 特定语法
    builder.whereRaw('MATCH(title) AGAINST(?)', [searchTerm]);
} else if (grammar instanceof PostgreSQLGrammar) {
    // PostgreSQL 特定语法
    builder.whereRaw('title @@ to_tsquery(?)', [searchTerm]);
}
```

## 相关文档

- [Builder API 文档](./api/Builder_CN.md) - 查询构建器完整参考
- [Database 类文档](./api/Database_CN.md) - 数据库连接管理
- [Processors 系统文档](./Processors_CN.md) - 结果处理系统
- [快速开始指南](./examples/quick-start_CN.md) - 入门教程