# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-21

### Added
- Initial release of @wilkques/database query builder
- Support for MySQL, PostgreSQL, and SQLite databases
- Fluent query builder interface with method chaining
- JOIN operations with comprehensive syntax support:
  - Inner, Left, Right, Cross, and Full joins
  - Subquery joins with builder instances
  - Function-based join conditions
  - Backward compatibility with existing APIs
- CASE WHEN expressions with multiple syntax forms:
  - Simple CASE (column-based)
  - Searched CASE (condition-based) 
  - Function-based CASE with parameter binding
  - Subquery CASE expressions
- Database-specific grammar compilation:
  - MySQL with backtick column wrapping
  - PostgreSQL with double-quote wrapping
  - SQLite with square bracket wrapping
- Query result processors for type conversion
- Comprehensive test suite with 228 passing tests
- TypeScript definitions for full IDE support
- ES Module support with proper exports
- Performance optimized grammar compilation

### Features
- **Database Connection**: Unified interface for multiple database drivers
- **Query Builder**: Fluent interface for building SQL queries
- **JOIN Support**: Complete JOIN operations with multiple syntax options
- **CASE Expressions**: Full CASE WHEN support with multiple forms
- **Type Safety**: Full TypeScript definitions and type checking
- **Performance**: Optimized grammar compilation with sub-millisecond query building
- **Extensibility**: Modular architecture for adding new database support

### Dependencies
- Peer dependencies only for database drivers (mysql2, pg, sqlite3)
- Zero runtime dependencies for maximum compatibility
- Optional database drivers allow lightweight installations

### Documentation
- Complete API documentation
- TypeScript type definitions
- Comprehensive test examples
- Performance benchmarks included

[1.0.0]: https://github.com/wilkques/database/releases/tag/v1.0.0