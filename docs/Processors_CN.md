# Processors 处理器系统文档

Processors 系统负责后处理从数据库返回的查询结果。它处理类型转换、数据格式化和结果重构，以提供 JavaScript 原生数据类型和结构。每个数据库引擎都有自己的 Processor 类，了解该数据库使用的特定数据类型和表示方式。

## 概述

Processor 系统将原始数据库查询结果转换为正确类型的 JavaScript 对象。这包括将数据库特定的类型表示转换为 JavaScript 等效类型、处理自增 ID 检索、处理元数据，以及为各种用例格式化输出。

### 核心组件

- **基础 Processor** (`lib/queries/processors/Processor.js`) - 定义处理接口的抽象基类
- **MySQLProcessor** (`lib/queries/processors/MySQLProcessor.js`) - MySQL 特定的结果处理
- **PostgreSQLProcessor** (`lib/queries/processors/PostgreSQLProcessor.js`) - PostgreSQL 特定的结果处理
- **SQLiteProcessor** (`lib/queries/processors/SQLiteProcessor.js`) - SQLite 特定的结果处理

## 基本用法

### 处理 SELECT 结果

```javascript
import MySQLProcessor from './lib/queries/processors/MySQLProcessor.js';
import Connection from './lib/Connection.js';

const connection = new Connection({ /* config */ });
const processor = new MySQLProcessor();

// 执行查询并处理结果
const result = await connection.select('SELECT * FROM users');
const processedResults = processor.processSelect(result, connection.fields);

console.log(processedResults);
// [ { id: 1, name: 'John', active: true, created_at: Date }, ... ]
```

### 处理 INSERT 结果

```javascript
// 简单 INSERT
const result = await connection.insert('INSERT INTO users ...');
const processed = processor.processInsert(result);

// INSERT 并获取自增 ID
const id = await connection.insertGetId('INSERT INTO users ...', [], 'id');
console.log(id); // 生成的 ID
```

### 处理 UPDATE 结果

```javascript
const result = await connection.update('UPDATE users SET ...');
const affected = processor.processUpdate(result);
console.log(affected.affectedRows); // 受影响的行数
```

### 处理 DELETE 结果

```javascript
const result = await connection.delete('DELETE FROM users ...');
const deleted = processor.processDelete(result);
console.log(deleted.affectedRows); // 删除的行数
```

## 类型处理详情

### MySQL 类型处理

MySQL 具有需要转换为 JavaScript 等效类型的特定数据类型：

#### 布尔转换 (TINYINT(1))

TINYINT(1) 列在 MySQL 中常用于布尔值：

```javascript
// 数据库: status TINYINT(1) - 存储为 0 或 1
const raw = { id: 1, status: 1 };

const processed = processor.processValue(raw.status, 'TINYINT(1)');
console.log(processed); // true

const processed2 = processor.processValue(0, 'TINYINT(1)');
console.log(processed2); // false
```

#### DateTime 转换为 Date 对象

DATETIME 和 TIMESTAMP 列转换为 JavaScript Date 对象：

```javascript
// 数据库: created_at DATETIME - 存储为 '2026-05-15 10:30:00'
const raw = { id: 1, created_at: '2026-05-15 10:30:00' };

const processed = processor.processValue(raw.created_at, 'DATETIME');
console.log(processed instanceof Date); // true
console.log(processed.toISOString()); // '2026-05-15T10:30:00.000Z'
```

#### JSON 列处理

JSON 列会自动从字符串解析为对象：

```javascript
// 数据库: metadata JSON - 存储为 '{"theme":"dark","lang":"zh"}'
const raw = { id: 1, metadata: '{"theme":"dark","lang":"zh"}' };

const processed = processor.processValue(raw.metadata, 'JSON');
console.log(processed); // { theme: 'dark', lang: 'zh' }
```

#### 数值类型精度处理

MySQL 的数值类型需要特殊处理以保持精度：

```javascript
// DECIMAL 类型保持精度
const raw = { price: '123.45' }; // 从数据库返回为字符串
const processed = processor.processValue(raw.price, 'DECIMAL(10,2)');
console.log(processed); // 123.45 (number)

// BIGINT 处理大整数
const raw2 = { big_number: '9223372036854775807' };
const processed2 = processor.processValue(raw2.big_number, 'BIGINT');
console.log(processed2); // BigInt 或 number，取决于大小
```

### PostgreSQL 类型处理

PostgreSQL 有丰富的数据类型系统：

#### 数组类型处理

```javascript
// PostgreSQL 数组类型
const raw = { tags: '{javascript,node.js,database}' };
const processed = processor.processValue(raw.tags, 'TEXT[]');
console.log(processed); // ['javascript', 'node.js', 'database']

// 整数数组
const raw2 = { numbers: '{1,2,3,4,5}' };
const processed2 = processor.processValue(raw2.numbers, 'INTEGER[]');
console.log(processed2); // [1, 2, 3, 4, 5]
```

