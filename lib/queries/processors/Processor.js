/**
 * Processor - Result processing for database queries
 */

export default class Processor {
  /**
   * Process SELECT query results
   *
   * @param {Object} result - Raw query result from driver
   * @param {Array} columns - Selected columns
   * @returns {Array} Processed results
   */
  processSelect(result, columns = []) {
    if (!result.rows) {
      return [];
    }

    return result.rows.map((row) => this.processSelectRow(row, columns));
  }

  /**
   * Process a single SELECT result row
   *
   * @param {Object} row - Database row
   * @param {Array} columns - Selected columns
   * @returns {Object} Processed row
   */
  processSelectRow(row, columns = []) {
    // Convert database-specific types and handle special cases
    const processedRow = {};

    for (const [key, value] of Object.entries(row)) {
      processedRow[key] = this.processValue(value);
    }

    return processedRow;
  }

  /**
   * Process INSERT query results
   *
   * @param {Object} result - Raw query result from driver
   * @returns {Object} Processed insert result
   */
  processInsert(result) {
    return {
      insertId: result.insertId || result.lastInsertRowId || null,
      affectedRows:
        result.affectedRows || result.rowCount || result.changes || 0,
      success: true,
    };
  }

  /**
   * Process UPDATE query results
   *
   * @param {Object} result - Raw query result from driver
   * @returns {Object} Processed update result
   */
  processUpdate(result) {
    return {
      affectedRows:
        result.affectedRows || result.rowCount || result.changes || 0,
      success: true,
    };
  }

  /**
   * Process DELETE query results
   *
   * @param {Object} result - Raw query result from driver
   * @returns {Object} Processed delete result
   */
  processDelete(result) {
    return {
      affectedRows:
        result.affectedRows || result.rowCount || result.changes || 0,
      success: true,
    };
  }

  /**
   * Process individual values from database
   *
   * @param {any} value - Raw value from database
   * @returns {any} Processed value
   */
  processValue(value) {
    // Handle null values
    if (value === null || value === undefined) {
      return null;
    }

    // Handle boolean values
    if (typeof value === "boolean") {
      return value;
    }

    // Handle numeric values
    if (typeof value === "number") {
      return value;
    }

    // Handle string values
    if (typeof value === "string") {
      // Check if it's a JSON string
      if (this.isJsonString(value)) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }

      // Handle boolean strings from some databases
      if (value === "true" || value === "t" || value === "1") {
        // Only convert if it looks like a boolean field
        return value;
      }
      if (value === "false" || value === "f" || value === "0") {
        // Only convert if it looks like a boolean field
        return value;
      }

      return value;
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value;
    }

    // Handle Buffer objects (for binary data)
    if (Buffer.isBuffer(value)) {
      return value;
    }

    // Handle BigInt
    if (typeof value === "bigint") {
      // Convert to number if it fits, otherwise keep as string
      if (
        value <= Number.MAX_SAFE_INTEGER &&
        value >= Number.MIN_SAFE_INTEGER
      ) {
        return Number(value);
      }
      return value.toString();
    }

