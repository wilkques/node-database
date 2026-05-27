/**
 * Database Error Classes
 *
 * Standardized error types for database operations with detailed context
 * and error categorization for better debugging and error handling.
 *
 * @since 1.0.0
 */

/**
 * Base database error class
 *
 * Provides structured error information with context about the database
 * operation that failed. All database-specific errors inherit from this class.
 */
export class DatabaseError extends Error {
  /** Error code for programmatic error handling */
  public readonly code: string;

  /** Database driver that generated the error */
  public readonly driver?: string;

  /** SQL query that caused the error (if applicable) */
  public readonly sql?: string;

  /** Parameter bindings used in the query (if applicable) */
  public readonly bindings?: any[];

  /** Additional context about the error */
  public readonly context?: Record<string, any>;

  /** Original error that caused this database error */
  public readonly originalError?: Error;

  constructor(
    message: string,
    options: {
      code?: string;
      driver?: string;
      sql?: string;
      bindings?: any[];
      context?: Record<string, any>;
      originalError?: Error;
    } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || "DATABASE_ERROR";
    this.driver = options.driver;
    this.sql = options.sql;
    this.bindings = options.bindings;
    this.context = options.context;
    this.originalError = options.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a formatted error message with context
   */
  toString(): string {
    let message = `${this.name}: ${this.message}`;

    if (this.code !== "DATABASE_ERROR") {
      message += ` (${this.code})`;
    }

    if (this.driver) {
      message += ` [${this.driver}]`;
    }

    if (this.sql) {
      message += `\nSQL: ${this.sql}`;
    }

    if (this.bindings && this.bindings.length > 0) {
      message += `\nBindings: ${JSON.stringify(this.bindings)}`;
    }

    if (this.originalError) {
      message += `\nCaused by: ${this.originalError.message}`;
    }

    return message;
  }
}

/**
 * Connection-related error
 *
 * Thrown when database connection establishment or management fails.
 */
export class ConnectionError extends DatabaseError {
  constructor(
    message: string,
    options: {
      driver?: string;
      host?: string;
      database?: string;
      originalError?: Error;
      context?: Record<string, any>;
    } = {},
  ) {
    super(message, {
      code: "CONNECTION_ERROR",
      driver: options.driver,
      originalError: options.originalError,
      context: {
        host: options.host,
        database: options.database,
        ...options.context,
      },
    });
  }
}

/**
 * Query execution error
 *
 * Thrown when SQL query execution fails due to syntax, constraint violations,
 * or other database-related issues.
 */
export class QueryError extends DatabaseError {
  constructor(
    message: string,
    options: {
      driver?: string;
      sql?: string;
      bindings?: any[];
      originalError?: Error;
      context?: Record<string, any>;
    } = {},
  ) {
    super(message, {
      code: "QUERY_ERROR",
      driver: options.driver,
      sql: options.sql,
      bindings: options.bindings,
      originalError: options.originalError,
      context: options.context,
    });
  }
}

/**
 * Configuration error
 *
 * Thrown when database configuration is invalid or incomplete.
 */
export class ConfigurationError extends DatabaseError {
  constructor(
    message: string,
    options: {
      driver?: string;
      originalError?: Error;
      context?: Record<string, any>;
    } = {},
  ) {
    super(message, {
      code: "CONFIGURATION_ERROR",
      driver: options.driver,
      originalError: options.originalError,
      context: options.context,
    });
  }
}

/**
 * Transaction error
 *
 * Thrown when transaction operations (begin, commit, rollback) fail.
 */
export class TransactionError extends DatabaseError {
  constructor(
    message: string,
    options: {
      driver?: string;
      operation?: "begin" | "commit" | "rollback";
      originalError?: Error;
      context?: Record<string, any>;
    } = {},
  ) {
    super(message, {
      code: "TRANSACTION_ERROR",
      driver: options.driver,
      originalError: options.originalError,
      context: {
        operation: options.operation,
        ...options.context,
      },
    });
  }
}

/**
 * Driver not found error
 *
 * Thrown when the specified database driver is not installed or not found.
 */
export class DriverNotFoundError extends DatabaseError {
  constructor(driver: string, availableDrivers: string[] = []) {
    const driverPackages: Record<string, string> = {
      mysql: "mysql2",
      postgres: "pg",
      sqlite: "better-sqlite3 or sqlite3",
    };

    const installCommand = driverPackages[driver] || driver;
    const message = `Database driver '${driver}' not found. Please install the required package:\nnpm install ${installCommand}\n\nAvailable drivers: ${availableDrivers.join(", ")}`;

    super(message, {
      code: "DRIVER_NOT_FOUND",
      driver,
      context: {
        requiredPackage: installCommand,
        availableDrivers,
      },
    });
  }
}

/**
 * Validation error
 *
 * Thrown when query parameters or configuration values fail validation.
 */
export class ValidationError extends DatabaseError {
  constructor(
    message: string,
    options: {
      field?: string;
      value?: any;
      expectedType?: string;
      context?: Record<string, any>;
    } = {},
  ) {
    super(message, {
      code: "VALIDATION_ERROR",
      context: {
        field: options.field,
        value: options.value,
        expectedType: options.expectedType,
        ...options.context,
      },
    });
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class DatabaseErrorFactory {
  /**
   * Create an appropriate error from a generic error
   */
  static fromError(
    error: any,
    context: {
      driver?: string;
      sql?: string;
      bindings?: any[];
      operation?: string;
    } = {},
  ): DatabaseError {
    if (error instanceof DatabaseError) {
      return error;
    }

    const message = error.message || "Unknown database error";
    const originalError =
      error instanceof Error ? error : new Error(String(error));

    // Detect error type from error code or message
    if (
      error.code === "MODULE_NOT_FOUND" ||
      (message.includes("driver") && message.includes("not found"))
    ) {
      return new DriverNotFoundError(context.driver || "unknown");
    }

    if (
      (error.code && error.code.startsWith("ECONNECT")) ||
      message.includes("connect")
    ) {
      return new ConnectionError(`Failed to connect: ${message}`, {
        driver: context.driver,
        originalError,
      });
    }

    if (message.includes("transaction")) {
      return new TransactionError(`Transaction failed: ${message}`, {
        driver: context.driver,
        operation: context.operation as any,
        originalError,
      });
    }

    if (context.sql) {
      return new QueryError(`Query failed: ${message}`, {
        driver: context.driver,
        sql: context.sql,
        bindings: context.bindings,
        originalError,
      });
    }

    return new DatabaseError(message, {
      driver: context.driver,
      originalError,
    });
  }
}
