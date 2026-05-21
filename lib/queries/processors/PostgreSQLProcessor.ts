/**
 * PostgreSQLProcessor - PostgreSQL-specific result processing
 */

import Processor from "./Processor.js";

export default class PostgreSQLProcessor extends Processor {
  /**
   * Process INSERT query results for PostgreSQL
   */
  processInsertResults(results: any, sequence?: string): any {
    if (!results) return null;

    // PostgreSQL typically returns the inserted row with RETURNING clause
    if (results.rows && results.rows.length > 0) {
      const row = results.rows[0];
      return {
        insertId: row.id || row[sequence || "id"] || null,
        affectedRows: results.rowCount || 1,
      };
    }

    return {
      insertId: null,
      affectedRows: results.rowCount || 1,
    };
  }

  /**
   * Process UPDATE query results for PostgreSQL
   */
  processUpdateResults(results: any): number {
    return results.rowCount || 0;
  }

  /**
   * Process DELETE query results for PostgreSQL
   */
  processDeleteResults(results: any): number {
    return results.rowCount || 0;
  }

  /**
   * Process column listing for PostgreSQL
   */
  processColumnListing(results: any): string[] {
    if (!results || !Array.isArray(results)) return [];

    return results
      .map((row: any) => row.column_name || row.columnname || row.attname)
      .filter(Boolean);
  }

  /**
   * Process PostgreSQL-specific data types
   */
  convertValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle PostgreSQL BIGINT (convert to string to avoid serialization issues)
    if (typeof value === "bigint") {
      return value.toString();
    }

    // Handle PostgreSQL arrays
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    // Handle PostgreSQL JSON/JSONB
    if (typeof value === "object" && value.constructor === Object) {
      // Check if this is a JSON serialization context
      try {
        JSON.stringify(value);
        return JSON.stringify(value);
      } catch (error) {
        // If we can't serialize it (e.g., has BigInt), convert BigInt values to strings first
        const sanitized = this.sanitizeForJson(value);
        return JSON.stringify(sanitized);
      }
    }

    // Handle PostgreSQL BOOLEAN
    if (typeof value === "boolean") {
      return value;
    }

    // Handle PostgreSQL DATE/TIMESTAMP
    if (value instanceof Date) {
      return value.toISOString();
    }

    return super.convertValue(value);
  }

  /**
   * Recursively sanitize object for JSON serialization
   */
  private sanitizeForJson(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "bigint") {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeForJson(item));
    }

    if (typeof obj === "object") {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeForJson(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Process PostgreSQL-specific value types
   */
  processValue(value: any, type?: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (!type) {
      return value;
    }

    const lowerType = type.toLowerCase();

    // PostgreSQL boolean handling
    if (lowerType.includes("boolean") || lowerType === "bool") {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        return value === "t" || value === "true" || value === "1";
      }
      return Boolean(value);
    }

    // PostgreSQL array handling
    if (lowerType.includes("[]")) {
      if (typeof value === "string" && value.startsWith("{")) {
        try {
          // Parse PostgreSQL array format {1,2,3} to ["1","2","3"]
          const arrayContent = value.slice(1, -1); // Remove { and }
          return arrayContent.split(",").map((item) => item.trim());
        } catch {
          return [value];
        }
      }
      return Array.isArray(value) ? value : [value];
    }

    // PostgreSQL numeric handling
    if (lowerType === "numeric" || lowerType === "decimal") {
      if (typeof value === "string") {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? value : parsed;
      }
      return value;
    }

    // PostgreSQL JSON/JSONB handling
    if (lowerType === "json" || lowerType === "jsonb") {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    }

    return super.processValue(value, type);
  }

  /**
   * Process PostgreSQL column metadata
   */
  processColumns(fields: any[]): any[] {
    if (!Array.isArray(fields)) return [];

    return fields.map((field: any) => {
      return {
        name: field.column_name || field.name,
        type: field.data_type || field.type, // Preserve original PostgreSQL types
        nullable: field.is_nullable === "YES",
        default: field.column_default,
        length: field.character_maximum_length || field.length,
        precision: field.numeric_precision || field.precision,
        scale: field.numeric_scale || field.scale,
        ordinal_position: field.ordinal_position,
      };
    });
  }

  /**
   * Process PostgreSQL COPY results
   */
  processCopy(results: any): any {
    return {
      rowsProcessed: results.rowCount || 0,
      success: true,
    };
  }

  /**
   * Process aggregate results with PostgreSQL specifics
   */
  processAggregate(results: any, column?: string): any {
    const rows = this.processSelectResults(results);

    if (rows.length === 0) return null;

    const row = rows[0];

    // PostgreSQL often returns aggregate results in lowercase
    const value =
      row[column || "aggregate"] ||
      (column ? row[column.toLowerCase()] : null) ||
      row.count ||
      row.sum ||
      row.avg ||
      row.max ||
      row.min ||
      Object.values(row)[0];

    // Convert BigInt to string for PostgreSQL
    return this.convertValue(value);
  }

  /**
   * Process INSERT operation results with PostgreSQL specifics
   */
  processInsert(results: any, sequence?: string): any {
    const insertResult = this.processInsertResults(results, sequence);
    return {
      ...insertResult,
      success: true,
      returning: results && results.rows ? results.rows : [],
    };
  }
}
