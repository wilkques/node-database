# Builder类 API文档

## 概述

`Builder`类实现了流畅的查询API，支持链式方法调用来构建复杂的数据库查询。它提供了所有必要的方法用于SELECT、WHERE、ORDER BY、LIMIT等SQL操作，使开发者能够用优雅的链式语法构建数据库查询。

### 主要特性

- 🔗 **链式调用** - 流畅的API设计，方法可以无限链接
- 🛡️ **参数绑定** - 自动处理SQL注入防护
- 📊 **聚合函数** - 支持COUNT、MAX、MIN、AVG、SUM等
- 🔄 **子查询支持** - 支持嵌套查询和复杂条件
- ⚙️ **多数据库兼容** - MySQL、PostgreSQL、SQLite统一API
- 🎯 **类型安全** - 完整的JSDoc注释和类型定义
- 📝 **数据修改** - insert、update、delete、increment、decrement等完整的数据操作方法

## 核心查询方法

### select()

选择要检索的列。可以接收多种输入格式，支持原始SQL表达式。

#### 语法

```javascript
select(columns)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `columns` | `Array\|string\|...string` | ✅ | 要选择的列。支持：<br/>- 字符串：'col1, col2, col3' (逗号分隔)<br/>- 数组：['col1', 'col2', 'col3']<br/>- 多参数：.select('col1', 'col2', 'col3')<br/>- 原始表达式：.select(db.raw('COUNT(*) as total')) |

#### 返回值

`Builder` - 返回查询构建器实例以便链式调用

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | columns 参数无效 | 确保列名为字符串或数组格式 |

#### 使用示例

**字符串格式（逗号分隔）：**

```javascript
db.table('users')
  .select('id, name, email')
  .get();
```

**数组格式（推荐）：**

```javascript
db.table('users')
  .select(['id', 'name', 'email'])
  .get();
```

**多参数格式：**

```javascript
db.table('users')
  .select('id', 'name', 'email')
  .get();
```

**原始SQL表达式：**

```javascript
db.table('orders')
  .select('id', db.raw('COUNT(*) as total'))
  .groupBy('user_id')
  .get();
```

**与其他方法链式调用：**

```javascript
const result = await db.table('users')
  .select(['id', 'name', 'created_at'])
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();
```

---

### where()

添加WHERE子句以过滤查询结果。支持多种调用方式，包括简单比较、嵌套条件和子查询。

#### 语法

```javascript
where(column, [operator], [value], [andOr])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string\|Array\|Function\|Builder` | ✅ | - | 过滤条件。支持：<br/>- 字符串：列名 (如 'email', 'age')<br/>- 数组：多个条件 [['col1', '=', 'val1'], ['col2', '>', 'val2']]<br/>- 函数：嵌套条件回调用于分组<br/>- Builder：子查询 |
| `operator` | `string` | ❌ | null | 比较操作符。支持：<br/>- 相等：'=', '<>', '!='<br/>- 比较：'>', '>=', '<', '<='<br/>- 模式：'LIKE', 'NOT LIKE'<br/>- 范围：'IN', 'NOT IN', 'BETWEEN'<br/>- 空值：'IS NULL', 'IS NOT NULL'<br/>- 省略时默认为 '=' (仅2参数调用) |
| `value` | `any` | ❌ | null | 比较值。支持：<br/>- 原始值：string, number, boolean, null<br/>- Builder：子查询<br/>- 函数：子查询回调<br/>- db.raw()：原始SQL表达式 |
| `andOr` | `string` | ❌ | 'and' | 逻辑操作符 ('and' 或 'or') 与前一条件结合 |

#### 返回值

`Builder` - 返回查询构建器实例以便链式调用

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 操作符无效 | 使用支持的操作符之一 |

#### 使用示例

**简单相等：**

```javascript
db.table('users')
  .where('status', '=', 'active')
  .get();
```

**隐含相等操作符（2参数调用）：**

```javascript
db.table('users')
  .where('status', 'active')
  .get();
```

**比较操作符：**

```javascript
db.table('products')
  .where('price', '>', 100)
  .where('stock', '>=', 10)
  .get();
```

**多个条件数组（AND）：**

```javascript
db.table('users')
  .where([
    ['status', '=', 'active'],
    ['role', '=', 'admin'],
    ['verified', '=', true]
  ])
  .get();
```

**嵌套条件回调（分组）：**

```javascript
db.table('orders')
  .where('paid', true)
  .where(q => {
    q.where('shipped', true)
     .orWhere('processing', true);
  })
  .get();
// 生成 SQL: WHERE paid = true AND (shipped = true OR processing = true)
```

**子查询作为条件：**

```javascript
db.table('users')
  .where('id', '=', db.table('admins').select('user_id'))
  .get();
```

**OR条件：**

```javascript
db.table('users')
  .where('status', 'active')
  .orWhere('premium', true)
  .get();
// 生成 SQL: WHERE status = 'active' OR premium = true
```

**空值检查：**

```javascript
db.table('users')
  .where('deleted_at', null)
  .get();
// 生成 SQL: WHERE deleted_at IS NULL
```

---

### orderBy()

添加ORDER BY子句对查询结果排序。支持单列或多列排序，包括子查询。

#### 语法

```javascript
orderBy(column, [direction])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string\|Array\|Function\|Builder` | ✅ | - | 排序规范。支持：<br/>- 字符串：列名 (如 'created_at', 'name')<br/>- 数组：多列 [['col1', 'ASC'], ['col2', 'DESC']]<br/>- 函数：嵌套排序回调<br/>- Builder：子查询排序 |
| `direction` | `string` | ❌ | 'asc' | 排序方向。选项：<br/>- 'asc' 或 'ASC'：升序（默认）<br/>- 'desc' 或 'DESC'：降序<br/>- 不区分大小写 |

#### 返回值

`Builder` - 返回查询构建器实例以便链式调用

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 无效的方向参数 | 使用 'asc', 'ASC', 'desc' 或 'DESC' |

#### 使用示例

**单列升序（默认）：**

```javascript
db.table('users')
  .where('status', 'active')
  .orderBy('created_at')
  .get();
```

**单列降序：**

```javascript
db.table('posts')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();
```

**多列不同方向：**

```javascript
db.table('orders')
  .orderBy([
    ['status', 'ASC'],
    ['total', 'DESC'],
    ['created_at', 'DESC']
  ])
  .get();
```

**不区分大小写的方向：**

```javascript
db.table('products')
  .where('category', 'electronics')
  .orderBy('price', 'DESC')
  .get();
```

**使用辅助方法：**

```javascript
db.table('posts')
  .orderByAsc('created_at')      // 升序
  .orderByDesc('views')           // 降序
  .get();
```

**复杂排序：**

```javascript
const results = await db.table('posts')
  .where('published', true)
  .orderBy('featured', 'desc')
  .orderBy('created_at', 'desc')
  .orderBy('title', 'asc')
  .limit(20)
  .get();
```

---

### limit()

设置LIMIT子句以限制返回的记录数。通常与offset()结合用于分页。

#### 语法

```javascript
limit(limit)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `limit` | `number` | ✅ | 返回的最大记录数。必须为：<br/>- 正整数：要检索的记录数<br/>- null 或 undefined：移除限制约束 |

#### 返回值

`Builder` - 返回查询构建器实例以便链式调用

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | limit 是负数 | 使用非负整数 |

#### 使用示例

**获取前10条记录：**

```javascript
db.table('users')
  .limit(10)
  .get();
```

**获取最新的5篇文章：**

```javascript
db.table('posts')
  .orderBy('created_at', 'desc')
  .limit(5)
  .get();
```

**分页：跳过20条，获取接下来的10条：**

```javascript
db.table('products')
  .offset(20)
  .limit(10)
  .orderBy('id')
  .get();
```

**单条记录（limit 1）：**

```javascript
db.table('users')
  .where('email', 'user@example.com')
  .limit(1)
  .first();  // 或使用 first() 替代
```

**与其他方法链式调用：**

