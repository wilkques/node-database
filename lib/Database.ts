/**
 * Database - Modern Node.js Database Query Builder
 *
 * A powerful, flexible database abstraction layer inspired by Laravel's Eloquent and PHP's wilkques/database.
 * Provides a unified interface for database operations across multiple database systems.
 *
 * @description
 * The Database class serves as the main entry point for database operations, offering:
 * - Multi-database support (MySQL, PostgreSQL, SQLite)
 * - Fluent query builder interface
 * - Automatic parameter binding and SQL injection protection
 * - Transaction management
 * - Connection pooling support
 * - Type-safe operations with TypeScript support
 *
 * @example Basic Usage
 * ```typescript
 * import Database from '@wilkques/database';
 *
 * // Connect to MySQL
 * const db = await Database.connect({
 *   driver: 'mysql',
 *   host: 'localhost',
 *   username: 'user',
 *   password: 'password',
 *   database: 'myapp'
 * });
 *
 * // Build and execute queries
 * const users = await db.table('users')
 *   .select('*')
 *   .where('active', true)
 *   .orderBy('created_at', 'desc')
 *   .get();
 * ```
 *
 * @example Advanced Features
 * ```typescript
 * // Complex query with JOIN and conditional expressions
 * const result = await db.table('users')
 *   .select('users.*')
 *   .select(db.if('age >= 18', 'Adult', 'Minor').as('age_group'))
 *   .select(db.case('status')
 *     .when('active', 'Active User')
 *     .when('pending', 'Pending Approval')
 *     .else('Inactive User')
 *     .end('status_text')
 *   )
 *   .leftJoin('profiles', 'users.id', 'profiles.user_id')
 *   .where('users.created_at', '>', '2024-01-01')
 *   .get();
 * ```
 *
 * @since 1.0.0
 * @author wilkques
 * @license MIT
 */

import Builder from "./queries/Builder.js";
import Processor from "./queries/processors/Processor.js";
import MySQL from "./queries/grammar/MySQL.js";
import PostgreSQL from "./queries/grammar/PostgreSQL.js";
import SQLite from "./queries/grammar/SQLite.js";
import {
  DatabaseError,
  ConnectionError,
  ConfigurationError,
  DriverNotFoundError,
  DatabaseErrorFactory,
} from "./errors/DatabaseError.js";

/**
 * Database configuration interface
 *
 * Comprehensive configuration options for database connections across different drivers.
 * Supports connection pooling, SSL/TLS encryption, and driver-specific options.
 *
 * @interface DatabaseConfig
 * @since 1.0.0
 *
 * @example MySQL Configuration
 * ```typescript
 * const mysqlConfig: DatabaseConfig = {
 *   driver: 'mysql',
 *   host: 'localhost',
 *   port: 3306,
 *   username: 'root',
 *   password: 'secret',
 *   database: 'myapp',
 *   charset: 'utf8mb4',
 *   pool: { min: 0, max: 10 },
 *   ssl: { require: true }
 * };
 * ```
 *
 * @example PostgreSQL Configuration
 * ```typescript
 * const pgConfig: DatabaseConfig = {
 *   driver: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   username: 'postgres',
 *   password: 'secret',
 *   database: 'myapp'
 * };
 * ```
 *
 * @example SQLite Configuration
 * ```typescript
 * const sqliteConfig: DatabaseConfig = {
 *   driver: 'sqlite',
 *   database: 'myapp.db',
 *   filename: './database/myapp.db'  // Alternative to database
 * };
 * ```
 */
export interface DatabaseConfig {
  /** Database driver type. Use 'postgres' or 'postgresql' for PostgreSQL */
  driver: "mysql" | "postgres" | "postgresql" | "sqlite";

  /** Database server hostname or IP address (not used for SQLite) */
  host?: string;

  /** Database username for authentication (not used for SQLite) */
  username?: string;

  /** Database password for authentication (not used for SQLite) */
  password?: string;

  /** Database name to connect to. For SQLite, this can be the file path */
  database?: string;

  /** Database server port. Defaults: MySQL=3306, PostgreSQL=5432 */
  port?: number;

  /** Character set for the connection. Default: 'utf8mb4' for MySQL */
  charset?: string;

  /** SQLite-specific: Database file path. Alternative to 'database' field */
  filename?: string;

  /** Connection pool configuration for managing multiple connections */
  pool?: PoolConfig;

  /** SSL/TLS configuration for secure connections */
  ssl?: SSLConfig;
}

