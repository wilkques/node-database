// tests\join-architecture.test.js
import Builder from "../dist/lib/queries/Builder.js";
import JoinBuilder from "../dist/lib/queries/JoinBuilder.js"; // This registers JoinBuilder globally
import MySQL from "../dist/lib/queries/grammar/MySQL.js";
import { jest } from "@jest/globals";

describe("JoinBuilder Architecture", () => {
  const mockConnection = {
    query: async () => ({ results: [] }),
  };

  test("JoinBuilder should inherit from Builder", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const joinBuilder = new JoinBuilder(mockConnection);
    expect(joinBuilder).toBeInstanceOf(Builder);
  });

  test("JoinBuilder should process standard JOIN", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const joinBuilder = new JoinBuilder(mockConnection);
    const result = joinBuilder.processJoin(
      "users",
      "posts.user_id",
      "=",
      "users.id",
      "inner",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
  });

  test("JoinBuilder should support OR conditions", () => {
    const joinBuilder = new JoinBuilder(mockConnection, "users", "left");
    joinBuilder
      .on("posts.user_id", "=", "users.id")
      .orOn("posts.author_id", "=", "users.id");

    expect(joinBuilder).toBeInstanceOf(JoinBuilder);
  });

  test("JoinBuilder should validate parameters", () => {
    const joinBuilder = new JoinBuilder(mockConnection);

    expect(() => {
      joinBuilder.processJoin(undefined, "col1", "=", "col2", "inner");
    }).toThrow("Join table is required");
  });

  test("JoinBuilder static factory methods should work", () => {
    const leftJoin = JoinBuilder.left(mockConnection, "users");
    const rightJoin = JoinBuilder.right(mockConnection, "orders");
    const innerJoin = JoinBuilder.inner(mockConnection, "products");
    const fullJoin = JoinBuilder.full(mockConnection, "categories");

    expect(leftJoin).toBeInstanceOf(JoinBuilder);
    expect(rightJoin).toBeInstanceOf(JoinBuilder);
    expect(innerJoin).toBeInstanceOf(JoinBuilder);
    expect(fullJoin).toBeInstanceOf(JoinBuilder);
  });

  test("JoinBuilder should handle subquery joins", () => {
    const joinBuilder = new JoinBuilder(
      mockConnection,
      "subquery_alias",
      "left",
    );

    joinBuilder.subquery((query) => {
      query.table("orders").where("status", "=", "active");
    });

    expect(joinBuilder).toBeInstanceOf(JoinBuilder);
  });
});

describe("Builder JOIN API Layer", () => {
  const mockConnection = {
    query: async () => ({ results: [] }),
  };

  test("Builder.join should delegate to JoinBuilder", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.join("users", "posts.user_id", "=", "users.id");

    expect(result).toBeInstanceOf(JoinBuilder);

    // Verify the JOIN was added to components
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.joins[0].type).toBe("inner");
    expect(result.components.joins[0].table).toBe("users");
  });

  test("Builder.leftJoin should delegate with correct type", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.leftJoin("users", "posts.user_id", "=", "users.id");

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins[0].type).toBe("left");
  });

  test("Complex JOIN chaining should work", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const result = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id")
      .leftJoin("profiles", "users.id", "=", "profiles.user_id")
      .where("posts.status", "published");

    expect(result.components.joins).toHaveLength(2);
    expect(result.components.wheres).toHaveLength(1);
  });

  test("Builder.joinSub should delegate to JoinBuilder", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.joinSub(
      (q) => q.table("user_stats").select("user_id", "total_orders"),
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.joins[0].type).toBe("inner");
    expect(result.components.joins[0].isSubquery).toBe(true);
  });

  test("Builder.leftJoinSub should delegate to JoinBuilder with left type", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.leftJoinSub(
      (q) => q.table("user_stats").select("user_id", "total_orders"),
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.joins[0].type).toBe("left");
    expect(result.components.joins[0].isSubquery).toBe(true);
  });

  test("Builder.rightJoinSub should delegate to JoinBuilder with right type", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.rightJoinSub(
      (q) => q.table("user_stats").select("user_id", "total_orders"),
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.joins[0].type).toBe("right");
    expect(result.components.joins[0].isSubquery).toBe(true);
  });

  test("Builder.joinWhereSub should delegate with isWhere flag", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.joinWhereSub(
      (q) => q.table("user_stats").select("user_id", "total_orders"),
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.joins[0].isWhere).toBe(true);
    expect(result.components.joins[0].isSubquery).toBe(true);
  });

  test("Builder.leftJoinWhereSub should work correctly", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.leftJoinWhereSub(
      (q) => q.table("user_stats").select("user_id", "total_orders"),
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins[0].type).toBe("left");
    expect(result.components.joins[0].isWhere).toBe(true);
  });

  test("Builder.rightJoinWhereSub should work correctly", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.rightJoinWhereSub(
      (q) => q.table("user_stats").select("user_id", "total_orders"),
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins[0].type).toBe("right");
    expect(result.components.joins[0].isWhere).toBe(true);
  });

  test("Subquery JOIN with Builder instance should work", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const subQuery = new Builder(mockConnection);
    subQuery.grammar = new MySQL();
    subQuery.table("user_stats").select("user_id", "total_orders");

    const result = builder.joinSub(
      subQuery,
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins[0].isSubquery).toBe(true);
  });

  test("Subquery JOIN should preserve bindings from nested query", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.joinSub(
      (q) => {
        q.table("user_stats")
          .select("user_id", "total_orders")
          .where("min_orders", ">", 5);
      },
      "stats",
      "posts.user_id",
      "=",
      "stats.user_id",
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    const bindings = result.getBindings();
    expect(bindings).toContain(5);
  });

  test("Subquery JOINs should chain properly with other JOINs", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder
      .joinSub(
        (q) => q.table("stats1").select("*"),
        "stats1",
        "posts.id",
        "=",
        "stats1.post_id",
      )
      .leftJoin("users", "posts.user_id", "=", "users.id");

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(2);
    expect(result.components.joins[0].isSubquery).toBe(true);
    expect(result.components.joins[1].isSubquery).toBeUndefined();
  });
});

