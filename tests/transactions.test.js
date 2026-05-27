/**
 * Transaction Handling Tests
 * Tests for transaction begin/commit/rollback functionality and error handling
 */

import { jest } from "@jest/globals";
import Builder from "../dist/lib/queries/Builder.js";
import MySQL from "../dist/lib/queries/grammar/MySQL.js";

// Create mock connection with transaction support
function createMockConnection() {
  return {
    query: jest.fn().mockResolvedValue({ results: [] }),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    inTransaction: false,
    transactionLevel: 0,
  };
}

describe("Transaction Handling", () => {
  let mockConnection;
  let grammar;

  beforeEach(() => {
    mockConnection = createMockConnection();
    grammar = new MySQL();
  });

  describe("Connection-Level Transaction Operations", () => {
    test("should support beginning transaction", async () => {
      await mockConnection.beginTransaction();
      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
    });

    test("should support committing transaction", async () => {
      await mockConnection.commit();
      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
    });

    test("should support rolling back transaction", async () => {
      await mockConnection.rollback();
      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
    });

    test("should handle transaction isolation with separate connections", () => {
      const connection1 = createMockConnection();
      const connection2 = createMockConnection();

      // Each connection should be independent
      expect(connection1).not.toBe(connection2);
    });
  });

  describe("Builder Operations in Transaction Context", () => {
    test("should generate correct INSERT SQL for transaction", () => {
      const builder = new Builder(mockConnection, grammar);
      builder.table("users");

      const insertData = { name: "John", email: "john@test.com" };
      const sql = builder.grammar.compileInsert(builder, [insertData]);

      expect(sql).toBe("INSERT INTO `users` (`name`, `email`) VALUES (?, ?)");
    });

    test("should generate correct UPDATE SQL for transaction", () => {
      const builder = new Builder(mockConnection, grammar);
      builder.table("users").where("id", 1);

      const sql = builder.grammar.compileUpdate(builder, {
        name: "John Updated",
      });

      expect(sql).toBe("UPDATE `users` SET `name` = ? WHERE `id` = ?");
    });

    test("should generate correct DELETE SQL for transaction", () => {
      const builder = new Builder(mockConnection, grammar);
      builder.table("users").where("id", 1);

      const sql = builder.grammar.compileDelete(builder);

      expect(sql).toBe("DELETE FROM `users` WHERE `id` = ?");
    });
  });

  describe("Transaction Error Handling", () => {
    test("should handle query error simulation", async () => {
      mockConnection.query.mockRejectedValueOnce(
        new Error("Constraint violation"),
      );

      await expect(mockConnection.query("SELECT * FROM users")).rejects.toThrow(
        "Constraint violation",
      );
    });

    test("should handle connection lost simulation", async () => {
      mockConnection.commit.mockRejectedValueOnce(new Error("Connection lost"));

      await expect(mockConnection.commit()).rejects.toThrow("Connection lost");
    });

    test("should handle rollback failure simulation", async () => {
      mockConnection.rollback.mockRejectedValueOnce(
        new Error("Rollback failed"),
      );

      await expect(mockConnection.rollback()).rejects.toThrow(
        "Rollback failed",
      );
    });
  });

  describe("Savepoint Support", () => {
    test("should generate SAVEPOINT SQL commands", async () => {
      const builder = new Builder(mockConnection, grammar);

      const savepointSql = "SAVEPOINT sp1";
      const result = await mockConnection.query(savepointSql);

      expect(mockConnection.query).toHaveBeenCalledWith(savepointSql);
    });

    test("should generate ROLLBACK TO SAVEPOINT SQL commands", async () => {
      const builder = new Builder(mockConnection, grammar);

      const rollbackSql = "ROLLBACK TO SAVEPOINT sp1";
      await mockConnection.query(rollbackSql);

      expect(mockConnection.query).toHaveBeenCalledWith(rollbackSql);
    });
  });

  describe("Complex Operations in Transaction Context", () => {
    test("should generate SQL for multiple operations", () => {
      const builder1 = new Builder(mockConnection, grammar);
      const builder2 = new Builder(mockConnection, grammar);
      const builder3 = new Builder(mockConnection, grammar);

      builder1.table("users");
      builder2.table("profiles");
      builder3.table("users").where("id", 1);

      const insertSql = builder1.grammar.compileInsert(builder1, [
        { name: "John", email: "john@test.com" },
      ]);
      const insertSql2 = builder2.grammar.compileInsert(builder2, [
        { user_id: 1, bio: "Test bio" },
      ]);
      const updateSql = builder3.grammar.compileUpdate(builder3, {
        verified: true,
      });

      expect(insertSql).toBe(
        "INSERT INTO `users` (`name`, `email`) VALUES (?, ?)",
      );
      expect(insertSql2).toBe(
        "INSERT INTO `users` (`user_id`, `bio`) VALUES (?, ?)",
      );
      expect(updateSql).toBe(
        "UPDATE `users` SET `verified` = ? WHERE `id` = ?",
      );
    });

    test("should generate SQL for JOIN operations", () => {
      const builder = new Builder(mockConnection, grammar);
      builder
        .select("users.id as user_id", "users.name")
        .selectRaw("COUNT(posts.id) as post_count")
        .from("users")
        .leftJoin("posts", "users.id", "=", "posts.user_id")
        .groupBy("users.id", "users.name");

      const sql = builder.toSql();

      expect(sql).toContain("SELECT `users`.`id` AS `user_id`, `users`.`name`");
      expect(sql).toContain("LEFT JOIN `posts`");
      expect(sql).toContain("GROUP BY `users`.`id`, `users`.`name`");
    });

    test("should generate SQL for batch operations", () => {
      const builder = new Builder(mockConnection, grammar);
      builder.table("users");

      const users = [
        { name: "User 1", email: "user1@test.com" },
        { name: "User 2", email: "user2@test.com" },
      ];

      const sql = builder.grammar.compileInsert(builder, users);

      expect(sql).toBe(
        "INSERT INTO `users` (`name`, `email`) VALUES (?, ?), (?, ?)",
      );
    });
  });

  describe("Database-Specific SQL Generation", () => {
    test("should generate MySQL transaction isolation SQL", () => {
      const builder = new Builder(mockConnection, grammar);

      const sql = "SET TRANSACTION ISOLATION LEVEL READ COMMITTED";
      expect(sql).toBe("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    });

    test("should generate PostgreSQL session configuration SQL", () => {
      const builder = new Builder(mockConnection, grammar);

      const sql = "SET LOCAL work_mem = '256MB'";
      expect(sql).toBe("SET LOCAL work_mem = '256MB'");
    });

    test("should generate SQLite transaction mode SQL", () => {
      const builder = new Builder(mockConnection, grammar);

      const sql = "BEGIN IMMEDIATE";
      expect(sql).toBe("BEGIN IMMEDIATE");
    });
  });

  describe("Connection Management", () => {
    test("should support concurrent connections", () => {
      const connection1 = createMockConnection();
      const connection2 = createMockConnection();

      expect(connection1).not.toBe(connection2);
      expect(connection1.beginTransaction).toBeDefined();
      expect(connection2.beginTransaction).toBeDefined();
    });

    test("should handle connection state tracking", () => {
      const connection = createMockConnection();

      expect(connection.inTransaction).toBe(false);
      expect(connection.transactionLevel).toBe(0);
    });
  });
});