/**
 * Connection pool configuration interface
 *
 * Manages database connection pooling for improved performance and resource management.
 * Helps prevent connection exhaustion and improves application scalability.
 *
 * @interface PoolConfig
 * @since 1.0.0
 *
 * @example Basic Pool Configuration
 * ```typescript
 * const poolConfig: PoolConfig = {
 *   min: 0,          // Start with no idle connections
 *   max: 10,         // Maximum 10 concurrent connections
 *   acquire: 30000,  // 30 second timeout to get connection
 *   idle: 10000      // Close idle connections after 10 seconds
 * };
 * ```
 */
export interface PoolConfig {
  /** Minimum number of connections to maintain in the pool. Default: 0 */
  min?: number;

  /** Maximum number of connections allowed in the pool. Default: 10 */
  max?: number;

  /** Maximum time (ms) to wait for a connection before timing out. Default: 30000 */
  acquire?: number;

  /** Time (ms) before idle connections are closed. Default: 10000 */
  idle?: number;
}

/**
 * SSL/TLS configuration interface
 *
 * Provides secure connection options for databases that support encrypted connections.
 * Essential for production environments and compliance requirements.
 *
 * @interface SSLConfig
 * @since 1.0.0
 *
 * @example Basic SSL Configuration
 * ```typescript
 * const sslConfig: SSLConfig = {
 *   require: true,              // Force SSL connection
 *   rejectUnauthorized: true,   // Verify server certificate
 *   ca: fs.readFileSync('ca-certificate.pem'),
 *   cert: fs.readFileSync('client-certificate.pem'),
 *   key: fs.readFileSync('client-key.pem')
 * };
 * ```
 */
export interface SSLConfig {
  /** Whether to require SSL connection. Default: false */
  require?: boolean;

  /** Whether to reject connections with invalid certificates. Default: true */
  rejectUnauthorized?: boolean;

  /** Certificate Authority certificate in PEM format */
  ca?: string;

  /** Client certificate in PEM format for mutual authentication */
  cert?: string;

  /** Private key in PEM format for client certificate */
  key?: string;
}

