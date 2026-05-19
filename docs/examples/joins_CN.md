# JOIN操作示例

本文档提供了各种JOIN操作的详细示例，从基础到高级。

## 目录

1. [JOIN基础概念](#join基础概念)
2. [内连接（INNER JOIN）](#内连接inner-join)
3. [左连接（LEFT JOIN）](#左连接left-join)
4. [右连接（RIGHT JOIN）](#右连接right-join)
5. [交叉连接（CROSS JOIN）](#交叉连接cross-join)
6. [多表连接](#多表连接)
7. [自连接](#自连接)
8. [JOIN条件](#join条件)
9. [实际场景](#实际场景)

---

## JOIN基础概念

### 什么是JOIN？

JOIN用于将来自两个或多个表的数据组合在一起。每种JOIN类型返回不同的结果集：

- **INNER JOIN** - 只返回两表都有匹配的行
- **LEFT JOIN** - 返回左表的所有行，加上右表匹配的行
- **RIGHT JOIN** - 返回右表的所有行，加上左表匹配的行
- **CROSS JOIN** - 返回笛卡尔积（两个表的所有组合）

### 表关系

在接下来的示例中，我们将使用这些表：

```
users 表：
┌────┬──────┬───────────────┬────────┐
│ id │ name │ email         │ status │
├────┼──────┼───────────────┼────────┤
│ 1  │ John │ john@ex.com   │ active │
│ 2  │ Jane │ jane@ex.com   │ active │
│ 3  │ Bob  │ bob@ex.com    │ inactive│
└────┴──────┴───────────────┴────────┘

orders 表：
┌────┬─────────┬────────┬─────────────┐
│ id │ user_id │ amount │ created_at  │
├────┼─────────┼────────┼─────────────┤
│ 1  │ 1       │ 100    │ 2024-01-01  │
│ 2  │ 1       │ 200    │ 2024-01-05  │
│ 3  │ 2       │ 150    │ 2024-01-10  │
│ 4  │ 4       │ 75     │ 2024-01-15  │
└────┴─────────┴────────┴─────────────┘
```

---

## 内连接(INNER JOIN)

### 基本内连接

内连接只返回两表都有匹配记录的行。

```javascript
// 查询用户及其订单
const userOrders = await db.table('users')
    .select('users.id', 'users.name', 'orders.id as order_id', 'orders.amount')
    .join('orders', 'users.id', '=', 'orders.user_id')
    .get();

console.log(userOrders);
// 输出:
// [
//   { id: 1, name: 'John', order_id: 1, amount: 100 },
//   { id: 1, name: 'John', order_id: 2, amount: 200 },
//   { id: 2, name: 'Jane', order_id: 3, amount: 150 }
// ]
// 注意：user_id = 3 (Bob) 没有订单，所以没有出现
// 注意：user_id = 4 的订单找不到用户，所以也没有出现
```

### 使用表别名的内连接

```javascript
// 使用别名使SQL更简洁
const results = await db.table('users as u')
    .select('u.id', 'u.name', 'u.email', 'o.id as order_id', 'o.amount', 'o.created_at')
    .join('orders as o', 'u.id', '=', 'o.user_id')
    .get();
```

### 多个条件的内连接

```javascript
// 除了主键连接外，还有额外条件
const activeOrders = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id', 'o.amount')
    .join('orders as o', (join) => {
        join.on('u.id', '=', 'o.user_id')
            .on('u.status', '=', 'active');  // 额外条件
    })
    .get();
```

### 条件过滤的内连接

```javascript
// 获取2024年有订单的活跃用户
const recent = await db.table('users as u')
    .select('u.id', 'u.name', 'o.amount')
    .join('orders as o', 'u.id', '=', 'o.user_id')
    .where('u.status', 'active')
    .where('o.created_at', '>=', new Date('2024-01-01'))
    .get();
```

---

## 左连接(LEFT JOIN)

### 基本左连接

左连接返回左表的所有行，加上右表匹配的行。如果没有匹配，右表的列为NULL。

```javascript
// 查询所有用户及其订单（即使没有订单也显示用户）
const allUsersWithOrders = await db.table('users as u')
    .select('u.id', 'u.name', 'u.email', 'o.id as order_id', 'o.amount')
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .get();

console.log(allUsersWithOrders);
// 输出:
// [
//   { id: 1, name: 'John', email: '...', order_id: 1, amount: 100 },
//   { id: 1, name: 'John', email: '...', order_id: 2, amount: 200 },
//   { id: 2, name: 'Jane', email: '...', order_id: 3, amount: 150 },
//   { id: 3, name: 'Bob', email: '...', order_id: null, amount: null }  // 没有订单
// ]
```

### 计算关联数据

```javascript
// 获取每个用户的订单数和总消费额
const userStats = await db.table('users as u')
    .select('u.id', 'u.name', 'u.email')
    .selectRaw('COUNT(o.id) as order_count')
    .selectRaw('COALESCE(SUM(o.amount), 0) as total_spent')
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .groupBy('u.id')
    .get();

console.log(userStats);
// 输出:
// [
//   { id: 1, name: 'John', email: '...', order_count: 2, total_spent: 300 },
//   { id: 2, name: 'Jane', email: '...', order_count: 1, total_spent: 150 },
//   { id: 3, name: 'Bob', email: '...', order_count: 0, total_spent: 0 }
// ]
```

### 处理NULL值的左连接

```javascript
// 找出没有订单的用户
const usersWithoutOrders = await db.table('users as u')
    .select('u.id', 'u.name', 'u.email')
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .whereNull('o.id')  // 右表的ID为NULL意味着没有匹配的订单
    .get();

// 或者找出有订单的用户
const usersWithOrders = await db.table('users as u')
    .select('u.id', 'u.name')
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .whereNotNull('o.id')  // 有匹配的订单
    .get();
```

### 多条件左连接

```javascript
// 获取用户及其最近的订单
const usersWithLatestOrder = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id', 'o.amount', 'o.created_at')
    .leftJoin('orders as o', (join) => {
        join.on('u.id', '=', 'o.user_id')
            .on('o.created_at', '=', (query) => {
                query.table('orders')
                    .select(db.raw('MAX(created_at)'))
                    .whereRaw('orders.user_id = users.id');
            });
    })
    .get();
```

---

## 右连接(RIGHT JOIN)

### 基本右连接

右连接返回右表的所有行，加上左表匹配的行。

```javascript
// 查询所有订单及其用户信息（即使用户被删除也显示订单）
const allOrdersWithUsers = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id', 'o.amount')
    .rightJoin('orders as o', 'u.id', '=', 'o.user_id')
    .get();

console.log(allOrdersWithUsers);
// 输出:
// [
//   { id: 1, name: 'John', order_id: 1, amount: 100 },
//   { id: 1, name: 'John', order_id: 2, amount: 200 },
//   { id: 2, name: 'Jane', order_id: 3, amount: 150 },
//   { id: null, name: null, order_id: 4, amount: 75 }  // 用户已被删除
// ]
```

### 右连接的实际应用

```javascript
// 找出没有对应用户的订单（数据一致性检查）
const orphanedOrders = await db.table('users as u')
    .select('o.id as order_id', 'o.user_id', 'o.amount')
    .rightJoin('orders as o', 'u.id', '=', 'o.user_id')
    .whereNull('u.id')  // 用户不存在
    .get();
```

---

## 交叉连接(CROSS JOIN)

### 基本交叉连接

交叉连接返回两个表的笛卡尔积（所有可能的组合）。

```javascript
// 创建颜色和尺寸的所有组合
const colorSizes = [
    { id: 1, color: 'Red' },
    { id: 2, color: 'Blue' }
];

const sizes = [
    { id: 1, size: 'S' },
    { id: 2, size: 'M' },
    { id: 3, size: 'L' }
];

// 交叉连接会产生 2 × 3 = 6 条记录
const combinations = await db.table('colors')
    .select('colors.color', 'sizes.size')
    .crossJoin('sizes')
    .get();

console.log(combinations);
// 输出:
// [
//   { color: 'Red', size: 'S' },
//   { color: 'Red', size: 'M' },
//   { color: 'Red', size: 'L' },
//   { color: 'Blue', size: 'S' },
//   { color: 'Blue', size: 'M' },
//   { color: 'Blue', size: 'L' }
// ]
```

---

## 多表连接

### 连接三个表

```javascript
// 查询用户、订单和订单项
const orderDetails = await db.table('users as u')
    .select(
        'u.id',
        'u.name',
        'o.id as order_id',
        'o.amount as order_total',
        'oi.id as item_id',
        'oi.product_id',
        'oi.quantity',
        'oi.price'
    )
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .leftJoin('order_items as oi', 'o.id', '=', 'oi.order_id')
    .orderBy('u.id')
    .orderBy('o.id')
    .orderBy('oi.id')
    .get();
```

### 连接四个表

```javascript
// 查询用户、订单、订单项和产品信息
const fullOrderInfo = await db.table('users as u')
    .select(
        'u.id as user_id',
        'u.name',
        'o.id as order_id',
        'o.created_at as order_date',
        'oi.id as item_id',
        'p.id as product_id',
        'p.name as product_name',
        'p.price as unit_price',
        'oi.quantity',
        db.raw('oi.quantity * p.price as line_total')
    )
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .leftJoin('order_items as oi', 'o.id', '=', 'oi.order_id')
    .leftJoin('products as p', 'oi.product_id', '=', 'p.id')
    .where('u.status', 'active')
    .orderBy('u.id')
    .orderBy('o.id')
    .get();
```

### 左右混合连接

```javascript
// 结合INNER JOIN和LEFT JOIN
const results = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id', 'p.name as product_name')
    .innerJoin('orders as o', 'u.id', '=', 'o.user_id')  // 必须有订单
    .leftJoin('products as p', 'o.product_id', '=', 'p.id')  // 产品可能没有
    .get();
```

---

## 自连接

### 什么是自连接？

自连接是表与其自身进行连接，通常用于处理层级结构的数据。

### 员工管理层级

```javascript
// 获取每个员工及其经理信息
const employeesWithManagers = await db.table('employees as e')
    .select(
        'e.id as employee_id',
        'e.name as employee_name',
        'm.id as manager_id',
        'm.name as manager_name'
    )
    .leftJoin('employees as m', 'e.manager_id', '=', 'm.id')
    .get();

console.log(employeesWithManagers);
// 输出:
// [
//   { employee_id: 1, employee_name: 'Alice', manager_id: null, manager_name: null },  // CEO
//   { employee_id: 2, employee_name: 'Bob', manager_id: 1, manager_name: 'Alice' },
//   { employee_id: 3, employee_name: 'Charlie', manager_id: 1, manager_name: 'Alice' },
//   { employee_id: 4, employee_name: 'David', manager_id: 2, manager_name: 'Bob' }
// ]
```

### 找出所有下属

```javascript
// 获取管理员的所有直接下属
const directReports = await db.table('employees as manager')
    .select('manager.id', 'manager.name')
    .selectRaw('GROUP_CONCAT(e.name) as direct_reports')
    .leftJoin('employees as e', 'manager.id', '=', 'e.manager_id')
    .groupBy('manager.id')
    .get();
```

### 类别和子类别

```javascript
// 获取每个分类及其子分类
const categoriesWithSubcategories = await db.table('categories as parent')
    .select('parent.id as parent_id', 'parent.name as parent_name', 'child.id as child_id', 'child.name as child_name')
    .leftJoin('categories as child', 'parent.id', '=', 'child.parent_id')
    .where('parent.parent_id', null)  // 只获取顶级分类
    .orderBy('parent.id')
    .orderBy('child.id')
    .get();
```

---

## JOIN条件

### ON条件

```javascript
// 基本ON条件
const results = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id')
    .join('orders as o', 'u.id', '=', 'o.user_id')
    .get();

// 多个ON条件
const multiCondition = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id')
    .join('orders as o', (join) => {
        join.on('u.id', '=', 'o.user_id')
            .on('u.status', '=', 'active')
            .on('o.status', '!=', 'cancelled');
    })
    .get();
```

### ON和WHERE的区别

```javascript
// 使用ON条件 - 在JOIN前过滤（INNER JOIN时可能有差异）
const onJoin = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id', 'o.amount')
    .leftJoin('orders as o', (join) => {
        join.on('u.id', '=', 'o.user_id')
            .on('o.amount', '>', 100);  // 在JOIN时过滤
    })
    .get();

// 使用WHERE条件 - 在JOIN后过滤
const whereJoin = await db.table('users as u')
    .select('u.id', 'u.name', 'o.id as order_id', 'o.amount')
    .leftJoin('orders as o', 'u.id', '=', 'o.user_id')
    .where('o.amount', '>', 100)  // 在JOIN后过滤
    .get();

// 对于LEFT JOIN，这两个查询会产生不同的结果！
// - onJoin: 显示没有订单或订单金额>100的用户（即使都没有>100的订单）
// - whereJoin: 只显示有订单金额>100的用户
```

---

## 实际场景

### 场景1：电商销售报表

```javascript
// 生成月度销售报表
async function getMonthlySalesReport(year, month) {
    const result = await db.table('users as u')
        .select('u.id', 'u.name', 'u.email')
        .selectRaw('COUNT(o.id) as order_count')
        .selectRaw('SUM(o.amount) as total_sales')
        .selectRaw('AVG(o.amount) as avg_order_value')
        .selectRaw('COUNT(DISTINCT oi.product_id) as unique_products')
        .leftJoin('orders as o', (join) => {
            join.on('u.id', '=', 'o.user_id')
                .on('o.created_at', '>=', new Date(`${year}-${String(month).padStart(2, '0')}-01`))
                .on('o.created_at', '<', new Date(`${year}-${String(month + 1).padStart(2, '0')}-01`));
        })
        .leftJoin('order_items as oi', 'o.id', '=', 'oi.order_id')
        .groupBy('u.id')
        .having('order_count', '>', 0)
        .orderBy('total_sales', 'desc')
        .get();

    return result;
}

const report = await getMonthlySalesReport(2024, 1);
```

### 场景2：推荐系统

```javascript
// 获取用户可能感兴趣的产品（基于他们购买的产品类别）
async function getRecommendedProducts(userId, limit = 5) {
    const recommendations = await db.table('users as u')
        .select('p.id', 'p.name', 'p.price', 'c.name as category')
        .selectRaw('COUNT(similar_user_orders.id) as popularity')
        .join('orders as o', 'u.id', '=', 'o.user_id')
        .join('order_items as oi', 'o.id', '=', 'oi.order_id')
        .join('products as purchased', 'oi.product_id', '=', 'purchased.id')
        .join('products as p', 'p.category', '=', 'purchased.category')
        .join('order_items as similar_oi', 'p.id', '=', 'similar_oi.product_id')
        .join('orders as similar_orders', 'similar_oi.order_id', '=', 'similar_orders.id')
        .join('orders as similar_user_orders', 'similar_orders.user_id', '=', 'similar_user_orders.user_id')
        .join('categories as c', 'p.category', '=', 'c.id')
        .where('u.id', userId)
        .where('p.id', '!=', 'purchased.id')
        .groupBy('p.id')
        .orderBy('popularity', 'desc')
        .limit(limit)
        .get();

    return recommendations;
}
```

### 场景3：数据质量检查

```javascript
// 检查孤立记录（存在数据一致性问题）
async function findOrphanedRecords() {
    // 找出没有对应订单的订单项
    const orphanedItems = await db.table('order_items as oi')
        .select('oi.id', 'oi.order_id')
        .leftJoin('orders as o', 'oi.order_id', '=', 'o.id')
        .whereNull('o.id')
        .get();

    // 找出没有对应用户的订单
    const orphanedOrders = await db.table('orders as o')
        .select('o.id', 'o.user_id')
        .leftJoin('users as u', 'o.user_id', '=', 'u.id')
        .whereNull('u.id')
        .get();

    return {
        orphanedOrderItems: orphanedItems,
        orphanedOrders: orphanedOrders
    };
}

const issues = await findOrphanedRecords();
```

### 场景4：层级数据查询

```javascript
// 获取完整的部门层级结构
async function getDepartmentHierarchy() {
    const hierarchy = await db.table('departments as d1')
        .select(
            'd1.id',
            'd1.name',
            d1.level',
            'd2.id as parent_id',
            'd2.name as parent_name'
        )
        .selectRaw('COUNT(e.id) as employee_count')
        .leftJoin('departments as d2', 'd1.parent_id', '=', 'd2.id')
        .leftJoin('employees as e', 'd1.id', '=', 'e.department_id')
        .groupBy('d1.id')
        .orderBy('d1.level')
        .orderBy('d1.name')
        .get();

    return hierarchy;
}
```

---

## JOIN性能优化

### 1. 创建合适的索引

```javascript
// 确保JOIN条件中的列都有索引
// users表的id列应该是主键
// orders表的user_id列应该有外键索引
```

### 2. 选择合适的JOIN类型

```javascript
// ✅ 高效：INNER JOIN（过滤两表都有匹配的记录）
const efficient = await db.table('users')
    .join('orders', 'users.id', '=', 'orders.user_id')
    .get();

// ⚠️ 成本高：大型LEFT JOIN（可能包含很多NULL）
const expensive = await db.table('users')
    .leftJoin('orders', 'users.id', '=', 'orders.user_id')
    .get();
```

### 3. 限制返回的列

```javascript
// ✅ 只选择需要的列
const selective = await db.table('users as u')
    .select('u.id', 'u.name', 'o.amount')
    .join('orders as o', 'u.id', '=', 'o.user_id')
    .get();

// ❌ 选择所有列（浪费资源）
const allColumns = await db.table('users as u')
    .select('u.*', 'o.*')
    .join('orders as o', 'u.id', '=', 'o.user_id')
    .get();
```

### 4. 使用LIMIT和OFFSET

```javascript
// 分页处理大型结果集
const page = await db.table('users')
    .join('orders', 'users.id', '=', 'orders.user_id')
    .limit(20)
    .offset(0)
    .get();
```

---

## 常见错误和解决方案

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| 重复的行 | JOIN产生了笛卡尔积 | 使用分组或限制JOIN条件 |
| NULL值混淆 | 不理解LEFT JOIN的NULL值含义 | 使用whereNull()和whereNotNull() |
| 性能缓慢 | 缺少索引或JOIN条件不当 | 添加索引、使用EXPLAIN分析 |
| 列名冲突 | 两个表有相同的列名 | 使用表别名和明确的列选择 |

