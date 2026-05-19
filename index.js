/**
 * Database - Modern Node.js Query Builder
 *
 * Inspired by wilkques/database PHP package
 * Provides fluent interface for database operations
 */

import Database from "./lib/Database.js";

export default Database;
export { Database };

// Named exports for convenience
export { default as Builder } from "./lib/queries/Builder.js";
export { default as Connection } from "./lib/connections/Connection.js";
