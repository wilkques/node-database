# 基本查询示例

本文档提供了各种基本SELECT查询的详细示例，从简单到复杂。

## 目录

1. [简单SELECT](#简单select)
2. [WHERE条件](#where条件)
3. [排序](#排序)
4. [分页](#分页)
5. [聚合函数](#聚合函数)
6. [分组](#分组)
7. [DISTINCT](#distinct)
8. [子查询](#子查询)

---

## 简单SELECT

### 选择所有列

```javascript
// 获取所有用户的所有字段
const allUsers = await db.table('users').get();

console.log(allUsers);
// 输出示例:
// [
//   { id: 1, name: 'John', email: 'john@example.com', status: 'active', ... },
//   { id: 2, name: 'Jane', email: 'jane@example.com', status: 'active', ... },
//   ...
// ]
```

### 选择特定列

```javascript
// 只选择id、name和email三列
const users = await db.table('users')
    .select('id', 'name', 'email')
    .get();

console.log(users);
// 输出示例:
// [
//   { id: 1, name: 'John', email: 'john@example.com' },
//   { id: 2, name: 'Jane', email: 'jane@example.com' },
//   ...
// ]
```

### 使用数组格式选择列

```javascript
// 使用数组格式（推荐）
const users = await db.table('users')
    .select(['id', 'name', 'email', 'created_at'])
    .get();
```

### 选择表别名下的列

```javascript
// 使用表别名避免列名冲突
const results = await db.table('users as u')
    .select('u.id', 'u.name', 'u.email')
    .get();
```

---

## WHERE条件

### 简单相等条件

```javascript
// 查询status为active的用户
const activeUsers = await db.table('users')
    .select('id', 'name', 'status')
    .where('status', 'active')
    .get();

// 等同于SQL: SELECT id, name, status FROM users WHERE status = 'active'
```

### 显式比较操作符

```javascript
// 大于
const expensiveProducts = await db.table('products')
    .where('price', '>', 100)
    .get();

// 大于等于
const enoughStock = await db.table('products')
    .where('stock', '>=', 10)
    .get();

// 小于
const recentPosts = await db.table('posts')
    .where('created_at', '<', new Date('2024-01-01'))
    .get();

// 小于等于
const lowScores = await db.table('scores')
    .where('value', '<=', 50)
    .get();

// 不等于
const inactiveUsers = await db.table('users')
    .where('status', '<>', 'active')
    .get();
```

### 多个AND条件

```javascript
// 链式where调用 (隐含AND)
const query1 = await db.table('users')
    .where('status', 'active')
    .where('age', '>=', 18)
    .where('verified', true)
    .get();

// 使用数组格式 (推荐用于多个条件)
const query2 = await db.table('users')
    .where([
        ['status', '=', 'active'],
        ['age', '>=', 18],
        ['verified', '=', true]
    ])
    .get();

// 等同于SQL:
// SELECT * FROM users 
// WHERE status = 'active' AND age >= 18 AND verified = true
```

### OR条件

```javascript
// 查询：管理员 或 高级用户
const special = await db.table('users')
    .where('role', 'admin')
    .orWhere('premium', true)
    .get();

// 等同于SQL:
// SELECT * FROM users WHERE role = 'admin' OR premium = true
```

### 混合AND和OR条件

```javascript
// 查询: (status='active' AND verified=true) OR (premium=true)
const results = await db.table('users')
    .where('status', 'active')
    .where('verified', true)
    .orWhere('premium', true)
    .get();
```

### 嵌套条件（分组）

```javascript
// 使用回调函数进行条件分组
// 查询: active users AND (is_admin OR premium)
const query = await db.table('users')
    .where('status', 'active')
    .where((q) => {
        q.where('role', 'admin')
         .orWhere('premium', true);
    })
    .get();

// 等同于SQL:
// SELECT * FROM users 
// WHERE status = 'active' AND (role = 'admin' OR premium = true)
```

### 复杂嵌套条件

```javascript
// 多层嵌套条件
const results = await db.table('orders')
    .where('status', 'completed')
    .where((q) => {
        q.where('total', '>', 100)
         .orWhere((qq) => {
             qq.where('discount', '>', 20)
               .where('user_premium', true);
         });
    })
    .get();

// 等同于SQL:
// SELECT * FROM orders WHERE status = 'completed' 
// AND (total > 100 OR (discount > 20 AND user_premium = true))
```

### IN条件

```javascript
// 查询id在列表中的用户
const userIds = [1, 5, 10, 15];
const users = await db.table('users')
    .whereIn('id', userIds)
    .get();

// 查询role在多个值中的用户
const roles = ['admin', 'moderator', 'user'];
const staff = await db.table('users')
    .whereIn('role', roles)
    .get();
```

### NOT IN条件

```javascript
// 查询id不在列表中的用户
const userIds = [1, 2, 3];
const otherUsers = await db.table('users')
    .whereNotIn('id', userIds)
    .get();
```

### BETWEEN条件

```javascript
// 查询价格在100-500之间的产品
const products = await db.table('products')
    .whereBetween('price', [100, 500])
    .get();

// 查询创建日期在某个范围内的文章
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-12-31');
const articles = await db.table('articles')
    .whereBetween('created_at', [startDate, endDate])
    .get();
```

### NULL检查

```javascript
// 查询email为NULL的用户
const noEmail = await db.table('users')
    .where('email', null)
    .get();
// 或者
const noEmailAlt = await db.table('users')
    .whereNull('email')
    .get();

// 查询email不为NULL的用户
const hasEmail = await db.table('users')
    .whereNotNull('email')
    .get();
```

### LIKE条件

```javascript
// 查询名字包含'John'的用户
const johns = await db.table('users')
    .where('name', 'LIKE', '%John%')
    .get();

// 查询邮箱以'gmail.com'结尾的用户
const gmailUsers = await db.table('users')
    .where('email', 'LIKE', '%@gmail.com')
    .get();

// 查询邮箱以'admin'开头的用户
const adminEmails = await db.table('users')
    .where('email', 'LIKE', 'admin%')
    .get();
```

---

## 排序

### 单列升序排序

```javascript
// 按名字升序排列
const users = await db.table('users')
    .select('id', 'name', 'email')
    .orderBy('name')
    .get();

// 显式指定ASC
const usersAsc = await db.table('users')
    .select('id', 'name', 'email')
    .orderBy('name', 'asc')
    .get();
```

### 单列降序排序

```javascript
// 按创建时间降序排列（最新的在前）
const latestPosts = await db.table('posts')
    .select('id', 'title', 'created_at')
    .orderBy('created_at', 'desc')
    .get();
```

### 多列排序

```javascript
// 先按部门升序，再按薪资降序排列
const employees = await db.table('employees')
    .select('id', 'name', 'department', 'salary')
    .orderBy([
        ['department', 'asc'],
        ['salary', 'desc']
    ])
    .get();

// 或者链式调用
const employeesChain = await db.table('employees')
    .select('id', 'name', 'department', 'salary')
    .orderBy('department', 'asc')
    .orderBy('salary', 'desc')
    .get();
```

### 按原始SQL排序

```javascript
// 按自定义表达式排序
const results = await db.table('users')
    .select('id', 'name')
    .orderByRaw('RAND()')  // 随机排序
    .get();

// 按CASE表达式排序
const customSort = await db.table('products')
    .select('id', 'name', 'category')
    .orderByRaw("CASE WHEN category = 'featured' THEN 1 ELSE 2 END")
    .get();
```

---

## 分页

### 基本分页

```javascript
// 获取第一页（假设每页10条）
const page1 = await db.table('users')
    .select('id', 'name', 'email')
    .limit(10)
    .offset(0)
    .get();

// 获取第二页
const page2 = await db.table('users')
    .select('id', 'name', 'email')
    .limit(10)
    .offset(10)
    .get();

// 获取第三页
const page3 = await db.table('users')
    .select('id', 'name', 'email')
    .limit(10)
    .offset(20)
    .get();
```

### 分页公式

```javascript
// 通用分页公式：offset = (pageNumber - 1) * pageSize
const pageSize = 20;
const pageNumber = 3;

const results = await db.table('posts')
    .select('id', 'title', 'excerpt')
    .limit(pageSize)
    .offset((pageNumber - 1) * pageSize)
    .orderBy('created_at', 'desc')
    .get();
```

### 获取前N条记录

```javascript
// 获取最新的5条文章
const topPosts = await db.table('posts')
    .select('id', 'title', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(5)
    .get();
```

### SKIP和TAKE

```javascript
// 跳过前10条，获取接下来的20条（相当于offset+limit）
const results = await db.table('users')
    .select('id', 'name')
    .skip(10)
    .take(20)
    .get();
```

---

## 聚合函数

### COUNT

```javascript
// 统计总数
const totalUsers = await db.table('users').count();
console.log(`总用户数: ${totalUsers}`);
// 输出: 150

// 统计特定列的非NULL值
const usersWithEmail = await db.table('users').count('email');

// 条件统计
const activeUsers = await db.table('users')
    .where('status', 'active')
    .count();

// 使用别名
const count = await db.table('orders')
    .select(db.raw('COUNT(*) as total'))
    .first();
console.log(`订单数: ${count.total}`);
```

### MAX和MIN

```javascript
// 获取最高价格
const maxPrice = await db.table('products').max('price');
console.log(`最高价格: $${maxPrice}`);

// 获取最低价格
const minPrice = await db.table('products').min('price');
console.log(`最低价格: $${minPrice}`);

// 条件最大值
const latestOrder = await db.table('orders')
    .where('user_id', 1)
    .max('created_at');
```

### AVG

```javascript
// 计算平均价格
const avgPrice = await db.table('products').avg('price');
console.log(`平均价格: $${avgPrice.toFixed(2)}`);

// 计算平均评分
const avgRating = await db.table('reviews')
    .where('product_id', 5)
    .avg('rating');
```

### SUM

```javascript
// 计算总收入
const totalRevenue = await db.table('orders').sum('amount');
console.log(`总收入: $${totalRevenue}`);

// 条件求和
const userTotal = await db.table('orders')
    .where('user_id', 1)
    .sum('amount');

// 计算库存总数
const totalStock = await db.table('products').sum('stock');
```

### 多个聚合函数

```javascript
// 在同一查询中使用多个聚合函数
const stats = await db.table('products')
    .select(
        db.raw('COUNT(*) as total'),
        db.raw('AVG(price) as avg_price'),
        db.raw('MAX(price) as max_price'),
        db.raw('MIN(price) as min_price'),
        db.raw('SUM(stock) as total_stock')
    )
    .first();

console.log(stats);
// 输出:
// {
//   total: 100,
//   avg_price: 49.99,
//   max_price: 199.99,
//   min_price: 9.99,
//   total_stock: 5000
// }
```

---

## 分组

### 基本GROUP BY

```javascript
// 按状态分组统计用户数
const statusStats = await db.table('users')
    .select('status')
    .selectRaw('COUNT(*) as count')
    .groupBy('status')
    .get();

console.log(statusStats);
// 输出:
// [
//   { status: 'active', count: 150 },
//   { status: 'inactive', count: 50 },
//   { status: 'pending', count: 10 }
// ]
```

### 多列分组

```javascript
// 按部门和职位分组
const deptRoleStats = await db.table('employees')
    .select('department', 'role')
    .selectRaw('COUNT(*) as count')
    .selectRaw('AVG(salary) as avg_salary')
    .groupBy(['department', 'role'])
    .get();
```

### HAVING子句

```javascript
// 只显示用户数超过10的部门
const largeDepts = await db.table('employees')
    .select('department')
    .selectRaw('COUNT(*) as emp_count')
    .groupBy('department')
    .having('emp_count', '>', 10)
    .get();

// 多个HAVING条件
const filtered = await db.table('orders')
    .select('user_id')
    .selectRaw('COUNT(*) as order_count')
    .selectRaw('SUM(amount) as total_spent')
    .groupBy('user_id')
    .having('order_count', '>', 5)
    .having('total_spent', '>', 1000)
    .get();
```

---

## DISTINCT

### 去重

```javascript
// 获取所有不同的城市
const cities = await db.table('users')
    .distinct('city')
    .get();

// 等同于SQL: SELECT DISTINCT city FROM users

// 获取多列的不同值组合
const distinctCombos = await db.table('orders')
    .distinct(['user_id', 'status'])
    .get();
```

### 带条件的DISTINCT

```javascript
// 获取活跃用户的所有不同城市
const activeCities = await db.table('users')
    .distinct('city')
    .where('status', 'active')
    .get();
```

---

## 子查询

### WHERE IN子查询

```javascript
// 查询有订单的用户
const usersWithOrders = await db.table('users')
    .select('id', 'name', 'email')
    .whereIn('id', (query) => {
        query.table('orders')
            .select('user_id')
            .distinct('user_id');
    })
    .get();

// 查询最近30天有活动的用户
const activeUsers = await db.table('users')
    .whereIn('id', (query) => {
        query.table('user_activities')
            .select('user_id')
            .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    })
    .get();
```

### WHERE EXISTS子查询

```javascript
// 查询有订单的用户（使用EXISTS）
const usersWithOrdersExists = await db.table('users')
    .select('id', 'name')
    .where((query) => {
        query.table('orders')
            .select(db.raw('1'))
            .whereRaw('orders.user_id = users.id');
    })
    .get();
```

### SELECT中的子查询

```javascript
// 为每个用户获取其订单计数
const usersWithOrderCount = await db.table('users')
    .select('id', 'name')
    .selectSub((query) => {
        query.table('orders')
            .select(db.raw('COUNT(*)'))
            .whereRaw('orders.user_id = users.id');
    }, 'order_count')
    .get();

console.log(usersWithOrderCount);
// 输出:
// [
//   { id: 1, name: 'John', order_count: 5 },
//   { id: 2, name: 'Jane', order_count: 3 },
//   ...
// ]
```

### FROM子查询

```javascript
// 使用子查询作为表
const recentOrderStats = await db.table(
    db.table('orders')
        .select('user_id')
        .selectRaw('COUNT(*) as order_count')
        .where('created_at', '>', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .groupBy('user_id'),
    'recent_orders'
)
.where('order_count', '>', 5)
.get();
```

---

## 查询结果方法

### first() - 获取第一条记录

```javascript
// 获取最新的文章
const latestPost = await db.table('posts')
    .orderBy('created_at', 'desc')
    .first();

console.log(latestPost);
// 输出: { id: 10, title: '...', created_at: ... }
```

### find() - 按主键查询

```javascript
// 按ID查询用户
const user = await db.table('users').find(1);
console.log(user);
// 输出: { id: 1, name: '...', email: '...', ... }
```

### count() - 获取记录数

```javascript
// 已经在聚合函数部分介绍过
const total = await db.table('users').count();
```

### pluck() - 获取单列值

```javascript
// 获取所有用户的ID列表
const userIds = await db.table('users')
    .where('status', 'active')
    .pluck('id');

console.log(userIds);
// 输出: [1, 2, 3, 4, 5, ...]

// 获取用户名列表
const names = await db.table('users')
    .orderBy('name')
    .pluck('name');
```

### lists() - 获取键值对

```javascript
// 获取ID到名字的映射
const userMap = await db.table('users')
    .lists('id', 'name');

console.log(userMap);
// 输出: Map { 1 => 'John', 2 => 'Jane', ... }
```

---

## 完整示例

### 实际场景：电商产品列表

```javascript
// 获取特定分类中价格在范围内的产品，按评分排序，支持分页
async function getProductList(category, minPrice, maxPrice, page = 1) {
    const pageSize = 20;
    
    const products = await db.table('products as p')
        .select(
            'p.id',
            'p.name',
            'p.price',
            'p.category'
        )
        .selectRaw('COALESCE(AVG(r.rating), 0) as avg_rating')
        .selectRaw('COUNT(r.id) as review_count')
        .leftJoin('reviews as r', 'p.id', '=', 'r.product_id')
        .where('p.category', category)
        .whereBetween('p.price', [minPrice, maxPrice])
        .where('p.status', 'active')
        .groupBy('p.id')
        .orderBy('avg_rating', 'desc')
        .limit(pageSize)
        .offset((page - 1) * pageSize)
        .get();
    
    return products;
}

// 使用
const products = await getProductList('Electronics', 100, 1000, 1);
```

### 实际场景：用户行为分析

```javascript
// 获取最活跃的用户及其活动统计
const activeUsers = await db.table('users as u')
    .select('u.id', 'u.name')
    .selectRaw('COUNT(a.id) as activity_count')
    .selectRaw('MAX(a.created_at) as last_activity')
    .leftJoin('activities as a', 'u.id', '=', 'a.user_id')
    .where('u.status', 'active')
    .where('a.created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .groupBy('u.id')
    .having('activity_count', '>', 10)
    .orderBy('activity_count', 'desc')
    .limit(10)
    .get();

console.log(activeUsers);
```

---

## 常见错误和解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| 列名不存在 | 拼写错误或不存在 | 检查表结构，确认列名 |
| SQL语法错误 | 使用了不支持的操作符 | 查看API文档，使用正确的操作符 |
| 性能问题 | 查询没有使用索引 | 确保WHERE条件中的列有索引 |
| 内存溢出 | 一次性获取太多行 | 使用分页或limit限制返回行数 |