```javascript
db.table('orders')
  .where('status', 'pending')
  .orderBy('created_at', 'desc')
  .limit(100)
  .get();
```

**分页实现：**

```javascript
const pageSize = 10;
const page = 2;
const offset = (page - 1) * pageSize;

const results = await db.table('posts')
  .orderBy('created_at', 'desc')
  .offset(offset)
  .limit(pageSize)
  .get();
```

---

### get()

执行SELECT查询并检索所有匹配的记录。这是从数据库获取数据的主要方法。

#### 语法

```javascript
await get([columns])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `columns` | `Array` | ❌ | `['*']` | 要选择的列。选项：<br/>- `['*']`：选择所有列（默认）<br/>- `['col1', 'col2']`：选择特定列<br/>- 可与 select() 方法结合 |

#### 返回值

`Promise<Array<Object>>` - 记录对象数组：
- 空数组 `[]`：没有记录匹配
- 对象数组：每个对象是一条数据库记录，属性对应选定的列

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 查询执行失败 | 检查数据库连接、SQL语法或权限 |
| `Error` | 数据库连接错误 | 验证数据库配置和连接参数 |

#### 使用示例

**获取所有用户：**

```javascript
const users = await db.table('users').get();
// 结果: [{id: 1, name: 'John', ...}, {id: 2, name: 'Jane', ...}]
console.log(`Found ${users.length} users`);
```

**获取特定列：**

```javascript
const names = await db.table('users')
  .select(['id', 'name', 'email'])
  .get();
```

**带WHERE条件的查询：**

```javascript
const active = await db.table('users')
  .where('status', 'active')
  .get();
```

**复杂多子句查询：**

```javascript
const results = await db.table('orders')
  .select(['id', 'customer_id', 'total', 'created_at'])
  .where('status', 'completed')
  .where('total', '>', 100)
  .orderBy('created_at', 'desc')
  .limit(50)
  .get();
```

**检查结果是否存在：**

```javascript
const records = await db.table('users')
  .where('email', 'test@example.com')
  .get();

if (records.length > 0) {
  console.log('Found user:', records[0]);
} else {
  console.log('User not found');
}
```

**条件获取：**

```javascript
const products = await db.table('products')
  .where('category', 'electronics')
  .where('in_stock', true)
  .orderBy('price', 'asc')
  .get();
```

---

### first()

执行SELECT查询并检索第一条匹配的记录。便利方法，自动应用LIMIT 1以提高效率。

#### 语法

```javascript
await first([columns])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `columns` | `Array` | ❌ | `['*']` | 要选择的列。选项：<br/>- `['*']`：选择所有列（默认）<br/>- `['col1', 'col2']`：选择特定列 |

#### 返回值

`Promise<Object|null>` - 第一条匹配的记录或null：
- 对象：第一条匹配查询条件的记录
- `null`：没有记录匹配条件

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 查询执行失败 | 检查数据库连接、SQL语法或权限 |
| `Error` | 数据库连接错误 | 验证数据库配置和连接参数 |

#### 使用示例

**获取第一个用户：**

```javascript
const user = await db.table('users').first();
if (user) {
  console.log('First user:', user.name);
} else {
  console.log('No users found');
}
```

**按特定列查找用户：**

```javascript
const user = await db.table('users')
  .where('email', 'john@example.com')
  .first();

if (!user) {
  console.log('User not found');
} else {
  console.log('Found user:', user.id);
}
```

**获取特定列的第一条记录：**

```javascript
const user = await db.table('users')
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .first(['id', 'name', 'email']);
```

**获取最新发布的文章：**

```javascript
const latestPost = await db.table('posts')
  .orderBy('published_at', 'desc')
  .first();

if (latestPost) {
  console.log('Latest post:', latestPost.title);
}
```

**复杂WHERE条件：**

```javascript
const admin = await db.table('users')
  .where('role', 'admin')
  .where('active', true)
  .first(['id', 'name']);
```

**存在性检查：**

```javascript
const exists = await db.table('users')
  .where('email', 'test@example.com')
  .first() !== null;

console.log(exists ? 'User exists' : 'User not found');
```

---

### count()

获取匹配查询条件的记录数。执行COUNT聚合函数。

#### 语法

```javascript
await count([column])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string` | ❌ | `'*'` | 要计数的列。选项：<br/>- `'*'`：计数所有行（默认，推荐）<br/>- 列名：计数该列的非空值<br/>- 'id'：按主键计数（用于按组计数） |

#### 返回值

`Promise<number>` - 匹配的记录总数：
- 整数 >= 0：匹配查询的记录数
- 0：没有记录匹配条件
- 总是返回整数，从不返回null

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 查询执行失败 | 检查数据库连接或SQL语法 |
| `Error` | 无效的列名 | 验证列名是否存在 |

#### 使用示例

**计算所有用户数：**

```javascript
const total = await db.table('users').count();
console.log(`Total users: ${total}`);
```

**带WHERE条件的计数：**

```javascript
const activeCount = await db.table('users')
  .where('status', 'active')
  .count();
console.log(`Active users: ${activeCount}`);
```

**多条件计数：**

```javascript
const adultCount = await db.table('users')
  .where('age', '>=', 18)
  .where('status', 'active')
  .count();
```

**计算列中的非空值：**

```javascript
const filledEmails = await db.table('users')
  .where('email', '!=', null)
  .count('email');
```

**分页 - 计算总记录数：**

```javascript
const pageSize = 10;
const total = await db.table('posts').count();
const totalPages = Math.ceil(total / pageSize);
console.log(`Total pages: ${totalPages}`);
```

**检查记录是否存在：**

```javascript
const exists = await db.table('users')
  .where('email', 'test@example.com')
  .count() > 0;

if (exists) {
  console.log('Email already registered');
}
```

**计数活跃订单：**

```javascript
const activeOrders = await db.table('orders')
  .where('status', 'pending')
  .orWhere('status', 'processing')
  .count();
```

**分组后计数：**

```javascript
const userCount = await db.table('users')
  .where('role', 'admin')
  .count();
```

---

## JOIN 操作

JOIN操作允许你在多个表之间组合数据。Builder支持所有标准SQL JOIN类型，包括INNER JOIN、LEFT JOIN、RIGHT JOIN和CROSS JOIN，以及基于子查询的高级JOIN操作。

### join() - 通用JOIN方法

执行指定类型的JOIN操作，默认为INNER JOIN。支持多种参数组合和callback方式定义复杂的JOIN条件。

#### 语法

```javascript
join(table, first, operator, second, type, isWhere)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `table` | `string\|Function\|Builder` | ✅ | - | 要JOIN的表名称、子查询回调或Builder实例 |
| `first` | `string\|Function` | ✅ | - | JOIN条件：左表列名或callback函数 |
| `operator` | `string` | ❌ | `'='` | 比较运算符（=, <, >, <=, >=, !=, like等） |
| `second` | `string\|number\|boolean` | ❌ | `null` | 右表列名或比较值 |
| `type` | `string` | ❌ | `'inner'` | JOIN类型：'inner'\|'left'\|'right'\|'full'\|'cross' |
| `isWhere` | `boolean` | ❌ | `false` | 若为true，使用WHERE子句而非ON子句 |

#### 返回值

`Builder` - 返回查询构建器实例以便链式调用

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 运算符无效 | 检查运算符是否为有效的SQL比较运算符 |
| `Error` | JOIN语法错误 | 确保提供正确的列名和参数组合 |

#### 使用示例

**基础两参数JOIN：**

```javascript
// 简单JOIN - 参数顺序: 表, 左列, 右列 (假设运算符为'=')
const orders = await db.table('users')
  .join('orders', 'users.id', 'orders.user_id')
  .select(['users.name', 'orders.total', 'orders.created_at'])
  .get();
```

**完整四参数JOIN：**

```javascript
// 指定运算符的JOIN
const recentOrders = await db.table('users')
  .join('orders', 'users.id', '=', 'orders.user_id')
  .where('orders.created_at', '>', '2024-01-01')
  .select(['users.name', 'orders.total'])
  .orderBy('orders.created_at', 'desc')
  .get();
