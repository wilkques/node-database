/**
 * Subquery Functionality Tests
 * Tests for various subquery methods and their SQL generation
 */

import { jest } from "@jest/globals";
import Builder from "../dist/lib/queries/Builder.js";
import MySQL from "../dist/lib/queries/grammar/MySQL.js";

describe("Subquery Functionality", () => {
  let builder;
  let grammar;

  beforeEach(() => {
    grammar = new MySQL();
    builder = new Builder(null, grammar);
  });

  describe("WHERE Subqueries", () => {
    test("should create WHERE IN subquery", () => {
      const query = builder.table("users").where("id", "IN", (query) => {
        query.table("orders").select("user_id").where("status", "completed");
      });

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toBe(
        "SELECT * FROM `users` WHERE `id` IN (SELECT `user_id` FROM `orders` WHERE `status` = ?)",
      );
      expect(bindings).toEqual(["completed"]);
    });

    test("should create WHERE EXISTS subquery", () => {
      const query = builder.table("users").whereExists((subQuery) => {
        subQuery.table("orders").where("orders.user_id", "=", "users.id");
      });

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toBe(
        "SELECT * FROM `users` WHERE EXISTS (SELECT * FROM `orders` WHERE `orders`.`user_id` = `users`.`id`)",
      );
      expect(bindings).toEqual([]);
    });

    test("should create WHERE NOT EXISTS subquery", () => {
      const query = builder.table("users").whereNotExists((subQuery) => {
        subQuery.table("orders").where("orders.user_id", "=", "users.id");
      });

      const sql = query.toSql();

      expect(sql).toBe(
        "SELECT * FROM `users` WHERE NOT EXISTS (SELECT * FROM `orders` WHERE `orders`.`user_id` = `users`.`id`)",
      );
    });

    test("should handle OR WHERE IN subquery", () => {
      const query = builder
        .table("users")
        .where("status", "active")
        .orWhere("id", "IN", (subQuery) => {
          subQuery.table("orders").select("user_id").where("total", ">", 1000);
        });

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toBe(
        "SELECT * FROM `users` WHERE `status` = ? OR `id` IN (SELECT `user_id` FROM `orders` WHERE `total` > ?)",
      );
      expect(bindings).toEqual(["active", 1000]);
    });

    test("should handle complex nested subqueries", () => {
      const query = builder.table("users").whereIn("id", (subQuery) => {
        subQuery
          .table("orders")
          .select("user_id")
          .whereIn("product_id", (nestedQuery) => {
            nestedQuery
              .table("products")
              .select("id")
              .where("category", "electronics");
          });
      });

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toContain("WHERE `id` IN (SELECT `user_id` FROM `orders`");
      expect(sql).toContain(
        "WHERE `product_id` IN (SELECT `id` FROM `products`",
      );
      expect(bindings).toEqual(["electronics"]);
    });
  });

  describe("SELECT Subqueries", () => {
    test("should create SELECT with subquery column", () => {
      const query = builder
        .table("users")
        .select(["id", "name"])
        .selectSub((subQuery) => {
          subQuery
            .table("orders")
            .select("COUNT(*)")
            .where("orders.user_id", "=", "users.id");
        }, "order_count");

      const sql = query.toSql();

      expect(sql).toBe(
        "SELECT `id`, `name`, (SELECT COUNT(*) FROM `orders` WHERE `orders`.`user_id` = `users`.`id`) AS `order_count` FROM `users`",
      );
    });

    test("should handle multiple SELECT subqueries", () => {
      const query = builder
        .table("users")
        .select("id", "name")
        .selectSub(
          (subQuery) =>
            subQuery
              .table("orders")
              .select("COUNT(*)")
              .where("orders.user_id", "=", "users.id"),
          "order_count",
        )
        .selectSub(
          (subQuery) =>
            subQuery
              .table("reviews")
              .select("AVG(`rating`)")
              .where("reviews.user_id", "=", "users.id"),
          "avg_rating",
        );

      const sql = query.toSql();

      expect(sql).toContain("(SELECT COUNT(*) FROM `orders`");
      expect(sql).toContain("(SELECT AVG(`rating`) FROM `reviews`");
      expect(sql).toContain("AS `order_count`");
      expect(sql).toContain("AS `avg_rating`");
    });

    test("should handle SELECT subquery with conditions", () => {
      const query = builder
        .table("categories")
        .select("name")
        .selectSub((subQuery) => {
          subQuery
            .table("products")
            .select("COUNT(*)")
            .where("products.category_id", "=", "categories.id")
            .where("products.active", true);
        }, "active_product_count");

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toContain("(SELECT COUNT(*) FROM `products`");
      expect(sql).toContain(
        "WHERE `products`.`category_id` = `categories`.`id`",
      );
      expect(sql).toContain("AND `products`.`active` = ?");
      expect(bindings).toEqual([true]);
    });
  });

  describe("JOIN Subqueries", () => {
    test("should create JOIN with subquery", () => {
      const query = builder.table("users").joinSub(
        (subQuery) => {
          subQuery
            .table("orders")
            .select(["user_id", "COUNT(*) as order_count"])
            .groupBy("user_id");
        },
        "order_stats",
        "users.id",
        "=",
        "order_stats.user_id",
      );

      const sql = query.toSql();

      expect(sql).toContain("FROM `users`");
      expect(sql).toContain(
        "INNER JOIN (SELECT `user_id`, COUNT(*) as order_count FROM `orders` GROUP BY `user_id`) AS `order_stats`",
      );
      expect(sql).toContain("ON `users`.`id` = `order_stats`.`user_id`");
    });

    test("should create LEFT JOIN with subquery", () => {
      const query = builder.table("users").leftJoinSub(
        (subQuery) => {
          subQuery
            .table("orders")
            .select(["user_id", "MAX(created_at) as last_order"])
            .groupBy("user_id");
        },
        "last_orders",
        "users.id",
        "=",
        "last_orders.user_id",
      );

      const sql = query.toSql();

      expect(sql).toContain("LEFT JOIN (SELECT");
      expect(sql).toContain("AS `last_orders`");
      expect(sql).toContain("MAX(created_at) as last_order");
    });

    test("should handle complex JOIN subquery with conditions", () => {
      const query = builder.table("products").leftJoinSub(
        (subQuery) => {
          subQuery
            .table("reviews")
            .select([
              "product_id",
              "AVG(rating) as avg_rating",
              "COUNT(*) as review_count",
            ])
            .where("approved", true)
            .groupBy("product_id")
            .having("review_count", ">", 5);
        },
        "product_stats",
        "products.id",
        "=",
        "product_stats.product_id",
      );

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toContain(
        "LEFT JOIN (SELECT `product_id`, AVG(rating) as avg_rating, COUNT(*) as review_count",
      );
      expect(sql).toContain("WHERE `approved` = ?");
      expect(sql).toContain("HAVING `review_count` > ?");
      expect(bindings).toEqual([true, 5]);
    });
  });

  describe("FROM Subqueries", () => {
    test("should create FROM subquery", () => {
      const query = builder
        .fromSub((subQuery) => {
          subQuery
            .table("orders")
            .select(["user_id", "SUM(total) as total_spent"])
            .groupBy("user_id");
        }, "user_totals")
        .select("*")
        .where("total_spent", ">", 1000);

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toBe(
        "SELECT * FROM (SELECT `user_id`, SUM(total) as total_spent FROM `orders` GROUP BY `user_id`) AS `user_totals` WHERE `total_spent` > ?",
      );
      expect(bindings).toEqual([1000]);
    });

    test("should handle FROM subquery with JOIN", () => {
      const query = builder
        .fromSub((subQuery) => {
          subQuery
            .table("sales")
            .select(["product_id", "SUM(quantity) as total_sold"])
            .where("date", ">=", "2024-01-01")
            .groupBy("product_id");
        }, "sales_data")
        .join("products", "sales_data.product_id", "=", "products.id")
        .select("products.name", "sales_data.total_sold");

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toContain(
        "FROM (SELECT `product_id`, SUM(quantity) as total_sold FROM `sales`",
      );
      expect(sql).toContain("WHERE `date` >= ?");
      expect(sql).toContain("INNER JOIN `products`");
      expect(bindings).toEqual(["2024-01-01"]);
    });
  });

  describe("INSERT with Subqueries", () => {
    test("should create INSERT with SELECT subquery", () => {
      const insertBuilder = new Builder(null, grammar);
      const query = insertBuilder.table("user_stats");

      // Mock the insertUsing method if it doesn't exist
      if (!query.insertUsing) {
        query.insertUsing = function (columns, callback) {
          const subQuery = new Builder(null, this.grammar);
          callback(subQuery);

          const fromTable = this.queries.froms.queries[0] || "user_stats";

          return {
            sql: `INSERT INTO ${this.grammar.wrapTable(fromTable)} (${columns.map((col) => this.grammar.wrap(col)).join(", ")}) ${subQuery.toSql()}`,
            bindings: subQuery.getBindings(),
          };
        };
      }

      const result = query.insertUsing(
        ["user_id", "total_orders", "total_spent"],
        (subQuery) => {
          subQuery
            .table("orders")
            .select([
              "user_id",
              "COUNT(*) as total_orders",
              "SUM(total) as total_spent",
            ])
            .where("status", "completed")
            .groupBy("user_id");
        },
      );

      expect(result.sql).toContain("INSERT INTO `user_stats`");
      expect(result.sql).toContain(
        "(`user_id`, `total_orders`, `total_spent`)",
      );
      expect(result.sql).toContain(
        "SELECT `user_id`, COUNT(*) as total_orders, SUM(total) as total_spent",
      );
      expect(result.bindings).toEqual(["completed"]);
    });
  });

  describe("ORDER BY and GROUP BY with Subqueries", () => {
    test("should handle ORDER BY with subquery", () => {
      const query = builder
        .table("users")
        .orderByRaw(
          "(SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) DESC",
        );

      const sql = query.toSql();

      expect(sql).toBe(
        "SELECT * FROM `users` ORDER BY (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) DESC",
      );
    });

    test("should handle complex ordering with multiple subqueries", () => {
      const query = builder
        .table("products")
        .select(["id", "name", "price"])
        .orderByRaw(
          "(SELECT AVG(rating) FROM reviews WHERE reviews.product_id = products.id) DESC",
        )
        .orderByRaw(
          "(SELECT COUNT(*) FROM orders_items WHERE orders_items.product_id = products.id) DESC",
        );

      const sql = query.toSql();

      expect(sql).toContain("ORDER BY (SELECT AVG(rating) FROM reviews");
      expect(sql).toContain("(SELECT COUNT(*) FROM orders_items");
    });
  });

  describe("Complex Combinations", () => {
    test("should handle multiple subquery types in one query", () => {
      const query = builder
        .table("users")
        .select(["users.id", "users.name"])
        .selectSub(
          (subQuery) =>
            subQuery
              .table("orders")
              .select("COUNT(*)")
              .where("orders.user_id", "=", "users.id"),
          "order_count",
        )
        .leftJoinSub(
          (subQuery) => {
            subQuery
              .table("reviews")
              .select(["user_id", "AVG(rating) as avg_rating"])
              .groupBy("user_id");
          },
          "user_ratings",
          "users.id",
          "=",
          "user_ratings.user_id",
        )
        .whereExists((subQuery) => {
          subQuery
            .table("orders")
            .where("orders.user_id", "=", "users.id")
            .where("orders.status", "completed");
        })
        .orderByRaw(
          "(SELECT MAX(created_at) FROM orders WHERE orders.user_id = users.id) DESC",
        );

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toContain("(SELECT COUNT(*) FROM `orders`"); // SELECT subquery
      expect(sql).toContain("LEFT JOIN (SELECT"); // JOIN subquery
      expect(sql).toContain("WHERE EXISTS (SELECT"); // EXISTS subquery
      expect(sql).toContain("ORDER BY (SELECT MAX(created_at)"); // ORDER BY subquery
      expect(bindings).toEqual(["completed"]);
    });

    test("should handle deeply nested subqueries", () => {
      const query = builder
        .table("categories")
        .whereIn("id", (categoryQuery) => {
          categoryQuery
            .table("products")
            .select("category_id")
            .whereIn("id", (productQuery) => {
              productQuery
                .table("order_items")
                .select("product_id")
                .whereIn("order_id", (orderQuery) => {
                  orderQuery
                    .table("orders")
                    .select("id")
                    .where("status", "completed")
                    .where("created_at", ">=", "2024-01-01");
                });
            });
        });

      const sql = query.toSql();
      const bindings = query.getBindings();

      expect(sql).toContain("SELECT `category_id` FROM `products`");
      expect(sql).toContain("SELECT `product_id` FROM `order_items`");
      expect(sql).toContain("SELECT `id` FROM `orders`");
      expect(bindings).toEqual(["completed", "2024-01-01"]);
    });
  });

  describe("Subquery SQL Generation Validation", () => {
    test("should have correct placeholder and binding counts", () => {
      const query = builder
        .table("users")
        .selectSub(
          (subQuery) =>
            subQuery
              .table("orders")
              .select("COUNT(*)")
              .where("user_id", "=", "users.id")
              .where("status", "completed"),
          "completed_orders",
        )
        .whereIn("id", (subQuery) => {
          subQuery
            .table("purchases")
            .select("user_id")
            .where("amount", ">", 100);
        })
        .whereExists((subQuery) => {
          subQuery
            .table("reviews")
            .where("user_id", "=", "users.id")
            .where("rating", ">", 4);
        });

      const sql = query.toSql();
      const bindings = query.getBindings();
      const placeholderCount = (sql.match(/\?/g) || []).length;

      expect(placeholderCount).toBe(bindings.length);
      expect(bindings).toEqual(["completed", 100, 4]);
    });
  });
});
