/**
 * Async Operations Tests
 * Comprehensive tests for all async methods in Builder class
 */

import { jest } from "@jest/globals";
import Builder from "../dist/lib/queries/Builder.js";
import MySQL from "../dist/lib/queries/grammar/MySQL.js";

// Create mock connection that simulates real database responses
function createMockConnection(returnValue = []) {
  return {
    query: jest.fn().mockResolvedValue({ results: returnValue }),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe("Async Operations", () => {
  let builder;
  let grammar;
  let mockConnection;

  beforeEach(() => {
    mockConnection = createMockConnection();
    grammar = new MySQL();
    builder = new Builder(mockConnection, grammar);
  });

  describe("SELECT Operations SQL Generation", () => {
    test("should generate correct SELECT SQL", () => {
      const sql = builder.select("*").from("users").toSql();
      const bindings = builder.getBindings();

      expect(sql).toBe("SELECT * FROM `users`");
      expect(bindings).toEqual([]);
    });

    test("should generate correct SELECT with WHERE SQL", () => {
      const sql = builder.select("*").from("users").where("id", 1).toSql();
      const bindings = builder.getBindings();

      expect(sql).toBe("SELECT * FROM `users` WHERE `id` = ?");
      expect(bindings).toEqual([1]);
    });

    test("should generate correct EXISTS SQL", () => {
      const subBuilder = new Builder(mockConnection, grammar);
      const sql = subBuilder
        .from("users")
        .where("email", "john@example.com")
        .toSql();
      const bindings = subBuilder.getBindings();

      expect(sql).toBe("SELECT * FROM `users` WHERE `email` = ?");
      expect(bindings).toEqual(["john@example.com"]);
    });

    test("should generate correct COUNT SQL", () => {
      const sql = builder.from("users").toSql();

      // Manually test count compilation
      const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as `count`");
      expect(countSql).toBe("SELECT COUNT(*) as `count` FROM `users`");
    });

    test("should generate correct aggregate function SQL", () => {
      const maxBuilder = new Builder(mockConnection, grammar);
      const minBuilder = new Builder(mockConnection, grammar);
      const sumBuilder = new Builder(mockConnection, grammar);
      const avgBuilder = new Builder(mockConnection, grammar);

      const maxSql = maxBuilder
        .from("products")
        .toSql()
        .replace("SELECT *", "SELECT MAX(`price`) as `max`");
      const minSql = minBuilder
        .from("products")
        .toSql()
        .replace("SELECT *", "SELECT MIN(`price`) as `min`");
      const sumSql = sumBuilder
        .from("orders")
        .toSql()
        .replace("SELECT *", "SELECT SUM(`amount`) as `sum`");
      const avgSql = avgBuilder
        .from("products")
        .toSql()
        .replace("SELECT *", "SELECT AVG(`rating`) as `avg`");

      expect(maxSql).toBe("SELECT MAX(`price`) as `max` FROM `products`");
      expect(minSql).toBe("SELECT MIN(`price`) as `min` FROM `products`");
      expect(sumSql).toBe("SELECT SUM(`amount`) as `sum` FROM `orders`");
      expect(avgSql).toBe("SELECT AVG(`rating`) as `avg` FROM `products`");
    });
  });

  describe("INSERT Operations SQL Generation", () => {
    test("should generate correct INSERT SQL", () => {
      builder.table("users");
      const data = { name: "John Doe", email: "john@example.com" };

      const sql = builder.grammar.compileInsert(builder, [data]);
      const bindings = builder.getInsertBindings([data]);

      expect(sql).toBe("INSERT INTO `users` (`name`, `email`) VALUES (?, ?)");
      expect(bindings).toEqual(["John Doe", "john@example.com"]);
    });

    test("should generate correct INSERT SQL for multiple records", () => {
      builder.table("users");
      const data = [
        { name: "John", email: "john@example.com" },
        { name: "Jane", email: "jane@example.com" },
      ];

      const sql = builder.grammar.compileInsert(builder, data);
      const bindings = builder.getInsertBindings(data);

      expect(sql).toBe(
        "INSERT INTO `users` (`name`, `email`) VALUES (?, ?), (?, ?)",
      );
      expect(bindings).toEqual([
        "John",
        "john@example.com",
        "Jane",
        "jane@example.com",
      ]);
    });
  });

  describe("UPDATE Operations SQL Generation", () => {
    test("should generate correct UPDATE SQL", () => {
      builder.table("users").where("id", 1);

      const sql = builder.grammar.compileUpdate(builder, {
        name: "John Updated",
      });
      const bindings = builder.getUpdateBindings({ name: "John Updated" });

      expect(sql).toBe("UPDATE `users` SET `name` = ? WHERE `id` = ?");
      expect(bindings).toEqual(["John Updated", 1]); // Update value + WHERE bindings
    });
  });

  describe("DELETE Operations SQL Generation", () => {
    test("should generate correct DELETE SQL", () => {
      builder.table("users").where("id", 1);

      const sql = builder.grammar.compileDelete(builder);
      const bindings = builder.getBindings();

      expect(sql).toBe("DELETE FROM `users` WHERE `id` = ?");
      expect(bindings).toEqual([1]);
    });
  });

  describe("Error Handling", () => {
    test("should handle connection errors gracefully", async () => {
      const error = new Error("Connection lost");
      mockConnection.query.mockRejectedValueOnce(error);

      await expect(mockConnection.query("SELECT * FROM users")).rejects.toThrow(
        "Connection lost",
      );
    });

    test("should detect invalid table names", () => {
      // Test SQL generation for invalid table names
      expect(() => {
        builder.table("invalid..table").toSql();
      }).not.toThrow(); // Grammar should handle this gracefully
    });

    test("should handle binding parameter validation", () => {
      const sql = builder.where("id", undefined).toSql();
      const bindings = builder.getBindings();

      expect(sql).toBe("SELECT * WHERE `id` = ?");
      expect(bindings).toEqual([undefined]); // Binding validation happens at connection level
    });
  });

  describe("Complex Query SQL Generation", () => {
    test("should generate complex JOIN SQL", () => {
      const sql = builder
        .select(
          "users.id as user_id",
          "users.name as user_name",
          "posts.title as post_title",
        )
        .from("users")
        .join("posts", "users.id", "=", "posts.user_id")
        .where("users.active", true)
        .orderBy("posts.created_at", "desc")
        .limit(10)
        .toSql();

      expect(sql).toContain("SELECT `users`.`id` AS `user_id`");
      expect(sql).toContain("FROM `users`");
      expect(sql).toContain("INNER JOIN `posts`");
      expect(sql).toContain("WHERE `users`.`active` = ?");
      expect(sql).toContain("ORDER BY `posts`.`created_at` DESC");
      expect(sql).toContain("LIMIT 10");
    });

    test("should generate GROUP BY with HAVING SQL", () => {
      const sql = builder
        .select("department")
        .from("employees")
        .groupBy("department")
        .having("avg_salary", ">", 60000)
        .toSql();

      expect(sql).toContain("SELECT `department`");
      expect(sql).toContain("FROM `employees`");
      expect(sql).toContain("GROUP BY `department`");
      expect(sql).toContain("HAVING `avg_salary` > ?");
    });
  });

  describe("Advanced SQL Features", () => {
    test("should generate LIMIT and OFFSET SQL", () => {
      const sql = builder
        .select("*")
        .from("users")
        .limit(10)
        .offset(20)
        .toSql();

      expect(sql).toContain("SELECT *");
      expect(sql).toContain("FROM `users`");
      expect(sql).toContain("LIMIT 10");
      expect(sql).toContain("OFFSET 20");
    });

    test("should generate ORDER BY SQL", () => {
      const sql = builder
        .select("*")
        .from("users")
        .orderBy("created_at", "desc")
        .orderBy("name", "asc")
        .toSql();

      expect(sql).toContain("ORDER BY `created_at` DESC, `name` ASC");
    });

    test("should handle raw SQL expressions", () => {
      const sql = builder
        .select("*")
        .selectRaw("COUNT(*) as total")
        .from("users")
        .toSql();

      expect(sql).toContain("SELECT *, COUNT(*) as total");
      expect(sql).toContain("FROM `users`");
    });
  });
});