```

**Callback方式定义复杂JOIN条件：**

```javascript
// 使用callback定义多个JOIN条件
const data = await db.table('users')
  .join('posts', (join) => {
    join.on('users.id', '=', 'posts.user_id')
        .on('posts.status', '=', 'published')
        .on('posts.deleted_at', null);
  })
  .select(['users.name', 'posts.title', 'posts.content'])
  .get();
```

**JOIN配合WHERE条件：**

```javascript
// 组合JOIN、WHERE、ORDER BY和LIMIT
const topSellers = await db.table('users')
  .join('orders', 'users.id', 'orders.user_id')
  .where('users.role', 'seller')
  .where('orders.status', 'completed')
  .select(['users.name', db.raw('COUNT(orders.id) as total_orders')])
  .groupBy('users.id')
  .orderBy('total_orders', 'desc')
  .limit(10)
  .get();
```

---

### leftJoin() - 左连接

执行LEFT JOIN操作，保留左表的所有行，即使右表中没有匹配的数据。

#### 语法

```javascript
leftJoin(table, first, operator, second)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `table` | `string` | ✅ | - | 右表名称 |
| `first` | `string\|Function` | ✅ | - | JOIN条件或callback |
| `operator` | `string` | ❌ | `'='` | 比较运算符 |
| `second` | `string\|number` | ❌ | `null` | 右表列名或值 |

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**基础LEFT JOIN - 包含没有订单的用户：**

```javascript
const usersWithOrders = await db.table('users')
  .leftJoin('orders', 'users.id', 'orders.user_id')
  .select(['users.id', 'users.name', 'orders.total'])
  .orderBy('users.id')
  .get();
// 结果包含所有用户，没有订单的用户的orders列为NULL
```

**统计每个用户的订单数（包含0个订单的用户）：**

```javascript
const userOrderCounts = await db.table('users')
  .leftJoin('orders', 'users.id', 'orders.user_id')
  .select(['users.name', db.raw('COUNT(orders.id) as order_count')])
  .where('users.status', 'active')
  .groupBy('users.id')
  .orderBy('order_count', 'desc')
  .get();
```

**多个LEFT JOIN：**

```javascript
const userProfileData = await db.table('users')
  .leftJoin('profiles', 'users.id', 'profiles.user_id')
  .leftJoin('settings', 'users.id', 'settings.user_id')
  .select([
    'users.name',
    'profiles.bio',
    'profiles.avatar',
    'settings.theme',
    'settings.language'
  ])
  .get();
```

---

### rightJoin() - 右连接

执行RIGHT JOIN操作，保留右表的所有行，即使左表中没有匹配的数据。

#### 语法

```javascript
rightJoin(table, first, operator, second)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `table` | `string` | ✅ | - | 右表名称 |
| `first` | `string\|Function` | ✅ | - | JOIN条件或callback |
| `operator` | `string` | ❌ | `'='` | 比较运算符 |
| `second` | `string\|number` | ❌ | `null` | 右表列名或值 |

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**RIGHT JOIN - 获取所有文章及其作者（如果存在）：**

```javascript
const allPosts = await db.table('users')
  .rightJoin('posts', 'users.id', 'posts.user_id')
  .select(['posts.title', 'posts.content', 'users.name as author'])
  .orderBy('posts.created_at', 'desc')
  .get();
```

---

### crossJoin() - 交叉连接

执行CROSS JOIN（笛卡尔积），将左表的每一行与右表的每一行组合。不需要JOIN条件。

#### 语法

```javascript
crossJoin(table)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `table` | `string` | ✅ | 要交叉连接的表名称 |

#### 返回值

`Builder` - 返回查询构建器实例

#### 警告

⚠️ CROSS JOIN会产生笛卡尔积，结果集大小为：left_rows × right_rows。对大表使用要谨慎！

#### 使用示例

**创建所有可能的组合：**

```javascript
// 生成所有尺寸和颜色的组合
const productVariants = await db.table('sizes')
  .crossJoin('colors')
  .select([
    'sizes.name as size',
    'colors.name as color',
    db.raw("CONCAT(sizes.id, '-', colors.id) as sku")
  ])
  .get();
// 结果: sizes.length × colors.length 行数据
```

---

## 子查询JOIN操作

子查询JOIN允许你与经过过滤或聚合的数据进行JOIN，而无需创建数据库视图。

### joinSub() - 子查询JOIN

与子查询执行JOIN操作。子查询可以是callback、Builder实例或原始SQL字符串。

#### 语法

```javascript
joinSub(table, as, first, operator, second, type, isWhere)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `table` | `Function\|Builder\|string` | ✅ | - | 子查询：callback、Builder或SQL字符串 |
| `as` | `string` | ✅ | - | 子查询的表别名 |
| `first` | `string\|Function` | ✅ | - | JOIN条件或callback |
| `operator` | `string` | ❌ | `'='` | 比较运算符 |
| `second` | `string\|number` | ❌ | `null` | 比较值 |
| `type` | `string` | ❌ | `'inner'` | JOIN类型 |
| `isWhere` | `boolean` | ❌ | `false` | 使用WHERE代替ON |

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**与聚合子查询JOIN：**

```javascript
// 获取用户及其订单统计信息
const userOrderStats = await db.table('users')
  .joinSub(
    (q) => q.table('orders')
           .select('user_id', db.raw('COUNT(*) as total'))
           .where('status', 'completed')
           .groupBy('user_id'),
    'order_stats',
    'users.id', '=', 'order_stats.user_id'
  )
  .select(['users.name', 'order_stats.total'])
  .orderBy('order_stats.total', 'desc')
  .get();
```

**使用Builder实例作为子查询：**

```javascript
// 预定义子查询Builder
const recentOrders = db.table('orders')
  .where('created_at', '>', '2024-01-01')
  .select('id', 'user_id', 'total');

// 使用子查询JOIN
const recentUserOrders = await db.table('users')
  .joinSub(recentOrders, 'recent', 'users.id', 'recent.user_id')
  .where('users.status', 'active')
  .get();
```

---

### leftJoinSub() - 左子查询JOIN

与子查询执行LEFT JOIN，保留所有左表行。

#### 语法

```javascript
leftJoinSub(table, as, first, operator, second)
```

#### 参数

同 `joinSub()` 但类型固定为 'left'

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**左连接子查询 - 包含没有订单的用户：**

```javascript
// 获取所有用户及其订单计数（包括没有订单的用户）
const allUserStats = await db.table('users')
  .leftJoinSub(
    (q) => q.table('orders')
           .select('user_id', db.raw('COUNT(*) as count'))
           .groupBy('user_id'),
    'stats',
    'users.id', '=', 'stats.user_id'
  )
  .select([
    'users.name',
    db.raw('COALESCE(stats.count, 0) as order_count')
  ])
  .orderBy('order_count', 'desc')
  .get();
```

---

### rightJoinSub() - 右子查询JOIN

与子查询执行RIGHT JOIN，保留所有右表（子查询）行。

#### 语法

```javascript
rightJoinSub(table, as, first, operator, second)
```

#### 参数

同 `joinSub()` 但类型固定为 'right'

#### 返回值

`Builder` - 返回查询构建器实例

---

## GROUP BY 和聚合

### groupBy() - 分组

按一个或多个列对行进行分组，通常与聚合函数（COUNT、SUM、AVG等）配合使用。

#### 语法

```javascript
groupBy(column, sort)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string\|Array\|Function\|Builder` | ✅ | - | 分组列：单列名、多列数组、subquery callback或Builder |
| `sort` | `string` | ❌ | `'ASC'` | 分组内排序：'ASC'或'DESC' |

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**基础单列分组：**

```javascript
// 按客户统计订单数
const customerOrderCounts = await db.table('orders')
  .select(['customer_id', db.raw('COUNT(*) as total_orders')])
  .groupBy('customer_id')
  .get();