class Database {
  /**
   * Create a database connection and return a query builder instance
   *
   * This is the primary method for establishing database connections. It supports both
   * configuration objects and individual parameters for backward compatibility.
   * The method automatically detects the database type and configures the appropriate
   * grammar and processor for optimal query generation.
   *
   * @param driver - Database driver name or complete configuration object
   * @param host - Database server hostname or IP address. Default: "localhost"
   * @param username - Database username for authentication. Default: ""
   * @param password - Database password for authentication. Default: ""
   * @param database - Database name to connect to. Default: ""
   * @param port - Database server port. Auto-detected based on driver if not specified
   * @param charset - Character set for the connection. Default: "utf8mb4"
   *
   * @returns Promise that resolves to a configured Builder instance
   *
   * @throws {Error} When unsupported database driver is specified
   * @throws {Error} When required database driver package is not installed
   * @throws {Error} When database connection fails
   * @throws {Error} When required configuration parameters are missing
   *
   * @example Using Configuration Object (Recommended)
   * ```typescript
   * // MySQL connection with all options
   * const db = await Database.connect({
   *   driver: 'mysql',
   *   host: 'localhost',
   *   port: 3306,
   *   username: 'root',
   *   password: 'secret',
   *   database: 'myapp',
   *   charset: 'utf8mb4',
   *   pool: { min: 0, max: 10 },
   *   ssl: { require: true }
   * });
   *
   * // PostgreSQL connection
   * const pgDb = await Database.connect({
   *   driver: 'postgres',
   *   host: 'localhost',
   *   port: 5432,
   *   username: 'postgres',
   *   password: 'secret',
   *   database: 'myapp'
   * });
   *
   * // SQLite connection
   * const sqliteDb = await Database.connect({
   *   driver: 'sqlite',
   *   database: './data/myapp.db'
   * });
   * ```
   *
   * @example Using Individual Parameters (Legacy)
   * ```typescript
   * // MySQL with individual parameters
   * const db = await Database.connect(
   *   'mysql',
   *   'localhost',
   *   'root',
   *   'secret',
   *   'myapp',
   *   3306,
   *   'utf8mb4'
   * );
   * ```
   *
   * @example Error Handling
   * ```typescript
   * try {
   *   const db = await Database.connect({
   *     driver: 'mysql',
   *     host: 'localhost',
   *     username: 'root',
   *     password: 'wrongpassword',
   *     database: 'myapp'
   *   });
   * } catch (error) {
   *   console.error('Database connection failed:', error.message);
   *   // Handle connection error appropriately
   * }
   * ```
   *
   * @since 1.0.0
   */
  static async connect(
    driver: DatabaseConfig | string,
    host: string = "localhost",
    username: string = "",
    password: string = "",
    database: string = "",
    port?: number,
    charset: string = "utf8mb4",
  ): Promise<Builder> {
    let config: DatabaseConfig;

    // Handle object config
    if (typeof driver === "object") {
      config = {
        host: "localhost",
        username: "",
        password: "",
        database: "",
        port: undefined,
        charset: "utf8mb4",
        ...driver,
      };
    } else {
      // Handle individual parameters
      config = {
        driver: driver as "mysql" | "postgres" | "postgresql" | "sqlite",
        host,
        username,
        password,
        database,
        port,
        charset,
      };
    }

    // Set default ports based on driver
    if (!config.port) {
      switch (config.driver) {
        case "mysql": {
          config.port = 3306;
          break;
        }
        case "postgres":
        case "postgresql": {
          config.port = 5432;
          config.driver = "postgres"; // Normalize postgresql to postgres
          break;
        }
        case "sqlite": {
          // SQLite doesn't use ports
          break;
        }
        default: {
          throw new Error(
            `Unsupported database driver: ${config.driver}. Supported drivers: mysql, postgres, sqlite`,
          );
        }
      }
    }

    // Validate required fields based on driver
    if (config.driver !== "sqlite") {
      if (!config.database) {
        throw new ConfigurationError(
          `Database name is required for ${config.driver}`,
          { driver: config.driver },
        );
      }
    } else {
      if (!config.filename && !config.database) {
        throw new ConfigurationError(
          "SQLite requires either 'filename' or 'database' field",
          { driver: config.driver },
        );
      }
      // Use database as filename if filename not provided
      if (!config.filename) {
        config.filename = config.database;
      }
    }

    let Connection: any;
    try {
      const connectionPath = `./connections/drivers/${config.driver}.js`;
      const ConnectionModule = await import(connectionPath);
      Connection = ConnectionModule.default;
    } catch (error: any) {
      if (error.code === "MODULE_NOT_FOUND") {
        throw new DriverNotFoundError(config.driver, [
          "mysql",
          "postgres",
          "sqlite",
        ]);
      }
      throw DatabaseErrorFactory.fromError(error, { driver: config.driver });
    }

    // Create connection instance
    const connection = new Connection(config);

    try {
      await connection.connect();
    } catch (error: any) {
      throw new ConnectionError(
        `Failed to connect to ${config.driver} database: ${error.message}`,
        {
          driver: config.driver,
          host: config.host,
          database: config.database,
          originalError: error,
        },
      );
    }

    // Create grammar based on driver
    let grammar;
    switch (config.driver) {
      case "mysql":
        grammar = new MySQL();
        break;
      case "postgres":
      case "postgresql":
        grammar = new PostgreSQL();
        break;
      case "sqlite":
        grammar = new SQLite();
        break;
      default:
        throw new Error(`Unsupported database driver: ${config.driver}`);
    }

    // Create and return query builder with grammar
    const builder = new Builder(connection, grammar);
    builder.setProcessor(new Processor());

    return builder;
  }

  /**
   * 创建查询构建器实例
   *
   * @param connection - 数据库连接实例
   * @returns 查询构建器实例
   */
  /**
   * Create a query builder instance with existing connection and grammar
   *
   * This factory method creates a Builder instance with the specified connection
   * and grammar. It automatically configures the appropriate processor for result
   * handling. Primarily used internally but available for advanced use cases.
   *
   * @param connection - Database connection instance
   * @param grammar - SQL grammar instance (auto-detected if not provided)
   * @returns Configured Builder instance
   *
   * @example Advanced Usage
   * ```typescript
   * import MySQL from '@wilkques/database/lib/queries/grammar/MySQL';
   * import Connection from '@wilkques/database/lib/connections/Connection';
   *
   * // Create custom builder with specific grammar
   * const connection = new Connection(config);
   * const grammar = new MySQL();
   * const builder = Database.createBuilder(connection, grammar);
   * ```
   *
   * @since 1.0.0
   */
  static createBuilder(connection: any, grammar?: any): Builder {
    const builder = new Builder(connection, grammar);
    builder.setProcessor(new Processor());
    return builder;
  }

