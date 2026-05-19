/**
 * Database - 数据库连接和查询管理器
 *
 * 提供数据库连接、事务管理和查询构建的统一接口。
 * 支持MySQL、PostgreSQL和SQLite数据库。
 *
 * @class Database
 * @version 1.0.0
 * @author Database Team
 *
 * @example
 * // 使用配置对象连接MySQL
 * const db = await Database.connect({
 *     driver: 'mysql',
 *     host: 'localhost',
 *     port: 3306,
 *     username: 'root',
 *     password: 'password',
 *     database: 'testdb'
 * });
 *
 * @example
 * // 使用参数连接PostgreSQL
 * const db = await Database.connect(
 *     'postgres',
 *     'localhost',
 *     'user',
 *     'password',
 *     'mydb'
 * );
 *
 * @example
 * // 连接SQLite数据库
 * const db = await Database.connect({
 *     driver: 'sqlite',
 *     filename: './database.sqlite'
 * });
 */

import Builder from "./queries/Builder.js";
import Processor from "./queries/processors/Processor.js";

class Database {
  /**
   * 创建数据库连接并返回查询构建器实例
   *
   * 此方法是Database类的主要入口点，支持两种调用方式：
   * 1. 传入配置对象（推荐）
   * 2. 传入独立参数
   *
   * @static
   * @param {string|Object} driver - 数据库驱动名称或配置对象
   * @param {string} driver.driver - 数据库驱动 ('mysql'|'postgres'|'postgresql'|'sqlite')
   * @param {string} [driver.host='localhost'] - 数据库主机地址
   * @param {string} [driver.username=''] - 数据库用户名
   * @param {string} [driver.password=''] - 数据库密码
   * @param {string} [driver.database=''] - 数据库名称
   * @param {number} [driver.port] - 数据库端口（自动根据驱动类型设置）
   * @param {string} [driver.charset='utf8mb4'] - 字符集
   * @param {string} [driver.filename] - SQLite数据库文件路径
   * @param {Object} [driver.pool] - 连接池配置
   * @param {Object} [driver.ssl] - SSL配置（PostgreSQL）
   *
   * @param {string} [host='localhost'] - 数据库主机地址（当第一个参数为字符串时使用）
   * @param {string} [username=''] - 数据库用户名（当第一个参数为字符串时使用）
   * @param {string} [password=''] - 数据库密码（当第一个参数为字符串时使用）
   * @param {string} [database=''] - 数据库名称（当第一个参数为字符串时使用）
   * @param {number} [port] - 数据库端口（当第一个参数为字符串时使用）
   * @param {string} [charset='utf8mb4'] - 字符集（当第一个参数为字符串时使用）
   *
   * @returns {Promise<Builder>} 查询构建器实例，用于执行数据库操作
   *
   * @throws {Error} 当数据库驱动不受支持时抛出错误
   * @throws {Error} 当数据库驱动包未安装时抛出安装提示错误
   * @throws {Error} 当数据库连接失败时抛出连接错误
   *
   * @example
   * // 使用配置对象（推荐方式）
   * const db = await Database.connect({
   *     driver: 'mysql',
   *     host: 'localhost',
   *     port: 3306,
   *     username: 'root',
   *     password: 'password',
   *     database: 'testdb',
   *     charset: 'utf8mb4'
   * });
   *
   * @example
   * // 使用独立参数
   * const db = await Database.connect(
   *     'postgres',
   *     'localhost',
   *     'user',
   *     'password',
   *     'mydb',
   *     5432,
   *     'utf8'
   * );
   *
   * @example
   * // 连接SQLite数据库
   * const db = await Database.connect({
   *     driver: 'sqlite',
   *     filename: './data/app.sqlite'
   * });
   *
   * @example
   * // 使用连接池配置
   * const db = await Database.connect({
   *     driver: 'mysql',
   *     host: 'localhost',
   *     username: 'root',
   *     password: 'password',
   *     database: 'testdb',
   *     pool: {
   *         min: 2,
   *         max: 10,
   *         acquire: 30000,
   *         idle: 10000
   *     }
   * });
   *
   * @since 1.0.0
   */
  static async connect(
    driver,
    host = "localhost",
    username = "",
    password = "",
    database = "",
    port = null,
    charset = "utf8mb4",
  ) {
    let config;

    // Handle object config
    if (typeof driver === "object") {
      config = {
        host: "localhost",
        username: "",
        password: "",
        database: "",
        port: null,
        charset: "utf8mb4",
        ...driver,
      };
    } else {
      // Handle individual parameters
      config = {
        driver,
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
        case "mysql":
          config.port = 3306;
          break;
        case "postgres":
        case "postgresql":
          config.port = 5432;
          break;
        case "sqlite":
          config.port = null; // SQLite doesn't use ports
          break;
        default:
          throw new Error(`Unsupported driver [${config.driver}]`);
      }
    }

    return await this._boot(config);
  }