```

**多列分组：**

```javascript
// 按地区和产品分组统计销售额
const salesByRegionProduct = await db.table('sales')
  .select([
    'region',
    'product',
    db.raw('SUM(amount) as total_sales'),
    db.raw('COUNT(*) as transactions')
  ])
  .groupBy([['region', 'ASC'], ['product', 'ASC']])
  .orderBy('total_sales', 'desc')
  .get();
```

**分组配合HAVING：**

```javascript
// 获取订单超过10个的客户
const frequentCustomers = await db.table('orders')
  .select(['customer_id', db.raw('COUNT(*) as order_count')])
  .groupBy('customer_id')
  .having('order_count', '>', 10)
  .orderBy('order_count', 'desc')
  .get();
```

---

### having() - 分组过滤

对GROUP BY的结果进行过滤。只能与GROUP BY一起使用，操作聚合函数的结果。

#### 语法

```javascript
having(column, operator, value, andOr)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string\|Array\|Function\|Builder` | ✅ | - | 聚合表达式或列名 |
| `operator` | `string` | ❌ | `null` | 比较运算符 |
| `value` | `any` | ❌ | `null` | 比较值 |
| `andOr` | `string` | ❌ | `'and'` | 逻辑运算符：'and'或'or' |

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**简单HAVING条件：**

```javascript
// 找到订单总额超过5000的客户
const highValueCustomers = await db.table('orders')
  .select(['customer_id', db.raw('SUM(total) as total_spent')])
  .groupBy('customer_id')
  .having('total_spent', '>', 5000)
  .orderBy('total_spent', 'desc')
  .get();
```

**多个HAVING条件：**

```javascript
// 订单数在5-20之间的客户
const data = await db.table('orders')
  .select(['customer_id', db.raw('COUNT(*) as count')])
  .groupBy('customer_id')
  .having('count', '>=', 5)
  .having('count', '<=', 20)
  .get();
```

**HAVING与聚合函数：**

```javascript
// 平均订单金额超过100的客户
const affluent = await db.table('orders')
  .select(['customer_id', db.raw('AVG(total) as avg_order')])
  .groupBy('customer_id')
  .having(db.raw('AVG(total)'), '>', 100)
  .get();
```

---

## UNION 操作

### union() - 并集操作

将两个或多个SELECT查询的结果组合为单个结果集，自动去除重复行。

#### 语法

```javascript
union(query, all)
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `query` | `Builder\|Function` | ✅ | - | 要合并的查询：Builder实例或callback |
| `all` | `boolean` | ❌ | `false` | 为true时使用UNION ALL（保留重复）；false为UNION（去重） |

#### 返回值

`Builder` - 返回查询构建器实例

#### 注意事项

- 两个查询必须返回相同数量的列
- 对应列的数据类型应兼容
- 结果列名来自第一个查询
- 排序应在最后进行（对整个UNION结果）

#### 使用示例

**基础UNION - 去除重复：**

```javascript
// 合并US和UK的活跃客户，去除重复
const customers = await db.table('us_customers')
  .select(['name', 'email', 'city'])
  .where('status', 'active')
  .union(
    (q) => q.table('uk_customers')
           .select(['name', 'email', 'city'])
           .where('status', 'active')
  )
  .orderBy('name')
  .get();
```

---

### unionAll() - 并集操作（保留重复）

将两个或多个查询的结果组合，保留所有行包括重复的。性能通常比UNION更好。

#### 语法

```javascript
unionAll(query)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `query` | `Builder\|Function` | ✅ | 要合并的查询 |

#### 返回值

`Builder` - 返回查询构建器实例

#### 使用示例

**UNION ALL - 保留重复数据：**

```javascript
// 合并当前和历史日志，保留所有数据
const allLogs = await db.table('logs')
  .select(['event', 'timestamp', 'user_id', 'level'])
  .where('level', 'error')
  .unionAll(
    (q) => q.table('archived_logs')
           .select(['event', 'timestamp', 'user_id', 'level'])
           .where('level', 'error')
  )
  .orderBy('timestamp', 'desc')
  .limit(1000)
  .get();
```

**多个UNION ALL组合：**

```javascript
// 合并三个地区的销售数据
const allSales = await db.table('sales_region1')
  .select(['date', 'amount', 'product'])
  .unionAll(
    (q) => q.table('sales_region2')
           .select(['date', 'amount', 'product'])
  )
  .unionAll(
    (q) => q.table('sales_region3')
           .select(['date', 'amount', 'product'])
  )
  .orderBy('date', 'desc')
  .get();
```

---

## 条件表达式 (Conditional Expressions)

条件表达式用于在SELECT、UPDATE和WHERE子句中实现复杂的条件逻辑。Builder支持SQL CASE表达式的两种模式：简单CASE（评估单列）和搜索CASE（使用复杂条件回调）。

### case() - 创建CASE表达式

使用CASE语句来实现条件逻辑。支持两种模式：简单CASE（针对单列）和搜索CASE（针对复杂条件）。

#### 语法

```javascript
case([column])
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `column` | `string\|null` | ❌ | 要评估的列名。<br/>- 有值：简单CASE语句（`CASE column WHEN ... THEN ...`）<br/>- null或不传：搜索CASE语句（`CASE WHEN condition THEN ...`） |

#### 返回值

`CaseBuilder` - 返回CaseBuilder实例，支持链式调用 `when()` → `else()` → `end()`

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 未调用 `end()` 完成表达式 | 确保调用 `.end()` 来完成CASE表达式 |
| `Error` | 在WHERE/HAVING中使用CASE但条件无效 | 验证WHEN条件的语法和类型 |

#### 使用示例

**简单CASE - 根据单列值返回不同结果：**

```javascript
db.table('orders')
  .select('id', 'total',
    db.case('status')
      .when('pending', 'Processing')
      .when('shipped', 'In Transit')
      .when('delivered', 'Completed')
      .else('Unknown')
      .end('status_display')
  )
  .get();

// 生成的SQL:
// SELECT `id`, `total`,
//   CASE `status`
//     WHEN ? THEN ?
//     WHEN ? THEN ?
//     WHEN ? THEN ?
//     ELSE ?
//   END AS `status_display`
// FROM `orders`
```

**搜索CASE - 使用复杂条件：**

```javascript
db.table('products')
  .select('name', 'price',
    db.case()
      .when(q => q.where('price', '>', 1000), 'Premium')
      .when(q => q.where('price', '>', 500), 'Mid-range')
      .when(q => q.where('price', '>', 100), 'Standard')
      .else('Budget')
      .end('price_category')
  )
  .get();

// 生成的SQL:
// SELECT `name`, `price`,
//   CASE
//     WHEN `price` > ? THEN ?
//     WHEN `price` > ? THEN ?
//     WHEN `price` > ? THEN ?
//     ELSE ?
//   END AS `price_category`
// FROM `products`
```

**CASE with numeric values - 用于计算或评分：**

```javascript
db.table('users')
  .select('name',
    db.case('account_status')
      .when('active', 1)
      .when('inactive', 0)
      .when('suspended', -1)
      .else(2)  // 未知状态
      .end('status_code')
  )
  .where('role', 'member')
  .get();
```

**CASE in WHERE clause - 在WHERE子句中使用CASE进行条件过滤：**

```javascript
db.table('orders')
  .select('id', 'total')
  .where('total', '>', 
    db.case()
      .when(q => q.where('customer_type', 'vip'), 100)
      .when(q => q.where('customer_type', 'regular'), 50)
      .else(25)
      .end()
  )
  .get();
```

**嵌套CASE - 复杂的分类逻辑：**

```javascript
db.table('sales')
  .select('amount',
    db.case()
      .when(q => q.where('amount', '>', 10000)
              .where('region', 'north'), 'Premium-North')
      .when(q => q.where('amount', '>', 10000)
              .where('region', 'south'), 'Premium-South')
      .when(q => q.where('amount', '>', 5000), 'Standard')
      .else('Budget')
      .end('tier')
  )
  .get();
```

