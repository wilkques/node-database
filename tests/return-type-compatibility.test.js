// tests/return-type-compatibility.test.js
import Builder from "../dist/lib/queries/Builder.js";
import JoinBuilder from "../dist/lib/queries/JoinBuilder.js";
import MySQL from "../dist/lib/queries/grammar/MySQL.js";
import { jest } from "@jest/globals";

describe("Return Type Compatibility", () => {
  const mockConnection = {
    query: async () => ({ results: [] }),
  };

  test("JOIN methods should return JoinBuilder type", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder.join("users", "posts.user_id", "=", "users.id");

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
  });

  test("JoinBuilder allows chaining with WHERE method", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder
      .join("users", "posts.user_id", "=", "users.id")
      .where("posts.status", "published");

    expect(result).toBeInstanceOf(JoinBuilder);
    expect(result.components.joins).toHaveLength(1);
    expect(result.components.wheres).toHaveLength(1);
  });

  test("JoinBuilder allows chaining with SELECT method", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder
      .join("users", "posts.user_id", "=", "users.id")
      .select("posts.title", "users.name");

    expect(result).toBeInstanceOf(JoinBuilder);

    // Verify SQL generation
    const sql = result.toSql();
    expect(sql).toContain("JOIN");
    expect(sql).toContain("SELECT");
  });

  test("JoinBuilder allows chaining with ORDER BY method", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();
    builder.table("posts");

    const result = builder
      .join("users", "posts.user_id", "=", "users.id")
      .orderBy("posts.created_at", "desc");

    expect(result).toBeInstanceOf(JoinBuilder);

    // Verify SQL generation
    const sql = result.toSql();
    expect(sql).toContain("JOIN");
    expect(sql).toContain("ORDER BY");
  });

  test("All JOIN method variants return JoinBuilder", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const innerJoin = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id");
    const leftJoin = builder
      .table("posts")
      .leftJoin("users", "posts.user_id", "=", "users.id");
    const rightJoin = builder
      .table("posts")
      .rightJoin("users", "posts.user_id", "=", "users.id");
    const crossJoin = builder.table("posts").crossJoin("users");

    expect(innerJoin).toBeInstanceOf(JoinBuilder);
    expect(leftJoin).toBeInstanceOf(JoinBuilder);
    expect(rightJoin).toBeInstanceOf(JoinBuilder);
    expect(crossJoin).toBeInstanceOf(JoinBuilder);
  });

  test("Subquery JOIN methods return JoinBuilder", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const joinSub = builder
      .table("posts")
      .joinSub(
        (q) => q.table("user_stats").select("user_id", "total_orders"),
        "stats",
        "posts.user_id",
        "=",
        "stats.user_id",
      );

    const leftJoinSub = builder
      .table("posts")
      .leftJoinSub(
        (q) => q.table("user_stats").select("user_id", "total_orders"),
        "stats",
        "posts.user_id",
        "=",
        "stats.user_id",
      );

    expect(joinSub).toBeInstanceOf(JoinBuilder);
    expect(leftJoinSub).toBeInstanceOf(JoinBuilder);
  });

  test("JoinBuilder toSql method works correctly", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const result = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id")
      .where("posts.status", "published");

    const sql = result.toSql();
    expect(sql).toContain("JOIN");
    expect(sql).toContain("WHERE");
    expect(typeof sql).toBe("string");
  });

  test("JoinBuilder has all required Builder methods", () => {
    const builder = new Builder(mockConnection);
    builder.grammar = new MySQL();

    const joinResult = builder
      .table("posts")
      .join("users", "posts.user_id", "=", "users.id");

    // Verify essential methods exist
    expect(typeof joinResult.toSql).toBe("function");
    expect(typeof joinResult.get).toBe("function");
    expect(typeof joinResult.first).toBe("function");
    expect(typeof joinResult.count).toBe("function");
    expect(typeof joinResult.where).toBe("function");
    expect(typeof joinResult.select).toBe("function");
    expect(typeof joinResult.orderBy).toBe("function");
    expect(typeof joinResult.getBindings).toBe("function");
  });
});