  /**
   * 初始化数据库连接和查询构建器
   *
   * 内部方法，负责协调连接创建、语法解析器创建和查询处理器初始化。
   * 将这些组件组装成完整的查询构建器实例。
   *
   * @static
   * @private
   * @param {Object} config - 标准化的数据库配置对象
   * @param {string} config.driver - 数据库驱动类型
   * @param {string} config.host - 数据库主机
   * @param {string} config.username - 用户名
   * @param {string} config.password - 密码
   * @param {string} config.database - 数据库名
   * @param {number} config.port - 端口号
   * @param {string} config.charset - 字符集
   *
   * @returns {Promise<Builder>} 完全初始化的查询构建器实例
   *
   * @throws {Error} 当连接创建或语法解析器创建失败时
   *
   * @internal
   * @since 1.0.0
   */
  static async _boot(config) {
    const connection = await this._createConnection(config);
    const grammar = await this._createGrammar(config.driver);
    const processor = new Processor();

    const builder = new Builder(connection, grammar, processor);

    return builder;
  }

  /**
   * 根据驱动类型创建数据库连接
   *
   * 动态加载对应的数据库驱动程序，创建连接实例并建立数据库连接。
   * 支持MySQL、PostgreSQL和SQLite驱动的自动加载和错误处理。
   *
   * @static
   * @private
   * @param {Object} config - 数据库配置对象
   * @param {string} config.driver - 数据库驱动类型
   * @param {string} config.host - 主机地址
   * @param {string} config.username - 用户名
   * @param {string} config.password - 密码
   * @param {string} config.database - 数据库名
   * @param {number} config.port - 端口号
   * @param {string} [config.filename] - SQLite数据库文件路径
   *
   * @returns {Promise<Connection>} 已连接的数据库连接实例
   *
   * @throws {Error} 当数据库驱动不受支持时
   * @throws {Error} 当数据库驱动包未安装时，提供npm安装命令
   * @throws {Error} 当数据库连接失败时
   *
   * @example
   * // 内部调用示例（仅供参考）
   * const connection = await Database._createConnection({
   *     driver: 'mysql',
   *     host: 'localhost',
   *     username: 'root',
   *     password: 'password',
   *     database: 'testdb',
   *     port: 3306
   * });
   *
   * @internal
   * @since 1.0.0
   */
  static async _createConnection(config) {
    let Driver;

    try {
      switch (config.driver) {
        case "mysql":
          const { default: MySqlDriver } =
            await import("./connections/drivers/mysql.js");
          Driver = MySqlDriver;
          break;
        case "postgres":
        case "postgresql":
          const { default: PostgreSQLDriver } =
            await import("./connections/drivers/postgres.js");
          Driver = PostgreSQLDriver;
          break;
        case "sqlite":
          const { default: SQLiteDriver } =
            await import("./connections/drivers/sqlite.js");
          Driver = SQLiteDriver;
          break;
        default:
          throw new Error(`Unsupported driver [${config.driver}]`);
      }

      const driver = new Driver();
      await driver.connect(config);
      return driver;
    } catch (error) {
      if (
        error.code === "MODULE_NOT_FOUND" ||
        error.message.includes("Cannot resolve module")
      ) {
        const driverMap = {
          mysql: "mysql2",
          postgres: "pg",
          postgresql: "pg",
          sqlite: "sqlite3",
        };
        const packageName = driverMap[config.driver] || config.driver;
        throw new Error(`数据库驱动未安装，请执行: npm install ${packageName}`);
      }
      throw error;
    }
  }

  /**
   * 根据驱动类型创建SQL语法解析器
   *
   * 动态加载对应数据库的SQL语法解析器，用于生成符合特定数据库语法的SQL语句。
   * 每种数据库都有自己的语法特性，此方法确保生成正确的SQL。
   *
   * @static
   * @private
   * @param {string} driver - 数据库驱动名称 ('mysql'|'postgres'|'postgresql'|'sqlite')
   *
   * @returns {Promise<Grammar>} 对应数据库的SQL语法解析器实例
   *
   * @throws {Error} 当数据库驱动不受支持时
   * @throws {Error} 当语法解析器加载失败时
   *
   * @example
   * // 内部调用示例（仅供参考）
   * const grammar = await Database._createGrammar('mysql');
   * // 返回 MySqlGrammar 实例
   *
   * @internal
   * @since 1.0.0
   */
  static async _createGrammar(driver) {
    try {
      switch (driver) {
        case "mysql":
          const { default: MySqlGrammar } =
            await import("./queries/grammar/MySQL.js");
          return new MySqlGrammar();
        case "postgres":
        case "postgresql":
          const { default: PostgreSQLGrammar } =
            await import("./queries/grammar/PostgreSQL.js");
          return new PostgreSQLGrammar();
        case "sqlite":
          const { default: SQLiteGrammar } =
            await import("./queries/grammar/SQLite.js");
          return new SQLiteGrammar();
        default:
          throw new Error(`Unsupported driver [${driver}]`);
      }
    } catch (error) {
      throw new Error(`语法解析器加载失败: ${error.message}`);
    }
  }
}

export default Database;