**CASE in UPDATE - 在UPDATE语句中使用条件更新：**

```javascript
await db.table('users').update({
  loyalty_points: db.case('purchase_count')
    .when(5, 100)
    .when(10, 250)
    .when(20, 500)
    .else(0)
    .end(),
  tier: db.case()
    .when(q => q.where('purchase_count', '>=', 20), 'Gold')
    .when(q => q.where('purchase_count', '>=', 10), 'Silver')
    .else('Bronze')
    .end()
});
```

---

### caseRaw() - 创建搜索CASE表达式（别名）

`caseRaw()` 是 `case()` 不传参数的简便别名，用于创建搜索CASE语句。等同于 `case(null)`。

#### 语法

```javascript
caseRaw()
```

#### 返回值

`CaseBuilder` - 返回CaseBuilder实例，用于搜索CASE表达式

#### 使用示例

**简化搜索CASE语法：**

```javascript
// 这两种写法等价
const method1 = db.case();
const method2 = db.caseRaw();

// 使用 caseRaw() 更清晰地表示搜索CASE
db.table('orders')
  .select('total',
    db.caseRaw()
      .when(q => q.where('total', '>', 1000).where('vip', true), 0.2)
      .when(q => q.where('total', '>', 500), 0.1)
      .when(q => q.where('total', '>', 100), 0.05)
      .else(0)
      .end('discount_rate')
  )
  .get();
```

**与whereRaw结合处理复杂SQL条件：**

```javascript
db.table('users')
  .select('name',
    db.caseRaw()
      .when(q => q.whereRaw('age >= ?', [65]), 'Senior')
      .when(q => q.whereRaw('age >= ? AND verified = ?', [18, true]), 'Adult')
      .else('Minor')
      .end('age_group')
  )
  .get();
```

---

### when() - 在CASE中添加条件

向CASE表达式中添加一个WHEN条件。支持简单值匹配（用于简单CASE）和复杂条件回调（用于搜索CASE）。

#### 语法

```javascript
when(condition, value)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `condition` | `string\|number\|Function` | ✅ | WHEN条件：<br/>- **简单CASE**：要匹配的值（字符串、数字等）<br/>- **搜索CASE**：回调函数，接收Builder实例，使用WHERE方法定义条件 |
| `value` | `any` | ✅ | 当条件匹配时要返回的值 |

#### 返回值

`CaseBuilder` - 返回自身以支持链式调用

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 回调函数中的条件无效 | 确保使用有效的WHERE方法和参数 |

#### 使用示例

**多个简单WHEN条件：**

```javascript
db.case('status')
  .when('active', 'Active User')
  .when('pending', 'Pending Approval')
  .when('inactive', 'Inactive User')
  .when('deleted', 'Deleted User')
  .else('Unknown Status')
  .end('status_label')
```

**搜索CASE中的多个WHEN条件：**

```javascript
db.caseRaw()
  .when(q => q.where('score', '>=', 90), 'A')
  .when(q => q.where('score', '>=', 80), 'B')
  .when(q => q.where('score', '>=', 70), 'C')
  .when(q => q.where('score', '>=', 60), 'D')
  .else('F')
  .end('grade')
```

**组合多个WHERE条件：**

```javascript
db.caseRaw()
  .when(q => {
    q.where('age', '>=', 65);
    q.where('status', 'active');
  }, 'Eligible for Benefits')
  .when(q => q.where('age', '>=', 18), 'Adult')
  .else('Minor')
  .end('eligibility')
```

**使用不同的比较操作符：**

```javascript
db.case()
  .when(q => q.where('price', '<', 50), 'Cheap')
  .when(q => q.where('price', '>=', 50).where('price', '<', 150), 'Standard')
  .when(q => q.where('price', '>=', 150), 'Premium')
  .end('price_range')
```

---

### else() - 设置CASE的默认值

设置当所有WHEN条件都不匹配时的默认值。如果不指定ELSE，未匹配的行将返回NULL。

#### 语法

```javascript
else(value)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `value` | `any` | ✅ | 当所有WHEN条件都不匹配时返回的默认值 |

#### 返回值

`CaseBuilder` - 返回自身以支持链式调用

#### 使用示例

**提供默认字符串值：**

```javascript
db.case('status')
  .when('completed', 'Done')
  .when('in_progress', 'Working')
  .else('Not Started')
  .end('status_text')
```

**提供默认数字值：**

```javascript
db.case('rating')
  .when(5, 'Excellent')
  .when(4, 'Good')
  .when(3, 'Average')
  .when(2, 'Poor')
  .when(1, 'Very Poor')
  .else(0)  // 无评分默认为0
  .end('rating_score')
```

**提供NULL作为默认值（或不调用else）：**

```javascript
// 以下两种写法等价 - 都返回NULL
db.case('type')
  .when('A', 'Type A')
  .when('B', 'Type B')
  .else(null)
  .end('type_name')

// 或省略 else()
db.case('type')
  .when('A', 'Type A')
  .when('B', 'Type B')
  .end('type_name')
```

**处理NULL值和默认情况：**

```javascript
db.case()
  .when(q => q.where('last_login', 'IS NOT', null), 'Active')
  .when(q => q.where('created_at', '>', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)')), 'New User')
  .else('Inactive')
  .end('user_status')
```

---

### end() - 完成CASE表达式

完成CASE表达式的构建，编译为SQL，并返回可用于SELECT、UPDATE或WHERE子句的原始SQL对象。

#### 语法

```javascript
end([alias])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `alias` | `string\|null` | ❌ | `null` | 可选的列别名。如指定，生成的SQL会包含 `AS alias` 子句 |

#### 返回值

`Object` - 原始SQL对象，结构为：
```javascript
{
  type: 'raw',
  raw: true,
  value: 'CASE ... WHEN ... THEN ... ELSE ... END [AS alias]'
}
```

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 绑定参数数量与SQL不匹配 | 确保每个条件都提供了正确的值 |

#### 使用示例

**带别名的SELECT：**

```javascript
const result = await db.table('orders')
  .select('id', 'amount',
    db.case('status')
      .when('completed', 1)
      .when('pending', 0)
      .when('cancelled', -1)
      .else(2)
      .end('order_status_code')  // AS order_status_code
  )
  .get();

// 返回: [
//   { id: 1, amount: 100, order_status_code: 1 },
//   { id: 2, amount: 200, order_status_code: 0 },
//   ...
// ]
```

**不带别名的WHERE子句：**

```javascript
const vipOrders = await db.table('orders')
  .select('id', 'total')
  .where(
    db.case()
      .when(q => q.where('customer_tier', 'vip'), true)
      .when(q => q.where('lifetime_value', '>', 10000), true)
      .else(false)
      .end()  // 不需要别名，直接用于WHERE条件
  )
  .get();
```

**在UPDATE中使用CASE结果：**

```javascript
await db.table('products').update({
  discount: db.case('category')
    .when('clearance', 0.5)
    .when('seasonal', 0.3)
    .when('featured', 0.1)
    .else(0)
    .end('calculated_discount')  // 或不带别名
});
```

**多个CASE表达式：**

```javascript
const report = await db.table('sales')
  .select(
    'product_id',
    db.case('region')
      .when('north', 'Northern Region')
      .when('south', 'Southern Region')
      .else('Other')
      .end('region_name'),
    db.case()
      .when(q => q.where('amount', '>', 1000), 'Large Sale')
      .when(q => q.where('amount', '>', 500), 'Medium Sale')
      .else('Small Sale')
      .end('sale_size')
  )
  .get();
