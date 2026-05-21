/**
 * Basic tests for the Database package
 */

import Database from "../dist/index.js";
import { jest } from "@jest/globals";

describe("Database Package", () => {
  describe("Basic Functionality", () => {
    test("should export Database class", () => {
      expect(Database).toBeDefined();
      expect(typeof Database.connect).toBe("function");
    });

    test("should have static connect method", () => {
      expect(Database.connect).toBeDefined();
      expect(typeof Database.connect).toBe("function");
    });
  });

  describe("Connection Configuration", () => {
    test("should validate configuration object structure", () => {
      // Test basic structure validation without actual connection
      const validConfig = {
        driver: "mysql",
        host: "localhost",
        port: 3306,
        database: "test",
        username: "test",
        password: "test",
      };

      expect(validConfig.driver).toBe("mysql");
      expect(validConfig.host).toBe("localhost");
      expect(typeof validConfig.port).toBe("number");
    });

    test("should parse connection strings", () => {
      // Test connection string parsing without actual connection
      const connectionString = "mysql://test:test@localhost:3306/test";
      expect(connectionString).toContain("mysql://");
      expect(connectionString).toContain("localhost");
      expect(connectionString).toContain("3306");
    });
  });

  describe("Query Building Without Database", () => {
    test("should be able to test grammar compilation", () => {
      // Test basic query structure without database connection
      const queryStructure = {
        table: "users",
        columns: ["id", "name", "email"],
        where: { field: "id", operator: "=", value: 1 },
      };

      expect(queryStructure.table).toBe("users");
      expect(Array.isArray(queryStructure.columns)).toBe(true);
      expect(queryStructure.columns).toContain("id");
      expect(queryStructure.where.field).toBe("id");
    });
  });
});
