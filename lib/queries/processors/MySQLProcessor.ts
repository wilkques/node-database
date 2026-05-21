/**
 * MySQLProcessor - MySQL-specific result processing
 */

import Processor from "./Processor.js";

export default class MySQLProcessor extends Processor {
  /**
   * Process INSERT query results for MySQL
   */
  processInsertResults(results: any, sequence?: string): any {
    if (!results) return null;

    return {
      insertId: results.insertId || 0,
      affectedRows: results.affectedRows || 1,
    };
  }

  /**
   * Process UPDATE query results for MySQL
   */
  processUpdateResults(results: any): number {
    return results.affectedRows || results.changedRows || 0;
  }

  /**
   * Process DELETE query results for MySQL
   */
  processDeleteResults(results: any): number {
    return results.affectedRows || 0;
  }

  /**
   * Process column listing for MySQL
   */
  processColumnListing(results: any): string[] {
    if (!results || !Array.isArray(results)) return [];

    return results
      .map((row: any) => row.Field || row.column_name || row.COLUMN_NAME)
      .filter(Boolean);
  }

  /**
   * Process MySQL-specific data types
   */
  convertValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }

    // Handle MySQL BIGINT as number
    if (typeof value === "bigint") {
      return Number(value);
    }

    // Handle MySQL DATE/DATETIME
    if (value instanceof Date) {
      return value.toISOString().slice(0, 19).replace("T", " ");
    }

    // Handle MySQL BOOLEAN (TINYINT)
    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    return super.convertValue(value);
  }

  /**
   * Process MySQL-specific value types
   */
  processValue(value: any, type?: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    if (!type) {
      return value;
    }

    const lowerType = type.toLowerCase();

    // MySQL TINYINT(1) as boolean
    if (lowerType === "tinyint(1)") {
      return value === 1 || value === "1";
    }

    // MySQL datetime handling
    if (lowerType.includes("datetime") || lowerType.includes("timestamp")) {
      return new Date(value);
    }

    // MySQL BIGINT handling
    if (lowerType.includes("bigint")) {
      return parseInt(value) || 0;
    }

    // MySQL JSON handling
    if (lowerType === "json") {
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
   * Process SELECT results with type conversion based on field metadata
   */
  processSelect(results: any, fields?: any[]): any[] {
    const rows = this.processSelectResults(results);

    // If no fields provided or empty array, try to get them from results
    let fieldInfo = fields;
    if (!fieldInfo || fieldInfo.length === 0) {
      fieldInfo = results.fields;
    }

    if (!fieldInfo || !Array.isArray(fieldInfo) || fieldInfo.length === 0) {
      return rows;
    }

    // Create a map of field names to types for efficient lookup
    const fieldTypes: { [key: string]: string } = {};
    fieldInfo.forEach((field: any) => {
      const fieldName = field.Field || field.name || field.column_name;
      const fieldType = field.Type || field.type || field.data_type;
      if (fieldName && fieldType) {
        fieldTypes[fieldName] = fieldType;
      }
    });

    // Apply type conversion to each row
    return rows.map((row: any) => {
      const convertedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        const fieldType = fieldTypes[key];
        if (fieldType) {
          convertedRow[key] = this.processValue(value, fieldType);
        } else {
          convertedRow[key] = value;
        }
      }
      return convertedRow;
    });
  }

  /**
   * Process MySQL column metadata
   */
  processColumns(fields: any[]): any[] {
    if (!Array.isArray(fields)) return [];

    return fields.map((field: any) => {
      return {
        name: field.Field || field.name,
        type: this.mapMySQLColumnType(field.Type || field.type),
        nullable: field.Null === "YES",
        default: field.Default,
        key: field.Key,
        extra: field.Extra,
      };
    });
  }

  /**
   * Map MySQL column types
   */
  private mapMySQLColumnType(type: string): string {
    if (!type) return "unknown";

    const lowerType = type.toLowerCase();

    if (lowerType.includes("tinyint(1)")) return "boolean";
    if (lowerType.includes("int")) return "integer";
    if (
      lowerType.includes("float") ||
      lowerType.includes("double") ||
      lowerType.includes("decimal")
    )
      return "float";
    if (lowerType.includes("datetime") || lowerType.includes("timestamp"))
      return "datetime";
    if (lowerType.includes("date")) return "date";
    if (lowerType.includes("time")) return "time";
    if (
      lowerType.includes("text") ||
      lowerType.includes("varchar") ||
      lowerType.includes("char")
    )
      return "string";
    if (lowerType.includes("json")) return "json";

    return "string";
  }
}
