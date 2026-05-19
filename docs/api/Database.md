# Database Class API Documentation

## Overview

The `Database` class is the core entry point of the query builder library, responsible for database connection management and query builder creation. It provides a unified interface to connect to different types of databases and returns a fully functional query builder instance.

### Supported Databases

- **MySQL** - The world's most popular open source database
- **PostgreSQL** - Advanced open source object-relational database
- **SQLite** - Lightweight embedded database

### Key Features

- 🔌 **Unified Connection Interface** - Same API regardless of database type
- 🚀 **Dynamic Driver Loading** - Load database drivers on demand, reducing bundle size
- 🛡️ **Automatic Error Handling** - Provides clear error messages and solutions
- ⚙️ **Flexible Configuration** - Supports both configuration object and parameter-based calls
- 🎯 **Type Safe** - Complete JSDoc annotations and type definitions

## Class Methods

### connect()

Creates a database connection and returns a query builder instance.

#### Syntax

```javascript
// Method 1: Using configuration object (recommended)
Database.connect(config)

// Method 2: Using individual parameters
Database.connect(driver, host, username, password, database, port, charset)
```

#### Parameters

**Configuration object method:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `config` | `Object` | ✅ | - | Database configuration object |
| `config.driver` | `string` | ✅ | - | Database driver (`'mysql'`\|`'postgres'`\|`'postgresql'`\|`'sqlite'`) |
| `config.host` | `string` | ❌ | `'localhost'` | Database host address |
| `config.username` | `string` | ❌ | `''` | Database username |
| `config.password` | `string` | ❌ | `''` | Database password |
| `config.database` | `string` | ❌ | `''` | Database name |
| `config.port` | `number` | ❌ | Auto-detect | Database port |
| `config.charset` | `string` | ❌ | `'utf8mb4'` | Character set |
| `config.filename` | `string` | ❌ | - | SQLite database file path |
| `config.pool` | `Object` | ❌ | - | Connection pool configuration |
| `config.ssl` | `Object` | ❌ | - | SSL configuration (PostgreSQL) |

**Individual parameters method:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `driver` | `string` | ✅ | - | Database driver name |
| `host` | `string` | ❌ | `'localhost'` | Database host address |
| `username` | `string` | ❌ | `''` | Database username |
| `password` | `string` | ❌ | `''` | Database password |
| `database` | `string` | ❌ | `''` | Database name |
| `port` | `number` | ❌ | Auto-detect | Database port |
| `charset` | `string` | ❌ | `'utf8mb4'` | Character set |

#### Return Value

`Promise<Builder>` - Query builder instance

#### Exceptions

| Exception Type | Trigger Condition | Solution |
|----------------|-------------------|----------|
| `Error` | Unsupported database driver | Check if driver parameter is `'mysql'`, `'postgres'`, `'postgresql'` or `'sqlite'` |
| `Error` | Database driver package not installed | Execute npm install command as prompted |
| `Error` | Database connection failed | Check connection parameters, network connection and database service status |

#### Default Ports

| Database | Default Port |
|----------|--------------|
| MySQL | 3306 |
| PostgreSQL | 5432 |
| SQLite | No port used |

## Usage Examples

### MySQL Connection

```javascript
// Basic MySQL connection
const db = await Database.connect({
    driver: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'myapp'
});

// MySQL connection with connection pool
const dbWithPool = await Database.connect({
    driver: 'mysql',
    host: 'localhost',
    username: 'root',
    password: 'password',
    database: 'myapp',
    pool: {
        min: 2,      // Minimum connections
        max: 10,     // Maximum connections
        acquire: 30000,  // Connection acquisition timeout (ms)
        idle: 10000  // Idle connection timeout (ms)
    }
});

// Using individual parameters
const dbParams = await Database.connect(
    'mysql',
    'localhost', 
    'root', 
    'password', 
    'myapp',
    3306,
    'utf8mb4'
);
```

### PostgreSQL Connection

```javascript
// Basic PostgreSQL connection
const db = await Database.connect({
    driver: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'password',
    database: 'myapp'
});

// PostgreSQL connection with SSL
const dbSSL = await Database.connect({
    driver: 'postgresql',
    host: 'production-server.com',
    port: 5432,
    username: 'appuser',
    password: 'securepass',
    database: 'production_db',
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
});
```

### SQLite Connection

```javascript
// SQLite file database
const db = await Database.connect({
    driver: 'sqlite',
    filename: './data/app.sqlite'
});

// SQLite in-memory database
const memoryDb = await Database.connect({
    driver: 'sqlite',
    filename: ':memory:'
});

// Temporary SQLite database
const tempDb = await Database.connect({
    driver: 'sqlite',
    filename: ''  // Empty string indicates temporary database
});
```