describe("JoinBuilder Subquery Processing", () => {
  const mockConnection = {
    query: async () => ({ results: [] }),
  };

  test("processSubqueryJoin should add join with subquery metadata", () => {
    const joinBuilder = new JoinBuilder(mockConnection);
    joinBuilder.grammar = new MySQL();

    const result = joinBuilder.processSubqueryJoin(
      "(SELECT * FROM user_stats) AS `stats`",
      "posts.user_id",
      "=",
      "stats.user_id",
      "inner",
      false,
    );

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.joins[0].isSubquery).toBe(true);
    expect(result.components.joins[0].isWhere).toBe(false);
  });

  test("processSubqueryJoin with isWhere flag should be set", () => {
    const joinBuilder = new JoinBuilder(mockConnection);
    joinBuilder.grammar = new MySQL();

    const result = joinBuilder.processSubqueryJoin(
      "(SELECT * FROM user_stats) AS `stats`",
      "posts.user_id",
      "=",
      "stats.user_id",
      "left",
      true,
    );

    expect(result.components.joins[0].isWhere).toBe(true);
    expect(result.components.joins[0].type).toBe("left");
  });

  test("processSubqueryJoin should throw on missing table", () => {
    const joinBuilder = new JoinBuilder(mockConnection);
    joinBuilder.grammar = new MySQL();

    expect(() => {
      joinBuilder.processSubqueryJoin(
        "",
        "posts.user_id",
        "=",
        "stats.user_id",
        "inner",
      );
    }).toThrow("Subquery table reference is required");
  });
});

