/**
 * IF Expression Tests
 * Tests for IF(condition, true_value, false_value) functionality
 */

import { jest } from "@jest/globals";
import Builder from "../dist/lib/queries/Builder.js";
import MySQL from "../dist/lib/queries/grammar/MySQL.js";
import PostgreSQL from "../dist/lib/queries/grammar/PostgreSQL.js";
import SQLite from "../dist/lib/queries/grammar/SQLite.js";

describe("IF Expressions", () => {
  let builder;
  let grammar;

  beforeEach(() => {
    grammar = new MySQL();
    builder = new Builder(null, grammar);
  });

  describe("Simple IF expressions", () => {
    test("should create basic IF with string condition", () => {
      const ifExpr = builder.if("age > 18", "Adult", "Minor");

      expect(ifExpr.type).toBe("raw");
      expect(ifExpr.raw).toBe(true);
      expect(ifExpr.value).toBe("IF(age > 18, ?, ?)");
      expect(ifExpr.bindings).toEqual(["Adult", "Minor"]);
    });

    test("should create IF with numeric values", () => {
      const ifExpr = builder.if("score >= 90", 100, 0);

      expect(ifExpr.value).toBe("IF(score >= 90, ?, ?)");
      expect(ifExpr.bindings).toEqual([100, 0]);
    });

    test("should create IF with boolean values", () => {
      const ifExpr = builder.if("is_active = 1", true, false);

      expect(ifExpr.value).toBe("IF(is_active = 1, ?, ?)");
      expect(ifExpr.bindings).toEqual([true, false]);
    });

    test("should handle null values correctly", () => {
      const ifExpr = builder.if("email IS NOT NULL", "Has Email", null);

      expect(ifExpr.value).toBe("IF(email IS NOT NULL, ?, ?)");
      expect(ifExpr.bindings).toEqual(["Has Email", null]);
    });
  });

  describe("Function-based IF expressions", () => {
    test("should create IF with function condition", () => {
      const ifExpr = builder.if(
        (query) => query.where("status", "active"),
        "Active User",
        "Inactive User",
      );

      expect(ifExpr.type).toBe("raw");
      expect(ifExpr.raw).toBe(true);
      expect(ifExpr.value).toBe("IF(`status` = ?, ?, ?)");
      expect(ifExpr.bindings).toEqual([
        "active",
        "Active User",
        "Inactive User",
      ]);
    });

    test("should handle complex WHERE conditions", () => {
      const ifExpr = builder.if(
        (query) => query.where("age", ">", 18).where("verified", true),
        "Verified Adult",
        "Not Verified",
      );

      expect(ifExpr.value).toBe("IF(`age` > ? AND `verified` = ?, ?, ?)");
      expect(ifExpr.bindings).toEqual([
        18,
        true,
        "Verified Adult",
        "Not Verified",
      ]);
    });

    test("should handle OR conditions", () => {
      const ifExpr = builder.if(
        (query) => query.where("role", "admin").orWhere("role", "moderator"),
        "Staff Member",
        "Regular User",
      );

      expect(ifExpr.value).toBe("IF((`role` = ? OR `role` = ?), ?, ?)");
      expect(ifExpr.bindings).toEqual([
        "admin",
        "moderator",
        "Staff Member",
        "Regular User",
      ]);
    });

    test("should handle whereIn conditions", () => {
      const ifExpr = builder.if(
        (query) => query.whereIn("department", ["IT", "Engineering"]),
        "Tech Department",
        "Other Department",
      );

      expect(ifExpr.value).toBe("IF(`department` IN (?, ?), ?, ?)");
      expect(ifExpr.bindings).toEqual([
        "IT",
        "Engineering",
        "Tech Department",
        "Other Department",
      ]);
    });
  });

  describe("Subquery IF expressions", () => {
    test("should create IF with EXISTS subquery", () => {
      const ifExpr = builder.if(
        (query) =>
          query.select("1").from("orders").where("user_id", "=", "users.id"),
        "Has Orders",
        "No Orders",
      );

      expect(ifExpr.value).toBe(
        "IF(EXISTS(SELECT `1` FROM `orders` WHERE `user_id` = `users`.`id`), ?, ?)",
      );
      expect(ifExpr.bindings).toEqual(["Has Orders", "No Orders"]);
    });

    test("should handle complex subquery conditions", () => {
      const ifExpr = builder.if(
        (query) =>
          query
            .select("COUNT(*)")
            .from("posts")
            .where("author_id", "=", "users.id")
            .where("published", true),
        "Published Author",
        "No Published Posts",
      );

      expect(ifExpr.value).toBe(
        "IF(EXISTS(SELECT COUNT(*) FROM `posts` WHERE `author_id` = `users`.`id` AND `published` = ?), ?, ?)",
      );
      expect(ifExpr.bindings).toEqual([
        true,
        "Published Author",
        "No Published Posts",
      ]);
    });
  });

  describe("Nested IF expressions", () => {
    test("should support nested IF as true value", () => {
      const innerIf = builder.if("level > 5", "Expert", "Intermediate");
      const outerIf = builder.if("active = 1", innerIf, "Inactive");

      expect(outerIf.value).toBe("IF(active = 1, IF(level > 5, ?, ?), ?)");
      expect(outerIf.bindings).toEqual(["Expert", "Intermediate", "Inactive"]);
    });

    test("should support nested IF as false value", () => {
      const innerIf = builder.if("score < 60", "Fail", "Pass");
      const outerIf = builder.if("submitted = 0", "Not Submitted", innerIf);

      expect(outerIf.value).toBe("IF(submitted = 0, ?, IF(score < 60, ?, ?))");
      expect(outerIf.bindings).toEqual(["Not Submitted", "Fail", "Pass"]);
    });

    test("should support deeply nested IF expressions", () => {
      const level3 = builder.if("score >= 95", "A+", "A");
      const level2 = builder.if("score >= 90", level3, "B");
      const level1 = builder.if("score >= 80", level2, "C");

      expect(level1.value).toBe(
        "IF(score >= 80, IF(score >= 90, IF(score >= 95, ?, ?), ?), ?)",
      );
      expect(level1.bindings).toEqual(["A+", "A", "B", "C"]);
    });
  });

  describe("IF in SELECT statements", () => {
    test("should work in SELECT clause", () => {
      const ifExpr = builder.if("age >= 18", "Adult", "Minor");
      const query = builder
        .select("name")
        .selectRaw(ifExpr.value + " as age_group", ifExpr.bindings)
        .from("users");

      const sql = query.toSql();
      expect(sql).toBe(
        "SELECT `name`, IF(age >= 18, ?, ?) as age_group FROM `users`",
      );
    });

    test("should work with column references", () => {
      const ifExpr = builder.if(
        "salary > average_salary",
        "Above Average",
        "Below Average",
      );

      expect(ifExpr.value).toBe("IF(salary > average_salary, ?, ?)");
      expect(ifExpr.bindings).toEqual(["Above Average", "Below Average"]);
    });
  });

  describe("Error handling", () => {
    test("should handle undefined condition gracefully", () => {
      const ifExpr = builder.if(undefined, "True", "False");

      expect(ifExpr.value).toBe("IF(undefined, ?, ?)");
      expect(ifExpr.bindings).toEqual(["True", "False"]);
    });

    test("should handle empty string condition", () => {
      const ifExpr = builder.if("", "True", "False");

      expect(ifExpr.value).toBe("IF(, ?, ?)");
      expect(ifExpr.bindings).toEqual(["True", "False"]);
    });

    test("should handle function that builds no conditions", () => {
      const ifExpr = builder.if(
        (query) => {
          // Function that doesn't add any conditions
          return query;
        },
        "True",
        "False",
      );

      expect(ifExpr.value).toBe("IF(TRUE, ?, ?)");
      expect(ifExpr.bindings).toEqual(["True", "False"]);
    });
  });

  describe("Cross-database compatibility", () => {
    test("should work with PostgreSQL grammar", () => {
      const pgGrammar = new PostgreSQL();
      const pgBuilder = new Builder(null, pgGrammar);

      const ifExpr = pgBuilder.if(
        (query) => query.where("category", "premium"),
        "Premium User",
        "Regular User",
      );

      expect(ifExpr.value).toBe('IF("category" = $1, ?, ?)');
      expect(ifExpr.bindings).toEqual([
        "premium",
        "Premium User",
        "Regular User",
      ]);
    });

    test("should work with SQLite grammar", () => {
      const sqliteGrammar = new SQLite();
      const sqliteBuilder = new Builder(null, sqliteGrammar);

      const ifExpr = sqliteBuilder.if(
        (query) => query.where("status", "active"),
        "Active",
        "Inactive",
      );

      expect(ifExpr.value).toBe("IF([status] = ?, ?, ?)");
      expect(ifExpr.bindings).toEqual(["active", "Active", "Inactive"]);
    });
  });

  describe("Raw expression values", () => {
    test("should handle raw expressions in true/false values", () => {
      const trueValue = builder.raw("UPPER(?)", ["active"]);
      const falseValue = builder.raw("LOWER(?)", ["inactive"]);

      const ifExpr = builder.if("status = 1", trueValue, falseValue);

      expect(ifExpr.value).toBe("IF(status = 1, UPPER(?), LOWER(?))");
      expect(ifExpr.bindings).toEqual(["active", "inactive"]);
    });

    test("should handle raw expression condition", () => {
      const condition = builder.raw("YEAR(created_at) = ?", [2024]);

      const ifExpr = builder.if(condition, "This Year", "Other Year");

      expect(ifExpr.value).toBe("IF(YEAR(created_at) = ?, ?, ?)");
      expect(ifExpr.bindings).toEqual([2024, "This Year", "Other Year"]);
    });
  });

  describe("Performance and bindings", () => {
    test("should maintain correct binding order with complex expressions", () => {
      const ifExpr = builder.if(
        (query) => query.where("price", ">", 100).where("discount", "<", 50),
        builder.raw("CONCAT(?, ?)", ["Expensive", "Item"]),
        builder.raw("CONCAT(?, ?)", ["Cheap", "Item"]),
      );

      expect(ifExpr.bindings).toEqual([
        100,
        50, // condition bindings
        "Expensive",
        "Item", // true value bindings
        "Cheap",
        "Item", // false value bindings
      ]);
    });

    test("should handle multiple IF expressions in same query", () => {
      const if1 = builder.if("age >= 18", "Adult", "Minor");
      const if2 = builder.if("verified = 1", "Verified", "Unverified");

      expect(if1.bindings).toEqual(["Adult", "Minor"]);
      expect(if2.bindings).toEqual(["Verified", "Unverified"]);

      // Each IF should be independent
      expect(if1.value).toBe("IF(age >= 18, ?, ?)");
      expect(if2.value).toBe("IF(verified = 1, ?, ?)");
    });
  });
});