```

---

## CaseBuilder 类

`CaseBuilder` 是用于构建CASE表达式的助手类。通过 `db.case()` 或 `db.caseRaw()` 创建。

### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `builder` | `Builder` | 父查询构建器实例 |
| `column` | `string\|null` | 要评估的列（简单CASE）或null（搜索CASE） |
| `conditions` | `Array` | 存储的WHEN条件数组 |
| `elseValue` | `any` | ELSE子句的值 |

### 方法链

CaseBuilder的所有方法都返回自身，支持流畅的链式调用：

```javascript
db.case('status')
  .when('active', 1)    // 返回 CaseBuilder
  .when('inactive', 0)  // 返回 CaseBuilder
  .else(2)              // 返回 CaseBuilder
  .end('code')          // 返回原始SQL对象
```

---

## CASE WHEN 最佳实践

### 1. 简单CASE vs 搜索CASE

```javascript
// ✅ 好：简单CASE - 当评估单列时使用
db.case('status')
  .when('active', 1)
  .when('inactive', 0)
  .end('status_code')

// ✅ 好：搜索CASE - 当有复杂条件时使用
db.case()
  .when(q => q.where('age', '>=', 65).where('verified', true), 'Senior')
  .when(q => q.where('age', '>=', 18), 'Adult')
  .end('age_group')

// ❌ 避免：在简单CASE中使用复杂逻辑
db.case('age')  // 这里age是数字，不能用where
  .when(q => q.where('verified', true), 'Bad Practice')
  .end()
```

### 2. 参数绑定和安全性

```javascript
// ✅ 好：自动参数绑定防止SQL注入
db.case('status')
  .when('pending', 'Processing')  // 自动绑定
  .when('completed', 'Done')
  .end()

// ✅ 安全：使用回调和where()自动转义
db.case()
  .when(q => q.where('email', 'like', userInput), 'Match')
  .end()

// ⚠️ 避免：直接使用whereRaw需要手动绑定
db.case()
  .when(q => q.whereRaw(`email = ?`, [userInput]), 'Match')
  .end()
```

### 3. 性能考虑

```javascript
// ✅ 好：在SELECT中使用CASE做分类
const sales = await db.table('sales')
  .select('*',
    db.case('amount')
      .when(q => q.where('amount', '>', 1000), 'High')
      .else('Low')
      .end('tier')
  )
  .get();

// ⚠️ 注意：避免在WHERE中使用复杂CASE
// 这可能导致全表扫描，没有索引利用
const bad = await db.table('orders')
  .where(
    db.case('status')
      .when('completed', 1)
      .else(0)
      .end()
  )
  .get();

// ✅ 好：直接使用WHERE，CASE只用于SELECT
const good = await db.table('orders')
  .select('*',
    db.case('status')
      .when('completed', 'Done')
      .else('Pending')
      .end('display')
  )
  .where('status', 'completed')
  .get();
```

### 4. NULL处理

```javascript
// ✅ 好：显式处理NULL值
db.case()
  .when(q => q.where('description', 'IS NOT', null), 'Has Description')
  .when(q => q.where('description', 'IS', null), 'No Description')
  .else('Unknown')
  .end('desc_status')

// ⚠️ 注意：未匹配的行返回NULL
db.case('status')
  .when('active', 1)
  .when('inactive', 0)
  // 其他值返回 NULL，可用else()处理
  .end()

// ✅ 好：使用else()避免NULL
db.case('status')
  .when('active', 1)
  .when('inactive', 0)
  .else(-1)  // 明确处理其他情况
  .end()
```

### 5. 数据类型一致性

```javascript
// ✅ 好：THEN值类型一致
db.case('rating')
  .when(5, 'Excellent')
  .when(4, 'Good')
  .when(3, 'Average')
  .else('Poor')  // 都是字符串
  .end()

// ✅ 好：都是数字
db.case('score')
  .when(q => q.where('score', '>=', 90), 4)
  .when(q => q.where('score', '>=', 80), 3)
  .when(q => q.where('score', '>=', 70), 2)
  .else(1)  // 都是数字
  .end()

// ⚠️ 避免：混合数据类型可能导致转换问题
db.case('type')
  .when('A', 1)     // 数字
  .when('B', 'Two') // 字符串 - 混合！
  .end()
```

---

## CASE WHEN 实际应用示例

### 示例1：电商订单分类

```javascript
const orders = await db.table('orders')
  .select(
    'id', 'customer_id', 'total',
    db.case()
      .when(q => q.where('total', '>', 1000).where('status', 'completed'), 'Premium Completed')
      .when(q => q.where('total', '>', 1000).where('status', 'pending'), 'Premium Pending')
      .when(q => q.where('total', '<=', 1000).where('status', 'completed'), 'Regular Completed')
      .when(q => q.where('total', '<=', 1000).where('status', 'pending'), 'Regular Pending')
      .else('Unknown')
      .end('order_category'),
    db.case('status')
      .when('pending', 0)
      .when('processing', 1)
      .when('shipped', 2)
      .when('delivered', 3)
      .when('returned', -1)
      .else(-2)
      .end('status_code')
  )
  .where('created_at', '>', '2024-01-01')
  .orderBy('total', 'desc')
  .get();
```

### 示例2：用户权限等级

```javascript
const users = await db.table('users')
  .select(
    'id', 'username',
    db.case()
      .when(q => q.where('admin', true), 'Administrator')
      .when(q => q.where('moderator', true), 'Moderator')
      .when(q => q.where('premium', true).where('verified', true), 'Premium Member')
      .when(q => q.where('verified', true), 'Verified Member')
      .else('Regular Member')
      .end('role'),
    db.case('subscription_tier')
      .when('platinum', 3)
      .when('gold', 2)
      .when('silver', 1)
      .else(0)
      .end('tier_level')
  )
  .where('status', 'active')
  .get();
```

### 示例3：销售业绩评估

```javascript
const salesReport = await db.table('sales')
  .select(
    'salesperson_id',
    db.raw('SUM(amount) as total_sales'),
    db.case()
      .when(q => q.whereRaw('SUM(amount) >= 50000'), 'Excellent')
      .when(q => q.whereRaw('SUM(amount) >= 30000'), 'Good')
      .when(q => q.whereRaw('SUM(amount) >= 10000'), 'Fair')
      .else('Needs Improvement')
      .end('performance_rating')
  )
  .where('year', 2024)
  .groupBy('salesperson_id')
  .orderByRaw('total_sales DESC')
  .get();
```

---

## 数据修改方法

数据修改方法用于向数据库表中插入、更新或删除记录。所有这些方法都是异步的，需要使用 `await` 关键字调用。

### insert() - 插入记录

向表中插入一条或多条新记录。支持单条插入和批量插入操作。

#### 语法

```javascript
await insert([data])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `data` | `Object\|Array<Object>` | ❌ | `{}` | 要插入的数据。支持：<br/>- 单个对象：`{ column1: value1, column2: value2 }`<br/>- 对象数组：`[{ ... }, { ... }]` 用于批量插入<br/>- 空对象：`{}` 插入默认值<br/>- 支持的值类型：字符串、数字、布尔值、日期、null |

#### 返回值

`Promise<number>` - 插入的行数：
- 大于等于 1：成功插入的记录数
- 0：插入失败但无异常（罕见）

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 数据库连接错误 | 验证数据库配置 |
| `Error` | 唯一性约束冲突（主键/唯一键重复） | 检查是否已存在相同数据或使用upsert |
| `Error` | 外键约束冲突 | 确保引用的记录存在 |
| `Error` | NOT NULL约束冲突 | 为必填列提供值 |
| `Error` | 权限被拒绝 | 检查数据库用户权限 |

#### 使用示例

**单条插入：**

```javascript
const inserted = await db.table('users').insert({
  name: 'John Doe',
  email: 'john@example.com',
  created_at: new Date()
});
console.log(`Inserted ${inserted} record(s)`);
```

**批量插入多条记录：**

```javascript
const inserted = await db.table('products').insert([
  { name: 'Product A', price: 29.99, stock: 100 },
  { name: 'Product B', price: 49.99, stock: 50 },
  { name: 'Product C', price: 99.99, stock: 25 }
]);
console.log(`Inserted ${inserted} products`);
```

**包含NULL值的插入：**

```javascript
const inserted = await db.table('users').insert({
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: null,
  bio: null
});
```

