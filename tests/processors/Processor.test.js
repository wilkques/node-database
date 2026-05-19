import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import Processor from "../../dist/lib/queries/processors/Processor.js";
import Builder from "../../dist/lib/queries/Builder.js";

describe("Processor", () => {
  let processor;
  let mockConnection;

  beforeEach(() => {
    processor = new Processor();
    mockConnection = {
      query: jest.fn(),
      getLastInsertId: jest.fn(),
    };
  });

  describe("processInsertGetId", () => {
    test("should process INSERT and return ID", async () => {
      const mockGetLastInsertId = jest.fn().mockReturnValue(123);
      const mockBuilder = {
        insert: jest.fn().mockResolvedValue({ insertId: 123 }),
        getConnection: jest.fn().mockReturnValue({
          getLastInsertId: mockGetLastInsertId,
        }),
      };

      const id = await processor.processInsertGetId(mockBuilder, {
        name: "Test",
      });
      expect(id).toBe(123);
      expect(mockBuilder.insert).toHaveBeenCalledWith({ name: "Test" });
    });

    test("should handle sequence parameter", async () => {
      const mockGetLastInsertId = jest.fn().mockReturnValue(456);
      const mockBuilder = {
        insert: jest.fn().mockResolvedValue({}),
        getConnection: jest.fn().mockReturnValue({
          getLastInsertId: mockGetLastInsertId,
        }),
      };

      const id = await processor.processInsertGetId(
        mockBuilder,
        { name: "Test" },
        "users_id_seq",
      );
      expect(mockGetLastInsertId).toHaveBeenCalledWith("users_id_seq");
      expect(id).toBe(456);
    });

    test("should handle string ID and convert to number", async () => {
      const mockGetLastInsertId = jest.fn().mockReturnValue("789");
      const mockBuilder = {
        insert: jest.fn().mockResolvedValue({}),
        getConnection: jest.fn().mockReturnValue({
          getLastInsertId: mockGetLastInsertId,
        }),
      };

      const id = await processor.processInsertGetId(mockBuilder, {
        name: "Test",
      });
      expect(typeof id).toBe("number");
      expect(id).toBe(789);
    });

    test("should throw error if no connection", async () => {
      const mockBuilder = {
        insert: jest.fn().mockResolvedValue({}),
        getConnection: jest.fn().mockReturnValue(null),
      };

      await expect(
        processor.processInsertGetId(mockBuilder, { name: "Test" }),
      ).rejects.toThrow("No database connection available");
    });
  });

  describe("processColumns", () => {
    test("should process column metadata", () => {
      const fields = [
        { name: "id", type: "integer", nullable: false },
        { name: "name", type: "varchar", nullable: true },
      ];

      const columns = processor.processColumns(fields);
      expect(columns).toEqual([
        {
          name: "id",
          type: "integer",
          length: undefined,
          nullable: false,
          default: undefined,
        },
        {
          name: "name",
          type: "string",
          length: undefined,
          nullable: true,
          default: undefined,
        },
      ]);
    });

    test("should handle MySQL field format", () => {
      const fields = [
        {
          Field: "id",
          Type: "int(11)",
          Null: "NO",
          Key: "PRI",
          Extra: "auto_increment",
        },
      ];

      const columns = processor.processColumns(fields);
      expect(columns[0].name).toBe("id");
      expect(columns[0].type).toBe("integer");
      expect(columns[0].nullable).toBe(false);
      expect(columns[0].key).toBe("PRI");
      expect(columns[0].extra).toBe("auto_increment");
    });

    test("should handle PostgreSQL field format", () => {
      const fields = [
        {
          column_name: "email",
          data_type: "character varying",
          character_maximum_length: 255,
          is_nullable: "YES",
        },
      ];

      const columns = processor.processColumns(fields);
      expect(columns[0].name).toBe("email");
      expect(columns[0].type).toBe("character varying");
      expect(columns[0].length).toBe(255);
      expect(columns[0].nullable).toBe(true);
    });

    test("should handle null fields array", () => {
      const columns = processor.processColumns(null);
      expect(columns).toEqual([]);
    });

    test("should handle empty fields array", () => {
      const columns = processor.processColumns([]);
      expect(columns).toEqual([]);
    });
  });

  describe("normalizeColumnType", () => {
    test("should normalize integer types", () => {
      expect(processor.normalizeColumnType("int")).toBe("integer");
      expect(processor.normalizeColumnType("int(11)")).toBe("integer");
      expect(processor.normalizeColumnType("INT")).toBe("integer");
      expect(processor.normalizeColumnType("int4")).toBe("integer");
    });

    test("should normalize bigint types", () => {
      expect(processor.normalizeColumnType("int8")).toBe("bigint");
      expect(processor.normalizeColumnType("bigint")).toBe("bigint");
    });

    test("should normalize string types", () => {
      expect(processor.normalizeColumnType("varchar")).toBe("string");
      expect(processor.normalizeColumnType("varchar(255)")).toBe("string");
      expect(processor.normalizeColumnType("text")).toBe("string");
      expect(processor.normalizeColumnType("char")).toBe("string");
      expect(processor.normalizeColumnType("character varying")).toBe(
        "character varying",
      );
    });

    test("should normalize boolean types", () => {
      expect(processor.normalizeColumnType("bool")).toBe("boolean");
      expect(processor.normalizeColumnType("boolean")).toBe("boolean");
      expect(processor.normalizeColumnType("tinyint(1)")).toBe("boolean");
    });

    test("should handle unknown types", () => {
      expect(processor.normalizeColumnType("custom_type")).toBe("custom_type");
      expect(processor.normalizeColumnType("")).toBe("unknown");
      expect(processor.normalizeColumnType(null)).toBe("unknown");
    });

    test("should be case insensitive", () => {
      expect(processor.normalizeColumnType("VARCHAR(100)")).toBe("string");
      expect(processor.normalizeColumnType("TEXT")).toBe("string");
      expect(processor.normalizeColumnType("BOOLEAN")).toBe("boolean");
    });
  });

  describe("parseNullable", () => {
    test("should handle boolean values", () => {
      expect(processor.parseNullable(true)).toBe(true);
      expect(processor.parseNullable(false)).toBe(false);
    });

    test("should handle string values YES/NO (MySQL)", () => {
      expect(processor.parseNullable("YES")).toBe(true);
      expect(processor.parseNullable("NO")).toBe(false);
      expect(processor.parseNullable("yes")).toBe(true);
      expect(processor.parseNullable("no")).toBe(false);
    });

    test("should handle string values true/false", () => {
      expect(processor.parseNullable("true")).toBe(true);
      expect(processor.parseNullable("false")).toBe(false);
      expect(processor.parseNullable("TRUE")).toBe(true);
      expect(processor.parseNullable("FALSE")).toBe(false);
    });

    test("should default to true for null/undefined values", () => {
      expect(processor.parseNullable(null)).toBe(true);
      expect(processor.parseNullable(undefined)).toBe(true);
    });

    test("should return false for unknown string values", () => {
      expect(processor.parseNullable("unknown")).toBe(false); // default is false for unknown string
    });

    test("should handle numeric values", () => {
      expect(processor.parseNullable(1)).toBe(true); // truthy but not boolean
      expect(processor.parseNullable(0)).toBe(true); // falsy but not boolean
    });
  });
});