    // Return as-is for other types
    return value;
  }

  /**
   * Check if a string is valid JSON
   *
   * @param {string} str - String to check
   * @returns {boolean} True if valid JSON
   */
  isJsonString(str) {
    if (typeof str !== "string") {
      return false;
    }

    // Basic checks for JSON-like strings
    const trimmed = str.trim();
    if (
      !(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
      !(trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      return false;
    }

    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Process INSERT query and return the generated ID
   * PHP Builder compatibility method
   *
   * @param {Object} query - Query builder instance
   * @param {Object} values - Values to insert
   * @param {string} sequence - Optional sequence name (for PostgreSQL)
   * @returns {number|string} Generated ID
   */
  async processInsertGetId(query, values, sequence = null) {
    // Execute the INSERT query
    await query.insert(values);

    // Get the connection from builder
    const connection = query.getConnection();
    if (!connection) {
      throw new Error("No database connection available");
    }

    // Get last insert ID
    const id = connection.getLastInsertId
      ? connection.getLastInsertId(sequence)
      : (await connection.query("SELECT LAST_INSERT_ID() as id")).rows[0]?.id;

    // Convert string ID to number if applicable
    return typeof id === "string" && /^\d+$/.test(id) ? parseInt(id, 10) : id;
  }

  /**
   * Process database column metadata with PHP compatibility
   * Handles multiple database driver formats (MySQL, PostgreSQL, SQLite)
   *
   * @param {Array} fields - Database field metadata
   * @returns {Array} Processed column information
   */
  processColumns(fields = []) {
    if (!fields) {
      return [];
    }

    return fields.map((field) => {
      // Handle different database driver field formats
      // Use !== undefined to preserve false values for nullable
      const nullableValue =
        field.nullable !== undefined
          ? field.nullable
          : field.is_nullable !== undefined
            ? field.is_nullable
            : field.Null;

      const column = {
        name: field.name || field.column_name || field.Field,
        type: this.normalizeColumnType(
          field.type || field.data_type || field.Type,
        ),
        length: field.length || field.character_maximum_length || field.Length,
        nullable: this.parseNullable(nullableValue),
        default: field.default || field.column_default || field.Default,
      };

      // Additional MySQL-specific fields
      if (field.Key) {
        column.key = field.Key;
      }
      if (field.Extra) {
        column.extra = field.Extra;
      }

      return column;
    });
  }

  /**
   * Normalize column type names across different databases
   * Maps various type representations to standard types
   *
   * @param {string} type - Raw column type from database
   * @returns {string} Normalized type name
   */
  normalizeColumnType(type) {
    if (!type) {
      return "unknown";
    }

    const normalizedType = type.toLowerCase();

    // Extract base type (remove size specification like int(11))
    const baseType = normalizedType.split("(")[0].trim();

    // Map common type variations to standard types
    const typeMap = {
      int: "integer",
      int4: "integer",
      int8: "bigint",
      varchar: "string",
      text: "string",
      char: "string",
      bool: "boolean",
      boolean: "boolean",
      tinyint: "boolean",
    };

    // Return mapped type or original base type
    return typeMap[baseType] || baseType;
  }

  /**
   * Parse nullable field from different database formats
   * Handles MySQL (YES/NO), PostgreSQL (true/false), and boolean values
   *
   * @param {any} nullable - Nullable value from database metadata
   * @returns {boolean} True if field is nullable
   */
  parseNullable(nullable) {
    if (typeof nullable === "boolean") {
      return nullable;
    }

    if (typeof nullable === "string") {
      const lower = nullable.toLowerCase();
      return lower === "yes" || lower === "true";
    }

    // Default to true for null/undefined
    return true;
  }

  /**
   * Format results for specific output types
   *
   * @param {Array} results - Query results
   * @param {string} format - Output format (json, csv, etc.)
   * @returns {any} Formatted results
   */
  formatResults(results, format = "json") {
    switch (format.toLowerCase()) {
      case "json":
        return JSON.stringify(results, null, 2);

      case "csv":
        return this.toCsv(results);

      case "table":
        return this.toTable(results);

      default:
        return results;
    }
  }

  /**
   * Convert results to CSV format
   *
   * @param {Array} results - Query results
   * @returns {string} CSV formatted string
   */
  toCsv(results) {
    if (results.length === 0) {
      return "";
    }

    const headers = Object.keys(results[0]);
    const csvRows = [headers.join(",")];

    for (const row of results) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) {
          return "";
        }
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  /**
   * Convert results to table format
   *
   * @param {Array} results - Query results
   * @returns {string} Table formatted string
   */
  toTable(results) {
    if (results.length === 0) {
      return "No results found.";
    }

    const headers = Object.keys(results[0]);

    // Calculate column widths
    const widths = {};
    for (const header of headers) {
      widths[header] = Math.max(
        header.length,
        ...results.map((row) => String(row[header] || "").length),
      );
    }

    // Create header row
    const headerRow = headers.map((h) => h.padEnd(widths[h])).join(" | ");
    const separator = headers.map((h) => "-".repeat(widths[h])).join("-|-");

    // Create data rows
    const dataRows = results.map((row) => {
      return headers
        .map((h) => {
          const value =
            row[h] === null || row[h] === undefined ? "" : String(row[h]);
          return value.padEnd(widths[h]);
        })
        .join(" | ");
    });

    return [headerRow, separator, ...dataRows].join("\n");
  }

  /**
   * Process aggregation results
   *
   * @param {Object} result - Raw aggregation result
   * @param {string} func - Aggregate function name
   * @returns {number} Processed aggregate value
   */
  processAggregate(result, func = "count") {
    if (!result.rows || result.rows.length === 0) {
      return 0;
    }

    const row = result.rows[0];
    const value = row.aggregate || row[func] || Object.values(row)[0];

    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value) || 0;
  }
}
