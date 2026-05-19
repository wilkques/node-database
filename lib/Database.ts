/**
 * Database - 数据库连接和查询管理器
 *
 * 提供数据库连接、事务管理和查询构建的统一接口。
 * 支持MySQL、PostgreSQL和SQLite数据库。
 */

import Builder from "./queries/Builder.js";
import Processor from "./queries/processors/Processor.js";

// 数据库配置接口
export interface DatabaseConfig {
    driver: 'mysql' | 'postgres' | 'postgresql' | 'sqlite';
    host?: string;
    username?: string;
    password?: string;
    database?: string;
    port?: number;
    charset?: string;
    filename?: string; // SQLite
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

// 连接池配置接口
export interface PoolConfig {
    min?: number;
    max?: number;
    acquire?: number;
    idle?: number;
}

// SSL配置接口
export interface SSLConfig {
    require?: boolean;
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
}

class Database {
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
                driver: driver as 'mysql' | 'postgres' | 'postgresql' | 'sqlite',
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
                throw new Error(`Database name is required for ${config.driver}`);
            }
        } else {
            if (!config.filename && !config.database) {
                throw new Error("SQLite requires either 'filename' or 'database' field");
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
                const driverPackages: Record<string, string> = {
                    mysql: "mysql2",
                    postgres: "pg",
                    sqlite: "better-sqlite3 or sqlite3",
                };

                throw new Error(
                    `Database driver '${config.driver}' not found. Please install the required package:\n` +
                        `npm install ${driverPackages[config.driver] || config.driver}\n\n` +
                        `Available drivers: ${Object.keys(driverPackages).join(", ")}`,
                );
            }
            throw error;
        }

        // Create connection instance
        const connection = new Connection(config);

        try {
            await connection.connect();
        } catch (error: any) {
            throw new Error(
                `Failed to connect to ${config.driver} database: ${error.message}`,
            );
        }

        // Create and return query builder
        const builder = new Builder(connection);
        builder.setProcessor(new Processor());

        return builder;
    }

    /**
     * 创建查询构建器实例
     *
     * @param connection - 数据库连接实例
     * @returns 查询构建器实例
     */
    static createBuilder(connection: any): Builder {
        const builder = new Builder(connection);
        builder.setProcessor(new Processor());
        return builder;
    }

    /**
     * 创建事务
     *
     * @param config - 数据库配置
     * @returns 事务查询构建器
     */
    static async transaction(config: DatabaseConfig): Promise<Builder> {
        const builder = await Database.connect(config);
        return await builder.transaction();
    }

    /**
     * 执行原生SQL查询
     *
     * @param config - 数据库配置
     * @param sql - SQL语句
     * @param bindings - 绑定参数
     * @returns 查询结果
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