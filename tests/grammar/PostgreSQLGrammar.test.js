/**
 * PostgreSQL Grammar Tests - Enhanced Features
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import PostgreSQLGrammar from "../../lib/queries/grammar/PostgreSQL.js";

describe("PostgreSQLGrammar - Enhanced Features", () => {
  let grammar;

  beforeEach(() => {
    grammar = new PostgreSQLGrammar();
  });

  describe("wrapValue", () => {
    it("should wrap values with double quotes", () => {
      expect(grammar.wrapValue("column_name")).toBe('"column_name"');
      expect(grammar.wrapValue("*")).toBe("*");
    });

    it("should escape double quotes in values", () => {
      expect(grammar.wrapValue('column"with"quotes')).toBe(
        '"column""with""quotes"',
      );
    });
  });

  describe("compileLimit", () => {
    it("should compile LIMIT clause", () => {
      const mockQuery = {};
      expect(grammar.compileLimit(mockQuery, 10)).toBe("LIMIT 10");
      expect(grammar.compileLimit(mockQuery, null)).toBe("");
    });
  });

  describe("compileOffset", () => {
    it("should compile OFFSET clause", () => {
      const mockQuery = {};
      expect(grammar.compileOffset(mockQuery, 5)).toBe("OFFSET 5");
      expect(grammar.compileOffset(mockQuery, null)).toBe("");
    });
  });

  describe("compileReturning", () => {
    it("should compile RETURNING clause", () => {
      const mockQuery = {};
      const columns = ["id", "name", "created_at"];

      const result = grammar.compileReturning(mockQuery, columns);
      expect(result).toBe('RETURNING "id", "name", "created_at"');
    });

    it("should handle empty columns", () => {
      const mockQuery = {};
      expect(grammar.compileReturning(mockQuery, [])).toBe("");
      expect(grammar.compileReturning(mockQuery, null)).toBe("");
    });

    it("should handle wildcard", () => {
      const mockQuery = {};
      const result = grammar.compileReturning(mockQuery, ["*"]);
      expect(result).toBe("RETURNING *");
    });
  });

  describe("compileInsertReturning", () => {
    it("should compile INSERT with RETURNING", () => {
      const mockQuery = {
        components: {
          from: { table: "users" },
          columns: ["name", "email"],
        },
      };

      // Mock compileInsert method
      grammar.compileInsert = jest.fn(
        () => 'INSERT INTO "users" ("name", "email") VALUES (?, ?)',
      );
      grammar.wrapColumn = jest.fn((col) => `"${col}"`);

      const result = grammar.compileInsertReturning(mockQuery, {}, ["id"]);
      expect(result).toBe(
        'INSERT INTO "users" ("name", "email") VALUES (?, ?) RETURNING "id"',
      );
    });
  });

  describe("jsonExtract", () => {
    it("should generate JSON extraction expressions", () => {
      expect(grammar.jsonExtract("data", "user.name")).toBe(
        "\"data\" -> 'user.name'",
      );
      expect(grammar.jsonExtract("config", "settings", "->>")).toBe(
        "\"config\" ->> 'settings'",
      );
    });
  });
});