describe("JOIN Architecture Integration Tests", () => {
  const mockConnection = {
    query: async (sql, bindings) => ({
      sql,
      bindings,
      results: [
        { id: 1, name: "John", title: "Post 1" },
        { id: 2, name: "Jane", title: "Post 2" },
      ],
    }),
  };

  test("Complex multi-JOIN query with all JOIN types", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const result = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id")
      .leftJoin("profiles", "users.id", "=", "profiles.user_id")
      .rightJoin("categories", "posts.category_id", "=", "categories.id")
      .crossJoin("settings")
      .where("posts.status", "published")
      .select([
        "posts.title",
        "users.name",
        "profiles.bio",
        "categories.name as category",
      ])
      .orderBy("posts.created_at", "desc")
      .limit(10);

    expect(result.components.joins).toHaveLength(4);
    expect(result.components.joins[0].type).toBe("inner");
    expect(result.components.joins[1].type).toBe("left");
    expect(result.components.joins[2].type).toBe("right");
    expect(result.components.joins[3].type).toBe("cross");

    const sql = result.toSql();
    expect(sql).toContain("INNER JOIN `users`");
    expect(sql).toContain("LEFT JOIN `profiles`");
    expect(sql).toContain("RIGHT JOIN `categories`");
    expect(sql).toContain("CROSS JOIN `settings`");
  });

  test("Complex subquery JOIN like user example", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const result = builder
      .table("GameMaster gm")
      .leftJoin("GameSpec gs", "gm.id", "=", "gs.id_GameMaster")
      .leftJoinSub(
        (query) => {
          query
            .table("PlatformProduct")
            .select("id", "id_ProductMaster", "id_PlatformMaster");
        },
        "pp",
        "pp.id",
        "=",
        "gm.id_PlatformProduct",
      )
      .leftJoinSub(
        (query) => {
          query
            .table("ProductMaster")
            .select("id", "code", "name")
            .where("companyindex", 1);
        },
        "pm",
        "pm.id",
        "=",
        "pp.id_ProductMaster",
      )
      .leftJoinSub(
        (query) => {
          query.table("ProductMaster").select("id", "code", "name");
        },
        "pfm",
        "pp.id_PlatformMaster",
        "=",
        "pfm.id",
      );

    expect(result.components.joins).toHaveLength(4);
    expect(result.components.joins[0].type).toBe("left"); // GameSpec
    expect(result.components.joins[1].type).toBe("left"); // PlatformProduct subquery
    expect(result.components.joins[2].type).toBe("left"); // ProductMaster subquery
    expect(result.components.joins[3].type).toBe("left"); // ProductMaster subquery 2

    const sql = result.toSql();
    expect(sql).toContain("LEFT JOIN `GameSpec gs`");
    expect(sql).toContain("LEFT JOIN (SELECT");
    expect(sql).toContain("AS `pp`");
    expect(sql).toContain("AS `pm`");
    expect(sql).toContain("AS `pfm`");
  });

  test("JOIN with callback conditions", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const result = builder.table("posts").join("users", (join) => {
      join
        .on("posts.user_id", "=", "users.id")
        .orOn("posts.author_id", "=", "users.id");
    });

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);

    const sql = result.toSql();
    expect(sql).toContain("INNER JOIN `users`");
  });

  test("Method chaining after JOIN operations", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const result = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id")
      .where("posts.status", "published")
      .whereIn("users.role", ["admin", "editor"])
      .orderBy("posts.created_at", "desc")
      .limit(5);

    // Test the SQL generation
    const sql = result.toSql();
    const bindings = result.getBindings();

    expect(sql).toContain("INNER JOIN `users`");
    expect(sql).toContain("WHERE `posts`.`status`");
    expect(sql).toContain("AND `users`.`role` IN (?, ?)");
    expect(sql).toContain("ORDER BY `posts`.`created_at` DESC");
    expect(sql).toContain("LIMIT 5");
    expect(bindings).toEqual(["admin", "editor"]);
  });

  test("Real-world usage example from chat should work identically", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    // Exact code from user's example
    const result = builder
      .table("GameMaster gm")
      .leftJoin("GameSpec gs", "gm.id", "=", "gs.id_GameMaster")
      .leftJoinSub(
        (query) => {
          query
            .table("PlatformProduct")
            .select("id", "id_ProductMaster", "id_PlatformMaster");
        },
        "pp",
        (query) => {
          query.on("pp.id", "gm.id_PlatformProduct");
        },
      )
      .leftJoinSub(
        (query) => {
          query
            .table("ProductMaster")
            .select("id", "code", "name")
            .where("companyindex", 1);
        },
        "pm",
        (query) => {
          query.on("pm.id", "pp.id_ProductMaster");
        },
      )
      .leftJoinSub(
        (query) => {
          query.table("ProductMaster").select("id", "code", "name");
        },
        "pfm",
        (query) => {
          query.on("pp.id_PlatformMaster", "pfm.id");
        },
      );

    // Should work without any modification
    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins.length).toBeGreaterThan(0);
  });

  test("Performance test: Complex JOIN chain with many tables", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const start = performance.now();

    const result = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id")
      .join("profiles", "users.id", "=", "profiles.user_id")
      .join("categories", "posts.category_id", "=", "categories.id")
      .join("tags", "posts.id", "=", "tags.post_id")
      .join("comments", "posts.id", "=", "comments.post_id")
      .leftJoinSub(
        (q) => {
          q.table("post_stats").select("post_id", "view_count", "like_count");
        },
        "stats",
        "posts.id",
        "=",
        "stats.post_id",
      )
      .leftJoinSub(
        (q) => {
          q.table("user_badges")
            .select("user_id", "badge_name")
            .where("active", true);
        },
        "badges",
        "users.id",
        "=",
        "badges.user_id",
      )
      .where("posts.published_at", ">", "2023-01-01")
      .where("users.active", true)
      .orderBy("posts.created_at", "desc");

    const end = performance.now();

    expect(result.components.joins).toHaveLength(7);
    expect(end - start).toBeLessThan(100); // Should be fast even with complex JOINs

    const sql = result.toSql();
    expect(sql).toContain("INNER JOIN `users`");
    expect(sql).toContain("LEFT JOIN (SELECT");
  });

  test("Three-layer architecture validation", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    // Test Layer 1 (API) - Builder delegates to JoinBuilder
    const joinResult = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id");
    expect(joinResult).toBeInstanceOf(JoinBuilder);

    // Test Layer 2 (Business Logic) - JoinBuilder processes joins
    expect(joinResult.components.joins).toHaveLength(1);
    expect(joinResult.components.joins[0].type).toBe("inner");

    // Test Layer 3 (SQL Generation) - Grammar compiles SQL
    const sql = joinResult.toSql();
    expect(sql).toMatch(
      /SELECT \* FROM `posts` INNER JOIN `users` ON `posts`\.`user_id` = `users`\.`id`/,
    );
    expect(typeof sql).toBe("string");

    // Verify inheritance chain works correctly
    expect(joinResult).toBeInstanceOf(Builder); // JoinBuilder extends Builder
    expect(typeof joinResult.where).toBe("function"); // Should have all Builder methods
    expect(typeof joinResult.processJoin).toBe("function"); // Should have JoinBuilder methods
  });
});
