/**
 * Database - 数据库连接和查询管理器
 *
 * 提供数据库连接、事务管理和查询构建的统一接口。
 * 支持MySQL、PostgreSQL和SQLite数据库。
 */
import Builder from "./queries/Builder.js";
export interface DatabaseConfig {
  driver: "mysql" | "postgres" | "postgresql" | "sqlite";
  host?: string;
  username?: string;
  password?: string;
  database?: string;
  port?: number;
  charset?: string;
  filename?: string;
  pool?: {
    min?: number;
    max?: number;
    acquire?: number;
    idle?: number;
  };
  ssl?: {
    require?: boolean;
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}
export interface PoolConfig {
  min?: number;
  max?: number;
  acquire?: number;
  idle?: number;
}
export interface SSLConfig {
  require?: boolean;
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}
declare class Database {
  /**
   * 创建数据库连接并返回查询构建器实例
   *
   * @param driver - 数据库驱动名称或配置对象
   * @param host - 数据库主机地址
   * @param username - 数据库用户名
   * @param password - 数据库密码
   * @param database - 数据库名称
   * @param port - 数据库端口
   * @param charset - 字符集
   * @returns 查询构建器实例
   */
  static connect(
    driver: DatabaseConfig | string,
    host?: string,
    username?: string,
    password?: string,
    database?: string,
    port?: number,
    charset?: string,
  ): Promise<Builder>;
  /**
   * 创建查询构建器实例
   *
   * @param connection - 数据库连接实例
   * @returns 查询构建器实例
   */
  static createBuilder(connection: any, grammar?: any): Builder;
  /**
   * 创建事务
   *
   * @param config - 数据库配置
   * @returns 事务查询构建器
   */
  static transaction(config: DatabaseConfig): Promise<Builder>;
  /**
   * 执行原生SQL查询
   *
   * @param config - 数据库配置
   * @param sql - SQL语句
   * @param bindings - 绑定参数
   * @returns 查询结果
   */
  static raw(
    config: DatabaseConfig,
    sql: string,
    bindings?: any[],
  ): Promise<any>;
}
export default Database;
//# sourceMappingURL=Database.d.ts.map