**批量导入来自外部源的数据：**

```javascript
const records = await fetchFromAPI();
const inserted = await db.table('imports').insert(
  records.map(r => ({
    external_id: r.id,
    data: JSON.stringify(r),
    imported_at: new Date()
  }))
);
console.log(`Imported ${inserted} records`);
```

---

### insertGetId() - 插入并获取ID

插入一条或多条记录，并返回最后一条记录的自动生成的主键。

#### 语法

```javascript
await insertGetId([data])
```

#### 参数

同 `insert()` 方法

#### 返回值

`Promise<number>` - 最后插入的记录的ID（自动生成的主键）：
- 正整数：新插入记录的ID
- 批量插入时：返回最后一条记录的ID

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 插入失败 | 检查数据约束 |
| `Error` | 无法获取插入ID | 确保表有自增主键 |
| `Error` | 表没有自增主键 | 添加AUTOINCREMENT主键或使用insert() |

#### 使用示例

**插入用户并获取ID：**

```javascript
const userId = await db.table('users').insertGetId({
  name: 'John Doe',
  email: 'john@example.com'
});
console.log(`Created user with ID: ${userId}`);
```

**使用返回的ID创建关联记录：**

```javascript
const userId = await db.table('users').insertGetId({
  name: 'Jane Doe',
  email: 'jane@example.com'
});

// 使用ID创建用户配置文件
await db.table('profiles').insert({
  user_id: userId,
  bio: 'Profile bio',
  created_at: new Date()
});
```

**批量插入并获取最后ID：**

```javascript
const lastId = await db.table('orders').insertGetId([
  { customer_id: 1, total: 99.99, status: 'pending' },
  { customer_id: 2, total: 199.99, status: 'pending' },
  { customer_id: 3, total: 299.99, status: 'pending' }
]);
console.log(`Last inserted order ID: ${lastId}`);
```

---

### insertSub() - 从子查询插入

从子查询的结果中插入记录。适合复制、转换数据或从多个源合并数据。

#### 语法

```javascript
await insertSub(columns, query)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `columns` | `Array<string>` | ✅ | 目标表中的列名数组。顺序很重要，必须与子查询返回的列顺序匹配 |
| `query` | `Function\|Builder` | ✅ | 数据源子查询。可以是：<br/>- 回调：`(q) => q.table('source').select(['col1', 'col2'])`<br/>- Builder实例：`db.table('source').select(['col1', 'col2'])` |

#### 返回值

`Promise<number>` - 从子查询插入的行数

#### 使用示例

**复制表中的数据：**

```javascript
const inserted = await db.table('users_archive').insertSub(
  ['id', 'name', 'email', 'created_at'],
  (q) => q.table('users')
         .select(['id', 'name', 'email', 'created_at'])
         .where('status', 'inactive')
);
console.log(`Archived ${inserted} users`);
```

**从JOIN结果插入数据：**

```javascript
const inserted = await db.table('user_reports').insertSub(
  ['user_id', 'total_orders', 'total_spent', 'report_date'],
  (q) => q.table('users')
         .join('orders', 'users.id', 'orders.user_id')
         .select([
           'users.id',
           db.raw('COUNT(orders.id) as total_orders'),
           db.raw('SUM(orders.total) as total_spent'),
           db.raw('NOW() as report_date')
         ])
         .groupBy('users.id')
);
```

**转换并复制数据：**

```javascript
const inserted = await db.table('products_normalized').insertSub(
  ['product_id', 'name', 'price_usd'],
  (q) => q.table('products')
         .select([
           'id',
           'name',
           db.raw('ROUND(price * 1.1, 2) as price_usd')
         ])
         .where('published', true)
);
```

---

### update() - 更新记录

更新一条或多条匹配WHERE条件的记录。支持常规值、原始SQL表达式和子查询。

#### 语法

```javascript
await update(data)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `data` | `Object` | ✅ | 要更新的数据。键为列名，值为新值。支持：<br/>- 常规值：字符串、数字、布尔值、null<br/>- 原始SQL：`db.raw('column + 5')`<br/>- 子查询：Builder实例或回调函数 |

#### 返回值

`Promise<number>` - 受影响的行数

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 数据库连接错误 | 验证连接配置 |
| `Error` | 约束冲突 | 检查数据有效性 |
| `Error` | 列名无效 | 验证列是否存在 |
| `Error` | 无WHERE条件可能更新所有行 | 添加明确的WHERE条件 |

#### 使用示例

**单条记录更新：**

```javascript
const affected = await db.table('users')
  .where('id', 1)
  .update({ name: 'John', email: 'john@example.com' });
console.log(`Updated ${affected} record(s)`);
```

**使用WHERE条件更新多条记录：**

```javascript
const affected = await db.table('users')
  .where('status', 'pending')
  .update({ status: 'active', verified_at: new Date() });
```

**使用原始SQL表达式：**

```javascript
const affected = await db.table('users')
  .where('id', 10)
  .update({
    name: 'Updated',
    login_count: db.raw('login_count + 1'),
    last_login: db.raw('NOW()')
  });
```

**安全的更新操作：**

```javascript
// ❌ 危险：这会更新ALL记录！
// await db.table('users').update({ active: false });

// ✅ 安全：指定明确的条件
const affected = await db.table('users')
  .where('created_at', '<', '2020-01-01')
  .update({ active: false });
```

---

### delete() - 删除记录

删除匹配WHERE条件的一条或多条记录。这是一个危险操作，应该谨慎使用。建议对关键数据使用软删除。

#### 语法

```javascript
await delete()
```

#### 返回值

`Promise<number>` - 删除的行数

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 外键约束冲突 | 先删除引用该记录的其他数据 |
| `Error` | 无WHERE条件可能删除所有行 | 添加明确的WHERE条件 |
| `Error` | 权限被拒绝 | 检查数据库权限 |

#### 使用示例

**按ID删除单条记录：**

```javascript
const deleted = await db.table('users')
  .where('id', 123)
  .delete();
console.log(`Deleted ${deleted} user(s)`);
```

**删除过期的会话：**

```javascript
const deleted = await db.table('sessions')
  .where('expires_at', '<', new Date())
  .delete();
console.log(`Cleaned up ${deleted} expired sessions`);
```

**删除具有多个条件的记录：**

```javascript
const deleted = await db.table('orders')
  .where('status', 'cancelled')
  .where('created_at', '<', '2020-01-01')
  .delete();
```

**安全删除 - 使用软删除：**

```javascript
// 不是物理删除，而是标记为已删除
const updated = await db.table('users')
  .where('id', 123)
  .update({ deleted_at: new Date(), active: false });
```

**删除事务中的记录（安全）：**

```javascript
const deleted = await db.transaction(async (trx) => {
  return await db.table('orders')
    .where('status', 'pending')
    .where('created_at', '<', '2020-01-01')
    .delete();
});
```

---

### increment() - 增加列值

原子性地将数字列增加指定的量。使用原始SQL表达式确保线程安全的数据库级更新。

#### 语法

```javascript
await increment(column, [amount])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string` | ✅ | - | 要增加的列名。必须是数值列（INTEGER、FLOAT等）。列名会自动用反引号包装 |
| `amount` | `number` | ❌ | 1 | 增加的量。支持：<br/>- 正数：增加值（如 1 表示 +1，10 表示 +10）<br/>- 小数：用于DECIMAL/FLOAT列（如 1.5）<br/>- 默认值：1 |

#### 返回值

`Promise<number>` - 受影响的行数

#### 使用示例

**增加页面浏览数：**

```javascript
const affected = await db.table('pages')
  .where('id', 42)
  .increment('views');
console.log(`Incremented ${affected} record(s)`);
```

**增加自定义数量：**

```javascript
const affected = await db.table('products')
  .where('id', 'product-001')
  .increment('stock', 50);  // 增加50件库存
```

**增加多条记录：**

```javascript
const affected = await db.table('orders')
  .where('status', 'processing')
  .increment('retry_count');
```