## Usage Patterns

### Basic Query Flow

```javascript
// 1. Establish connection
const db = await Database.connect({
    driver: 'mysql',
    host: 'localhost',
    username: 'root',
    password: 'password',
    database: 'testdb'
});

// 2. Use query builder
const users = await db.table('users')
    .where('status', 'active')
    .orderBy('created_at', 'desc')
    .limit(10)
    .get();

console.log('Active users:', users);
```

### Error Handling Best Practices

```javascript
try {
    const db = await Database.connect({
        driver: 'mysql',
        host: 'localhost',
        username: 'root',
        password: 'wrongpassword',
        database: 'testdb'
    });
    
    // Execute queries...
    
} catch (error) {
    if (error.message.includes('database driver not installed')) {
        console.error('Please install MySQL driver: npm install mysql2');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('Database authentication failed, check username and password');
    } else if (error.code === 'ECONNREFUSED') {
        console.error('Unable to connect to database, check if service is running');
    } else {
        console.error('Database connection error:', error.message);
    }
}
```

### Environment Configuration Example

```javascript
// config/database.js
const config = {
    development: {
        driver: 'sqlite',
        filename: './dev-database.sqlite'
    },
    
    testing: {
        driver: 'sqlite',
        filename: ':memory:'
    },
    
    production: {
        driver: 'mysql',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        charset: 'utf8mb4',
        pool: {
            min: 2,
            max: 10,
            acquire: 30000,
            idle: 10000
        }
    }
};

// Use environment configuration
const env = process.env.NODE_ENV || 'development';
const db = await Database.connect(config[env]);
```

## Driver Dependencies

### Installation Instructions

Different databases require installing corresponding driver packages:

```bash
# MySQL
npm install mysql2

# PostgreSQL  
npm install pg

# SQLite
npm install sqlite3
```

### Driver Selection

| Database | Recommended Driver | Description |
|----------|-------------------|-------------|
| MySQL | `mysql2` | Supports Promise, better performance |
| PostgreSQL | `pg` | Official recommended Node.js driver |
| SQLite | `sqlite3` | Standard SQLite driver |

## Performance Tips

### Connection Pool Configuration

For production environments, it's recommended to configure connection pools:

```javascript
const db = await Database.connect({
    driver: 'mysql',
    // ... other configurations
    pool: {
        min: 2,           // Minimum connections
        max: 10,          // Maximum connections  
        acquire: 30000,   // Connection acquisition timeout
        idle: 10000,      // Idle timeout
        evict: 1000,      // Detection interval
        handleDisconnects: true  // Auto handle disconnections
    }
});
```

### Connection Reuse

Avoid frequent connection creation:

```javascript
// ❌ Wrong approach - frequent connection creation
for (let i = 0; i < 100; i++) {
    const db = await Database.connect(config);
    // Execute queries...
}

// ✅ Correct approach - reuse connection
const db = await Database.connect(config);
for (let i = 0; i < 100; i++) {
    // Execute queries...
}
```

## Troubleshooting

### Common Issues

**Issue 1: Module not found**

```
Error: Database driver not installed, please execute: npm install mysql2
```

**Solution**: Install the corresponding database driver package as prompted

**Issue 2: Connection timeout**

```
Error: connect ETIMEDOUT
```

**Solution**:
- Check if database service is running
- Check firewall settings
- Verify host address and port

**Issue 3: Authentication failed**

```
Error: ER_ACCESS_DENIED_ERROR
```

**Solution**:
- Check username and password
- Confirm user has database access permissions
- Check allowed connection IP range for host

**Issue 4: Database doesn't exist**

```
Error: ER_BAD_DB_ERROR: Unknown database 'xxx'
```

**Solution**:
- Confirm database name is correct
- Create database or use existing database

## Type Definitions

If you're using TypeScript, you can refer to the following type definitions:

```typescript
interface DatabaseConfig {
    driver: 'mysql' | 'postgres' | 'postgresql' | 'sqlite';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    charset?: string;
    filename?: string;  // SQLite only
    pool?: PoolConfig;
    ssl?: SSLConfig;    // PostgreSQL only
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
        charset?: string
    ): Promise<Builder>;
}
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-01 | Initial version, supports MySQL, PostgreSQL, SQLite |

## Related Documentation

- [Builder Class API Documentation](./Builder.md) - Query builder core functionality
- [Grammar System Documentation](../Grammar.md) - SQL compilation system
- [Processors System Documentation](../Processors.md) - Result processing system
- [Quick Start Guide](../examples/quick-start.md) - Beginner tutorial
- [Basic Queries Guide](../examples/basic-queries.md) - Detailed query examples