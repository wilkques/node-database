/**
 * SQLite Processor Tests
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import SQLiteProcessor from "../../dist/lib/queries/processors/SQLiteProcessor.js";

describe("SQLiteProcessor", () => {
  let processor;

  beforeEach(() => {
    processor = new SQLiteProcessor();
  });

  describe("processValue", () => {
    it("should process boolean values from integers", () => {
      expect(processor.processValue(1, "boolean")).toBe(true);
      expect(processor.processValue(0, "boolean")).toBe(false);
      expect(processor.processValue("1", "bool")).toBe(true);
      expect(processor.processValue("0", "bool")).toBe(false);
      expect(processor.processValue("true", "boolean")).toBe(true);
    });

    it("should process integer strings", () => {
      const result = processor.processValue("123", "int");
      expect(result).toBe(123);
    });

    it("should process float strings", () => {
      expect(processor.processValue("123.456", "real")).toBe(123.456);
      expect(processor.processValue("789.012", "float")).toBe(789.012);
      expect(processor.processValue("345.678", "double")).toBe(345.678);
    });

    it("should handle invalid number strings", () => {
      const result = processor.processValue("not_a_number", "int");
      expect(result).toBe("not_a_number");
    });

    it("should process JSON text values", () => {
      const jsonValue = '{"key": "value"}';
      const result = processor.processValue(jsonValue, "text");
      expect(result).toEqual({ key: "value" });
    });

    it("should process date/time values", () => {
      const dateValue = "2023-12-25 10:30:00";
      const result = processor.processValue(dateValue, "datetime");
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2023);
    });

    it("should handle null values", () => {
      expect(processor.processValue(null)).toBeNull();
      expect(processor.processValue(undefined)).toBeNull();
    });
  });

  describe("processInsert", () => {
    it("should process INSERT results with lastInsertRowId", () => {
      const mockResult = {
        lastInsertRowid: 42,
        changes: 1,
      };

      const result = processor.processInsert(mockResult);
      expect(result).toEqual({
        insertId: 42,
        affectedRows: 1,
        success: true,
      });
    });

    it("should handle different result properties", () => {
      const mockResult = {
        lastID: 123,
        changes: 1,
      };

      const result = processor.processInsert(mockResult);
      expect(result).toEqual({
        insertId: 123,
        affectedRows: 1,
        success: true,
      });
    });

    it("should handle lastID property", () => {
      const mockResult = {
        lastID: 99,
        changes: 1,
      };

      const result = processor.processInsert(mockResult);
      expect(result).toEqual({
        insertId: 99,
        affectedRows: 1,
        success: true,
      });
    });
  });

  describe("processUpdate", () => {
    it("should process UPDATE results", () => {
      const mockResult = {
        changes: 3,
      };

      const result = processor.processUpdate(mockResult);
      expect(result).toEqual({
        affectedRows: 3,
        success: true,
      });
    });
  });

  describe("processDelete", () => {
    it("should process DELETE results", () => {
      const mockResult = {
        changes: 2,
      };

      const result = processor.processDelete(mockResult);
      expect(result).toEqual({
        affectedRows: 2,
        success: true,
      });
    });
  });

  describe("processSelect", () => {
    it("should handle different result formats", () => {
      const mockResult1 = {
        rows: [{ id: 1, name: "test" }],
      };

      const mockResult2 = [{ id: 2, name: "test2" }];

      const result1 = processor.processSelect(mockResult1);
      const result2 = processor.processSelect(mockResult2);

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
    });
  });

  describe("processVacuum", () => {
    it("should process VACUUM results", () => {
      const result = processor.processVacuum({});
      expect(result).toEqual({
        success: true,
        message: "Database vacuum completed successfully",
      });
    });
  });

  describe("processAnalyze", () => {
    it("should process ANALYZE results", () => {
      const result = processor.processAnalyze({});
      expect(result).toEqual({
        success: true,
        message: "Database analyze completed successfully",
      });
    });
  });

  describe("processPragma", () => {
    it("should process PRAGMA query results", () => {
      const mockResult = {
        rows: [{ pragma_value: "WAL" }],
      };

      const result = processor.processPragma(mockResult);
      expect(result).toEqual({ pragma_value: "WAL" });
    });

    it("should handle PRAGMA command results", () => {
      const mockResult = {};

      const result = processor.processPragma(mockResult);
      expect(result).toEqual({
        success: true,
        message: "PRAGMA executed successfully",
      });
    });
  });
});