#### JSON/JSONB 处理

```javascript
// JSONB 类型
const raw = { data: '{"user_id":123,"preferences":{"theme":"dark"}}' };
const processed = processor.processValue(raw.data, 'JSONB');
console.log(processed); // { user_id: 123, preferences: { theme: 'dark' } }
```

#### UUID 类型

```javascript
// UUID 类型保持为字符串
const raw = { uuid: '550e8400-e29b-41d4-a716-446655440000' };
const processed = processor.processValue(raw.uuid, 'UUID');
console.log(processed); // '550e8400-e29b-41d4-a716-446655440000'
```

#### 时间类型处理

```javascript
// TIMESTAMP WITH TIME ZONE
const raw = { created_at: '2026-05-15 10:30:00+08:00' };
const processed = processor.processValue(raw.created_at, 'TIMESTAMPTZ');
console.log(processed instanceof Date); // true

// TIME 类型
const raw2 = { time_only: '14:30:00' };
const processed2 = processor.processValue(raw2.time_only, 'TIME');
console.log(processed2); // '14:30:00' 或 Date 对象，取决于配置
```

### SQLite 类型处理

SQLite 的动态类型系统需要特殊处理：

#### 类型推断

```javascript
// SQLite 没有严格的列类型，需要根据值推断
const raw = { 
    id: 1,           // INTEGER
    name: 'John',    // TEXT
    active: 1,       // 可能是 BOOLEAN
    score: 95.5      // REAL
};

const processed = processor.processRow(raw);
console.log(processed);
// { id: 1, name: 'John', active: true, score: 95.5 }
```

#### 日期时间处理

```javascript
// SQLite 将日期存储为文本或数字
const raw = { 
    created_text: '2026-05-15 10:30:00',
    created_unix: 1684144200
};

const processed1 = processor.processValue(raw.created_text, 'DATETIME');
const processed2 = processor.processValue(raw.created_unix, 'TIMESTAMP');

console.log(processed1 instanceof Date); // true
console.log(processed2 instanceof Date); // true
```

## 高级处理功能

### 自定义类型转换

```javascript
// 注册自定义类型转换器
processor.addTypeConverter('CUSTOM_TYPE', (value, column) => {
    // 自定义转换逻辑
    return customConversion(value);
});

// 使用自定义转换
const processed = processor.processValue(rawValue, 'CUSTOM_TYPE');
```

### 结果格式化选项

```javascript
// 配置处理器选项
const processor = new MySQLProcessor({
    convertTinyIntToBool: true,     // 将 TINYINT(1) 转换为布尔值
    parseJSON: true,                // 自动解析 JSON 列
    convertDatesToJS: true,         // 转换日期到 JavaScript Date
    preserveUndefined: false,       // 将 undefined 转换为 null
    trimStrings: true               // 自动修剪字符串空白
});
```

### 批量处理优化

```javascript
// 批量处理大量结果
const batchProcessor = new BatchProcessor(processor);

const largeResult = await connection.select('SELECT * FROM large_table');
const processed = await batchProcessor.processLarge(largeResult, {
    batchSize: 1000,        // 每批处理 1000 行
    parallel: 4             // 并行处理 4 个批次
});
```

### 元数据处理

```javascript
// 处理查询元数据
const result = await connection.selectWithMeta('SELECT * FROM users');
const processed = processor.processWithMetadata(result);

console.log(processed);
// {
//   data: [...],           // 处理后的数据
//   meta: {
//     fields: [...],       // 字段信息
//     affectedRows: 0,     // 受影响的行数
//     insertId: null,      // 插入 ID
//     warnings: []         // 警告信息
//   }
// }
```

## 性能优化

### 类型缓存

```javascript
// 启用类型信息缓存以提高性能
processor.enableTypeCache();

// 预热类型缓存
await processor.warmupTypeCache(['users', 'posts', 'comments']);
```

### 字段映射

```javascript
// 预定义字段映射以减少类型检测开销
processor.setFieldMap('users', {
    id: 'INTEGER',
    name: 'VARCHAR',
    active: 'TINYINT(1)',
    created_at: 'DATETIME',
    metadata: 'JSON'
});
```

### 流式处理

```javascript
// 对大型结果集使用流式处理
const stream = connection.selectStream('SELECT * FROM large_table');

stream.on('data', (row) => {
    const processed = processor.processRow(row);
    // 处理单行数据
});

stream.on('end', () => {
    console.log('处理完成');
});
```

## 错误处理

### 类型转换错误

```javascript
try {
    const processed = processor.processValue(invalidValue, 'INTEGER');
} catch (error) {
    if (error instanceof TypeConversionError) {
        console.error('类型转换失败:', error.message);
        console.error('原始值:', error.originalValue);
        console.error('目标类型:', error.targetType);
    }
}
```

### 安全处理未知类型