  /**
   * Create a database transaction
   *
   * Establishes a database connection and begins a transaction. All queries executed
   * within the returned builder will be part of the transaction. The transaction must
   * be explicitly committed or rolled back.
   *
   * @param config - Database configuration object
   * @returns Promise that resolves to a transaction-enabled Builder instance
   *
   * @throws {Error} When database connection fails
   * @throws {Error} When transaction cannot be started
   *
   * @example Basic Transaction Usage
   * ```typescript
   * const transaction = await Database.transaction({
   *   driver: 'mysql',
   *   host: 'localhost',
   *   username: 'root',
   *   password: 'secret',
   *   database: 'myapp'
   * });
   *
   * try {
   *   // Perform multiple operations in transaction
   *   await transaction.table('users')
   *     .insert({ name: 'John', email: 'john@example.com' });
   *
   *   await transaction.table('profiles')
   *     .insert({ user_id: 1, bio: 'Software Developer' });
   *
   *   // Commit the transaction
   *   await transaction.commit();
   * } catch (error) {
   *   // Rollback on error
   *   await transaction.rollback();
   *   throw error;
   * }
   * ```
   *
   * @example Transaction with Error Handling
   * ```typescript
   * const transaction = await Database.transaction(config);
   *
   * try {
   *   const result = await transaction.table('accounts')
   *     .where('id', fromAccountId)
   *     .decrement('balance', amount);
   *
   *   if (result === 0) {
   *     throw new Error('Account not found');
   *   }
   *
   *   await transaction.table('accounts')
   *     .where('id', toAccountId)
   *     .increment('balance', amount);
   *
   *   await transaction.commit();
   * } catch (error) {
   *   await transaction.rollback();
   *   console.error('Transaction failed:', error.message);
   * }
   * ```
   *
   * @since 1.0.0
   */
  static async transaction(config: DatabaseConfig): Promise<Builder> {
    const builder = await Database.connect(config);
    return await builder.transaction();
  }

  /**
   * Execute raw SQL query
   *
   * Executes a raw SQL statement with optional parameter binding. This method provides
   * direct access to the database for complex queries that cannot be expressed through
   * the query builder. Parameters are safely bound to prevent SQL injection.
   *
   * @param config - Database configuration object
   * @param sql - Raw SQL statement with parameter placeholders (?)
   * @param bindings - Array of values to bind to SQL parameters. Default: []
   * @returns Promise that resolves to the query results
   *
   * @throws {Error} When database connection fails
   * @throws {Error} When SQL execution fails
   * @throws {Error} When parameter binding count doesn't match placeholders
   *
   * @example Simple Raw Query
   * ```typescript
   * const users = await Database.raw(config,
   *   'SELECT * FROM users WHERE age > ? AND city = ?',
   *   [18, 'New York']
   * );
   * ```
   *
   * @example Raw Query with Complex Operations
   * ```typescript
   * // Execute stored procedure
   * const result = await Database.raw(config,
   *   'CALL GetUserStatistics(?, ?)',
   *   [userId, startDate]
   * );
   *
   * // Complex aggregation query
   * const stats = await Database.raw(config, `
   *   SELECT
   *     DATE(created_at) as date,
   *     COUNT(*) as count,
   *     AVG(amount) as average
   *   FROM orders
   *   WHERE created_at >= ?
   *   GROUP BY DATE(created_at)
   *   ORDER BY date DESC
   * `, [thirtyDaysAgo]);
   * ```
   *
   * @example Database-Specific Raw Queries
   * ```typescript
   * // MySQL-specific query with JSON functions
   * const mysqlResult = await Database.raw(mysqlConfig,
   *   "SELECT JSON_EXTRACT(metadata, '$.tags') FROM posts WHERE id = ?",
   *   [postId]
   * );
   *
   * // PostgreSQL-specific query with arrays
   * const pgResult = await Database.raw(pgConfig,
   *   'SELECT * FROM users WHERE tags && ?::text[]',
   *   [['developer', 'javascript']]
   * );
   * ```
   *
   * @warning Use parameter binding for all user input to prevent SQL injection
   * @warning Raw queries bypass query builder validations and type safety
   *
   * @since 1.0.0
   */
  static async raw(
    config: DatabaseConfig,
    sql: string,
    bindings: any[] = [],
  ): Promise<any> {
    const builder = await Database.connect(config);
    return await builder.raw(sql, bindings);
  }
}

export default Database;
