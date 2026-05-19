/**
 * Database - Modern Node.js Query Builder
 *
 * Inspired by wilkques/database PHP package
 * Provides fluent interface for database operations
 */

import Database from './lib/Database.js';
import Builder from './lib/queries/Builder.js';
import Connection from './lib/connections/Connection.js';

export default Database;
export { Database, Builder, Connection };

// Type exports
export type { DatabaseConfig } from './lib/Database.js';
export type { QueryBuilder } from './lib/queries/Builder.js';
export type { ConnectionInterface } from './lib/connections/Connection.js';