```javascript
// 配置未知类型的默认行为
processor.setUnknownTypeHandler((value, type) => {
    console.warn(`未知类型 ${type}，返回原始值`);
    return value;
});
```

### 数据验证

```javascript
// 启用数据验证
processor.enableValidation({
    validateUTF8: true,         // 验证 UTF-8 编码
    validateJSON: true,         // 验证 JSON 格式
    validateDates: true,        // 验证日期格式
    validateNumbers: true       // 验证数字范围
});
```

## 自定义 Processor

### 扩展基础 Processor

```javascript
import Processor from './Processor.js';

class CustomProcessor extends Processor {
    /**
     * 处理自定义数据类型
     */
    processValue(value, type, column = null) {
        switch (type) {
            case 'CUSTOM_ENUM':
                return this.processEnum(value);
            case 'ENCRYPTED_TEXT':
                return this.decryptValue(value);
            default:
                return super.processValue(value, type, column);
        }
    }
    
    /**
     * 处理枚举类型
     */
    processEnum(value) {
        const enumMap = {
            0: 'inactive',
            1: 'active',
            2: 'suspended'
        };
        return enumMap[value] || 'unknown';
    }
    
    /**
     * 解密值
     */
    decryptValue(encryptedValue) {
        return decrypt(encryptedValue);
    }
}
```

### 注册自定义 Processor

```javascript
import Database from './Database.js';
import CustomProcessor from './CustomProcessor.js';

// 注册自定义 Processor
Database.registerProcessor('custom', CustomProcessor);

// 使用自定义 Processor
const db = await Database.connect({
    driver: 'custom',
    processor: 'custom',
    // ... 其他配置
});
```

## 配置选项

### MySQL Processor 配置

```javascript
const processor = new MySQLProcessor({
    // 布尔值转换
    convertTinyIntToBool: true,
    tinyIntBooleanFields: ['active', 'verified', 'enabled'],
    
    // 日期时间处理
    timezone: 'UTC',
    convertDatesToJS: true,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    
    // JSON 处理
    parseJSON: true,
    jsonFields: ['metadata', 'settings', 'data'],
    
    // 数值处理
    convertNumericStrings: true,
    preserveDecimals: true,
    
    // 字符串处理
    trimStrings: false,
    emptyStringToNull: false
});
```

### PostgreSQL Processor 配置

```javascript
const processor = new PostgreSQLProcessor({
    // 数组处理
    parseArrays: true,
    arrayNullHandling: 'empty', // 'empty' | 'null' | 'keep'
    
    // JSON 处理
    parseJSONB: true,
    jsonDateReviver: (key, value) => {
        if (key.endsWith('_at') && typeof value === 'string') {
            return new Date(value);
        }
        return value;
    },
    
    // UUID 处理
    parseUUID: false, // 保持为字符串
    
    // 时区处理
    timezone: 'Asia/Shanghai',
    convertTimestamps: true
});
```

### SQLite Processor 配置

```javascript
const processor = new SQLiteProcessor({
    // 类型推断
    enableTypeInference: true,
    inferBooleanFromInteger: true,
    
    // 日期处理
    dateStorageFormat: 'text', // 'text' | 'unix' | 'iso'
    convertDates: true,
    
    // 字符串处理
    trimStrings: true,
    convertEmptyStringToNull: true
});
```

## 调试和监控

### 启用调试

```javascript
// 启用调试模式
processor.enableDebug();

// 设置调试回调
processor.onDebug((event, data) => {
    console.log(`[${event}]`, data);
});

// 处理结果时查看调试信息
const result = processor.processSelect(rawResult);
```

### 性能监控

```javascript
// 启用性能监控
processor.enablePerfMonitoring();

// 获取性能统计
const stats = processor.getPerformanceStats();
console.log(stats);
// {
//   totalProcessed: 1000,
//   averageTime: 0.5,
//   typeConversions: 5000,
//   cacheHits: 800
// }
```

## 故障排除

### 常见问题

**类型转换失败：**
```javascript
// 检查原始值和目标类型
processor.onTypeError((error, value, type) => {
    console.error(`无法将 ${value} 转换为 ${type}`);
    return null; // 返回默认值
});
```

**性能问题：**
```javascript
// 启用缓存和批量处理
processor.enableCache();
processor.setBatchSize(100);

// 监控处理时间
processor.onSlowProcess((duration, rowCount) => {
    console.warn(`处理 ${rowCount} 行耗时 ${duration}ms`);
});
```

**内存使用：**
```javascript
// 启用流式处理对大结果集
if (resultSize > 10000) {
    return processor.processStream(result);
} else {
    return processor.processAll(result);
}
```

## 相关文档

- [Grammar 系统文档](./Grammar_CN.md) - SQL 编译系统
- [Builder API 文档](./api/Builder_CN.md) - 查询构建器参考
- [Database 类文档](./api/Database_CN.md) - 数据库连接管理
- [快速开始指南](./examples/quick-start_CN.md) - 入门教程