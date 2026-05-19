/**
 * PostgreSQL Processor - PostgreSQL-specific result processing
 */

import Processor from "./Processor.js";

export default class PostgreSQLProcessor extends Processor {
  /**
   * Process PostgreSQL INSERT with RETURNING clause
   *
   * @param {Object} query - Query builder instance
   * @param {Object} values - Values to insert
   * @param {string} sequence - Optional sequence name (PostgreSQL-specific)
   * @returns {number|string} Generated ID
   */
  async processInsertGetId(query, values, sequence = null) {
    // Use RETURNING clause for PostgreSQL
    const originalReturning = query.components.returning;
    query.returning("id");

    try {
      const result = await query.insert(values);
      const id = result.rows && result.rows[0] ? result.rows[0].id : null;
      return id;
    } finally {
      // Restore original returning clause
      query.components.returning = originalReturning;
    }
  }

  /**
   * Process PostgreSQL-specific value types
   *
   * @param {any} value - Raw value from database
   * @param {string} type - Column type (optional)
   * @returns {any} Processed value
   */
  processValue(value, type = "") {
    if (value === null || value === undefined) {
      return null;
    }

    const lowerType = type.toLowerCase();

    // Handle PostgreSQL arrays
    if (lowerType.includes("[]") && typeof value === "string") {
      try {
        // Parse PostgreSQL array format: {1,2,3}
        return value
          .replace(/[{}]/g, "")
          .split(",")
          .map((v) => v.trim());
      } catch {
        return value;
      }
    }

    // Handle PostgreSQL JSON/JSONB
    if (
      (lowerType === "json" || lowerType === "jsonb") &&
      typeof value === "string"
    ) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    // Handle UUID
    if (lowerType === "uuid") {
      return value; // Keep as string
    }

    // Handle PostgreSQL boolean types
    if (lowerType === "boolean" || lowerType === "bool") {
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        const lower = value.toLowerCase();
        return lower === "t" || lower === "true" || lower === "1";
      }
      return Boolean(value);
    }

    // Handle PostgreSQL numeric types
    if (lowerType.includes("numeric") || lowerType.includes("decimal")) {
      return typeof value === "string" ? parseFloat(value) : value;
    }

    // Handle PostgreSQL timestamp with timezone
    if (
      lowerType.includes("timestamptz") ||
      lowerType.includes("timestamp with time zone")
    ) {
      return typeof value === "string" ? new Date(value) : value;
    }

    return super.processValue(value);
  }

  /**
   * Process PostgreSQL SELECT results with special handling
   *
   * @param {Object} result - Raw query result from PostgreSQL driver
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
   * Process PostgreSQL INSERT results
   *
   * @param {Object} result - Raw query result from PostgreSQL driver
   * @returns {Object} Processed insert result
   */
  processInsert(result) {
    return {
      insertId: result.rows && result.rows[0] ? result.rows[0].id : null,
      affectedRows: result.rowCount || 0,
      success: true,
      returning: result.rows || [],
    };
  }

  /**
   * Process PostgreSQL UPDATE results
   *
   * @param {Object} result - Raw query result from PostgreSQL driver
   * @returns {Object} Processed update result
   */
  processUpdate(result) {
    return {
      affectedRows: result.rowCount || 0,
      success: true,
      returning: result.rows || [],
    };
  }

  /**
   * Process PostgreSQL DELETE results
   *
   * @param {Object} result - Raw query result from PostgreSQL driver
   * @returns {Object} Processed delete result
   */
  processDelete(result) {
    return {
      affectedRows: result.rowCount || 0,
      success: true,
      returning: result.rows || [],
    };
  }

  /**
   * Process PostgreSQL aggregation results
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

    // PostgreSQL returns bigint for COUNT, convert to number
    if (typeof value === "bigint") {
      return Number(value);
    }

    return Number(value) || 0;
  }

  /**
   * Process PostgreSQL COPY results
   *
   * @param {Object} result - Raw COPY result
   * @returns {Object} Processed copy result
   */
  processCopy(result) {
    return {
      rowsProcessed: result.rowCount || 0,
      success: true,
    };
  }
}
