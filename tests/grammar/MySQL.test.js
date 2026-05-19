import { describe, test, expect, beforeEach } from "@jest/globals";
import MySQLGrammar from "../../lib/queries/grammar/MySQL.js";
import Builder from "../../lib/queries/Builder.js";

describe("MySQLGrammar", () => {
  let grammar;
  let builder;

  beforeEach(() => {
    grammar = new MySQLGrammar();
    builder = new Builder(null, grammar);
    // Initialize components structure for the builder
    builder.components = {
      columns: [],
      from: { type: "table", table: "users" },
      joins: [],
      wheres: [],
      groups: [],
      havings: [],
      orders: [],
      limit: null,
      offset: null,
      unions: [],
    };
  });

  describe("wrapValue", () => {
    test("should wrap simple column with backticks", () => {
      expect(grammar.wrapValue("column")).toBe("`column`");
    });

    test("should wrap reserved keywords with backticks", () => {
      expect(grammar.wrapValue("order")).toBe("`order`");
      expect(grammar.wrapValue("select")).toBe("`select`");
    });

    test("should return asterisk unchanged", () => {
      expect(grammar.wrapValue("*")).toBe("*");
    });

    test("should escape backticks in value", () => {
      expect(grammar.wrapValue("col`umn")).toBe("`col``umn`");
    });

    test("should handle multiple backticks", () => {
      expect(grammar.wrapValue("col``umn")).toBe("`col````umn`");
    });

    test("should wrap table.column format", () => {
      const result = grammar.wrapColumn("users.id");
      expect(result).toBe("`users`.`id`");
    });
  });

  describe("compileLimit", () => {
    test("should return empty string when limit and offset are null", () => {
      builder.components.limit = null;
      builder.components.offset = null;
      const result = grammar.compileLimit(builder, null);
      expect(result).toBe("");
    });

    test("should compile LIMIT with numeric value", () => {
      const result = grammar.compileLimit(builder, 10);
      expect(result).toBe("LIMIT 10");
    });

    test("should compile LIMIT with OFFSET", () => {
      builder.components.offset = 5;
      const result = grammar.compileLimit(builder, 10);
      expect(result).toBe("LIMIT 10 OFFSET 5");
    });

    test("should handle offset without limit", () => {
      builder.components.limit = null;
      builder.components.offset = 20;
      const result = grammar.compileLimit(builder, null);
      expect(result).toContain("LIMIT");
      expect(result).toContain("OFFSET 20");
    });

    test("should use MySQL max limit for offset without explicit limit", () => {
      builder.components.offset = 100;
      const result = grammar.compileLimit(builder, null);
      expect(result).toBe("LIMIT 18446744073709551615 OFFSET 100");
    });

    test("should compile with zero limit", () => {
      const result = grammar.compileLimit(builder, 0);
      expect(result).toBe("LIMIT 0");
    });
  });

  describe("compileOffset", () => {
    test("should return empty string (handled in LIMIT)", () => {
      const result = grammar.compileOffset(builder, 5);
      expect(result).toBe("");
    });
  });

  describe("compileInsertOnDuplicateKeyUpdate", () => {
    test("should compile INSERT with ON DUPLICATE KEY UPDATE", () => {
      const data = { name: "John", email: "john@test.com" };
      const updateData = { name: true, email: true };
      const result = grammar.compileInsertOnDuplicateKeyUpdate(
        builder,
        data,
        updateData,
      );

      expect(result).toContain("INSERT INTO");
      expect(result).toContain("ON DUPLICATE KEY UPDATE");
      expect(result).toContain("VALUES");
    });

    test("should wrap columns with backticks in UPDATE clause", () => {
      const data = { id: 1, name: "John" };
      const updateData = { name: true, order: true };
      const result = grammar.compileInsertOnDuplicateKeyUpdate(
        builder,
        data,
        updateData,
      );

      expect(result).toContain("`name`");
      expect(result).toContain("`order`");
      expect(result).toContain("VALUES");
    });

    test("should handle multiple update fields", () => {
      const data = { id: 1, name: "John", email: "john@test.com" };
      const updateData = { name: true, email: true };
      const result = grammar.compileInsertOnDuplicateKeyUpdate(
        builder,
        data,
        updateData,
      );

      expect(result).toContain("ON DUPLICATE KEY UPDATE");
      const updatePart = result.split("ON DUPLICATE KEY UPDATE")[1];
      expect(updatePart).toContain("`name` = VALUES(`name`)");
      expect(updatePart).toContain("`email` = VALUES(`email`)");
    });

    test("should not add UPDATE clause if updateData is empty", () => {
      const data = { id: 1, name: "John" };
      const updateData = {};
      const result = grammar.compileInsertOnDuplicateKeyUpdate(
        builder,
        data,
        updateData,
      );

      expect(result).toContain("INSERT INTO");
      expect(result).not.toContain("ON DUPLICATE KEY UPDATE");
    });

    test("should not add UPDATE clause if updateData is null", () => {
      const data = { id: 1, name: "John" };
      const result = grammar.compileInsertOnDuplicateKeyUpdate(
        builder,
        data,
        null,
      );

      expect(result).toContain("INSERT INTO");
      expect(result).not.toContain("ON DUPLICATE KEY UPDATE");
    });
  });

  describe("lockForUpdate", () => {
    test("should return FOR UPDATE lock string", () => {
      expect(grammar.lockForUpdate()).toBe("FOR UPDATE");
    });
  });

  describe("sharedLock", () => {
    test("should return LOCK IN SHARE MODE lock string", () => {
      expect(grammar.sharedLock()).toBe("LOCK IN SHARE MODE");
    });
  });

  describe("compileInsertIgnore", () => {
    test("should compile INSERT IGNORE statement", () => {
      const data = { id: 1, name: "John" };
      const result = grammar.compileInsertIgnore(builder, data);

      expect(result).toContain("INSERT IGNORE INTO");
      expect(result).not.toContain("INSERT INTO `");
    });
  });

  describe("compileReplace", () => {
    test("should compile REPLACE statement", () => {
      const data = { id: 1, name: "John" };
      const result = grammar.compileReplace(builder, data);

      expect(result).toContain("REPLACE INTO");
      expect(result).not.toContain("INSERT INTO");
    });
  });

  describe("compileUpdateWithJoin", () => {
    test("should compile UPDATE with JOIN clauses", () => {
      builder.components.joins = [
        {
          type: "inner",
          table: "orders",
          first: "users.id",
          second: "orders.user_id",
          operator: "=",
        },
      ];
      const data = { status: "active" };
      const result = grammar.compileUpdateWithJoin(builder, data);

      expect(result).toContain("UPDATE");
      expect(result).toContain("JOIN");
      expect(result).toContain("SET");
    });
  });

  describe("compileDeleteWithJoin", () => {
    test("should compile DELETE with JOIN clauses", () => {
      builder.components.joins = [
        {
          type: "inner",
          table: "orders",
          first: "users.id",
          second: "orders.user_id",
          operator: "=",
        },
      ];
      const result = grammar.compileDeleteWithJoin(builder);

      expect(result).toContain("DELETE");
      expect(result).toContain("FROM");
      expect(result).toContain("JOIN");
    });
  });

  describe("compileTruncate", () => {
    test("should compile TRUNCATE statement", () => {
      const result = grammar.compileTruncate(builder);

      expect(result).toBe("TRUNCATE TABLE `users`");
    });
  });

  describe("compileSharedLock", () => {
    test("should compile SELECT with LOCK IN SHARE MODE", () => {
      builder.components.columns = [{ type: "column", column: "id" }];
      const result = grammar.compileSharedLock(builder);

      expect(result).toContain("LOCK IN SHARE MODE");
      expect(result).toContain("SELECT");
    });
  });

  describe("compileExclusiveLock", () => {
    test("should compile SELECT with FOR UPDATE", () => {
      builder.components.columns = [{ type: "column", column: "id" }];
      const result = grammar.compileExclusiveLock(builder);

      expect(result).toContain("FOR UPDATE");
      expect(result).toContain("SELECT");
    });
  });

  describe("dateFormat", () => {
    test("should format date with MySQL DATE_FORMAT function", () => {
      const result = grammar.dateFormat("%Y-%m-%d", "created_at");

      expect(result).toBe("DATE_FORMAT(`created_at`, '%Y-%m-%d')");
    });

    test("should wrap column name with backticks", () => {
      const result = grammar.dateFormat("%Y", "order_date");

      expect(result).toContain("`order_date`");
    });
  });
});