**原子计数器操作：**

```javascript
const affected = await db.table('statistics')
  .where('metric', 'api_calls')
  .increment('count', 1);
// 使用 SQL: UPDATE statistics SET count = count + 1 WHERE metric = 'api_calls'
```

---

### decrement() - 减少列值

原子性地将数字列减少指定的量。通常用于管理库存、余额、配额和计数器。

#### 语法

```javascript
await decrement(column, [amount])
```

#### 参数

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `column` | `string` | ✅ | - | 要减少的列名。必须是数值列（INTEGER、FLOAT等） |
| `amount` | `number` | ❌ | 1 | 减少的量。支持小数值 |

#### 返回值

`Promise<number>` - 受影响的行数

#### 使用示例

**减少库存：**

```javascript
const affected = await db.table('products')
  .where('sku', 'PROD-001')
  .decrement('stock');
console.log(`Updated ${affected} product(s)`);
```

**减少自定义数量：**

```javascript
const affected = await db.table('warehouse')
  .where('location', 'shelf-A')
  .decrement('available_units', 25);
```

**减少账户余额：**

```javascript
const affected = await db.table('accounts')
  .where('account_id', 789)
  .decrement('balance', 99.99);
```

**处理订单的库存：**

```javascript
async function fulfillOrder(orderId, items) {
  for (const item of items) {
    await db.table('inventory')
      .where('product_id', item.product_id)
      .decrement('quantity', item.qty);
  }
}
```

**带安全检查的减少：**

```javascript
const affected = await db.table('credits')
  .where('user_id', 100)
  .where('balance', '>', 0)  // 仅在余额为正时减少
  .decrement('balance', 10);
```

---

### upsert() - 插入或更新

执行原子性的"插入或更新"操作。如果存在匹配WHERE条件的记录，则更新；否则插入新记录。适合维护唯一记录（如用户设置）或幂等操作。

#### 语法

```javascript
await upsert(data, where)
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `data` | `Object` | ✅ | 要插入或更新的数据。键为列名，值为新值 |
| `where` | `Object` | ✅ | WHERE条件，用于检查记录是否存在。对象键为列名 |

#### 返回值

`Promise<Object>` - 包含以下属性的结果对象：
- `action`: string - 执行的操作：'inserted' 或 'updated'
- `affectedRows`: number - 受影响的行数（通常为 1）
- `record`: Object - 最终的记录（data + where 合并）

#### 使用示例

**插入或更新用户设置：**

```javascript
const result = await db.table('user_settings').upsert(
  { theme: 'dark', notifications: true },
  { user_id: 42 }
);
console.log(`${result.action} record: user_id=${result.record.user_id}`);
// 输出: "updated record: user_id=42" 或 "inserted record: user_id=42"
```

**根据多个条件的upsert：**

```javascript
const result = await db.table('contacts').upsert(
  {
    name: 'John Doe',
    phone: '+1-555-1234',
    last_contacted: new Date()
  },
  { email: 'john@example.com', source: 'api' }
);
if (result.action === 'inserted') {
  console.log('New contact added');
} else {
  console.log('Contact updated');
}
```

**批量upsert模式：**

```javascript
const records = [
  { email: 'user1@example.com', name: 'User 1' },
  { email: 'user2@example.com', name: 'User 2' },
  { email: 'user3@example.com', name: 'User 3' }
];
const results = [];
for (const record of records) {
  const result = await db.table('users').upsert(
    { name: record.name, updated_at: new Date() },
    { email: record.email }
  );
  results.push(result);
}
const inserted = results.filter(r => r.action === 'inserted').length;
const updated = results.filter(r => r.action === 'updated').length;
console.log(`Inserted: ${inserted}, Updated: ${updated}`);
```

**统计页面浏览：**

```javascript
async function recordPageView(pageId, userId) {
  return await db.table('page_views').upsert(
    {
      view_count: 1,
      last_viewed: new Date(),
      user_agent: req.headers['user-agent']
    },
    { page_id: pageId, user_id: userId }
  );
}
```

---

### truncate() - 清空表

清空当前表的所有记录并重置自增计数器。这是一个危险的操作，比DELETE更快但无法回滚。

#### 语法

```javascript
await truncate()
```

#### 返回值

`Promise<boolean>` - 操作是否成功：
- `true`：清空操作成功
- 异常：操作失败时抛出错误

#### 异常

| 异常类型 | 触发条件 | 解决方案 |
|----------|----------|----------|
| `Error` | 数据库不支持TRUNCATE | 使用delete()代替 |
| `Error` | 外键约束阻止清空 | 先处理相关表的外键关系 |
| `Error` | 权限被拒绝 | 检查数据库用户权限 |
| `Error` | 表被其他事务锁定 | 等待事务完成或重试 |

#### 使用示例

**清空日志表：**

```javascript
const success = await db.table('logs').truncate();
if (success) {
  console.log('Logs table has been cleared');
}
```

**开发/测试环境清空数据：**

```javascript
const success = await db.table('test_data').truncate();
// 所有记录被移除，自增ID重置为1
```

**安全的清空操作：**

```javascript
if (process.env.NODE_ENV === 'development') {
  const success = await db.table('temp_table').truncate();
  console.log(`Truncation ${success ? 'successful' : 'failed'}`);
}
```

**清空缓存表：**

```javascript
const success = await db.table('cache').truncate();
if (!success) {
  // 如果TRUNCATE失败，降级使用DELETE
  await db.table('cache').delete();
}
```

**⚠️ 重要警告：**

```javascript
// ❌ 危险：此操作不可撤销！
// TRUNCATE将从表中移除ALL数据
const success = await db.table('users').truncate();
// 所有用户被永久删除

// ✅ 更安全：考虑使用带条件的DELETE
const deleted = await db.table('users')
  .where('created_at', '<', '2020-01-01')
  .delete();
```

---

### insertOrUpdate() - 插入或更新（别名）

这是 `upsert()` 方法的别名。执行原子性的"插入或更新"操作。

#### 语法

```javascript
await insertOrUpdate(data, where)
```

#### 参数

同 `upsert()` 方法

#### 返回值

同 `upsert()` 方法

#### 使用示例

**插入或更新用户设置：**

```javascript
const result = await db.table('user_settings').insertOrUpdate(
  { theme: 'dark', notifications: true },
  { user_id: 42 }
);
console.log(`${result.action} record for user ${result.record.user_id}`);
```

**与 upsert() 功能完全相同：**

```javascript
// 这两个调用是等价的
const result1 = await db.table('contacts').upsert(data, where);
const result2 = await db.table('contacts').insertOrUpdate(data, where);
```

---

## 链式调用示例

Builder的一个关键特性是链式调用。所有查询方法都返回Builder实例，允许优雅地链接多个操作：

```javascript
// 复杂查询示例
const orders = await db.table('orders')
  .select(['id', 'customer_id', 'total', 'status', 'created_at'])
  .where('status', 'completed')
  .where('total', '>', 500)
  .where(q => {
    q.where('payment_method', 'credit_card')
     .orWhere('payment_method', 'paypal');
  })
  .orderBy('created_at', 'desc')
  .orderBy('total', 'desc')
  .limit(50)
  .get();
```

---

## 相关文档

- [Database类文档](./Database.md) - 数据库连接管理
- [查询示例](../examples/quick-start.md) - 快速开始指南
- [WHERE子句详解](../guides/where-clauses.md) - 详细的WHERE用法
- [聚合函数](../guides/aggregates.md) - COUNT、MAX、MIN等

## 最佳实践

1. **始终指定列** - 使用`select()`明确指定需要的列，避免选择不必要的数据
2. **优化WHERE条件** - 在首个WHERE中放置最限制性的条件以提高效率
3. **分页时使用LIMIT和OFFSET** - 对大数据集使用分页
4. **检查查询结果** - 使用`count()`或`first()`验证是否有数据
5. **使用事务** - 对多个相关操作使用数据库事务确保数据一致性

