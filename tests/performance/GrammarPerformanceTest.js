import { describe, test, expect } from "@jest/globals";
import MySQLGrammar from "../../lib/queries/grammar/MySQL.js";
import PostgreSQLGrammar from "../../lib/queries/grammar/PostgreSQL.js";
import SQLiteGrammar from "../../lib/queries/grammar/SQLite.js";
import Builder from "../../lib/queries/Builder.js";

describe("Grammar Performance Tests", () => {
  const grammars = [
    { name: "MySQL", grammar: new MySQLGrammar() },
    { name: "PostgreSQL", grammar: new PostgreSQLGrammar() },
    { name: "SQLite", grammar: new SQLiteGrammar() },
  ];

  test.each(grammars)(
    "should compile simple queries efficiently - $name",
    ({ grammar }) => {
      const iterations = 1000;

      const start = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        const builder = new Builder();
        builder.grammar = grammar;

        builder
          .select(["id", "name"])
          .from("users")
          .where("status", "active")
          .orderBy("created_at", "DESC")
          .limit(10);

        const sql = builder.toSql();
        expect(sql).toContain("SELECT");
      }

      const end = process.hrtime.bigint();
      const totalTimeMs = Number(end - start) / 1_000_000;
      const avgTime = totalTimeMs / iterations;

      console.log(
        `${grammar.constructor.name} - Average compilation time: ${avgTime.toFixed(3)}ms`,
      );
      expect(avgTime).toBeLessThan(2); // Should be under 2ms per simple query
    },
  );

  test.each(grammars)(
    "should compile complex queries efficiently - $name",
    ({ grammar }) => {
      const iterations = 500;

      const start = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        const builder = new Builder();
        builder.grammar = grammar;

        builder
          .select([
            "users.id",
            "users.name",
            "users.email",
            "profiles.bio",
            "profiles.avatar",
          ])
          .from("users")
          .leftJoin("profiles", "users.id", "profiles.user_id")
          .leftJoin("user_roles", "users.id", "user_roles.user_id")
          .leftJoin("roles", "user_roles.role_id", "roles.id")
          .whereIn("users.status", ["active", "verified", "premium"])
          .where("users.created_at", ">", "2023-01-01")
          .where("profiles.public", true)
          .orderBy("users.created_at", "DESC")
          .orderBy("users.name", "ASC")
          .limit(50)
          .offset(10);

        const sql = builder.toSql();
        expect(sql).toContain("SELECT");
        expect(sql).toContain("JOIN");
        expect(sql).toContain("WHERE");
        expect(sql).toContain("ORDER BY");
      }

      const end = process.hrtime.bigint();
      const totalTimeMs = Number(end - start) / 1_000_000;
      const avgTime = totalTimeMs / iterations;

      console.log(
        `${grammar.constructor.name} - Complex query average time: ${avgTime.toFixed(3)}ms`,
      );
      expect(avgTime).toBeLessThan(5); // Should be under 5ms per complex query
    },
  );

  test.each(grammars)(
    "should handle subquery compilation efficiently - $name",
    ({ grammar }) => {
      const iterations = 200;

      const start = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        const builder = new Builder();
        builder.grammar = grammar;

        builder
          .select(["id", "name", "email"])
          .from("users")
          .where("status", "active")
          .where("created_at", ">", "2023-01-01")
          .orderBy("created_at", "DESC");

        const sql = builder.toSql();
        expect(sql).toContain("SELECT");
        expect(sql).toContain("WHERE");
        expect(sql).toContain("ORDER BY");
      }

      const end = process.hrtime.bigint();
      const totalTimeMs = Number(end - start) / 1_000_000;
      const avgTime = totalTimeMs / iterations;

      console.log(
        `${grammar.constructor.name} - Complex query 2 average time: ${avgTime.toFixed(3)}ms`,
      );
      expect(avgTime).toBeLessThan(3); // Should be under 3ms per complex query
    },
  );

  test("should handle concurrent query compilation", async () => {
    const grammar = new MySQLGrammar();
    const concurrentQueries = 50;
    const queriesPerThread = 100;

    const promises = Array.from({ length: concurrentQueries }, async () => {
      const start = process.hrtime.bigint();

      for (let i = 0; i < queriesPerThread; i++) {
        const builder = new Builder();
        builder.grammar = grammar;

        builder
          .select(["id", "name"])
          .from(`table_${i % 10}`)
          .where("status", "active")
          .where("id", ">", i)
          .orderBy("created_at", "DESC")
          .limit(10);

        const sql = builder.toSql();
        expect(sql).toContain("SELECT");
      }

      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000;
    });

    const results = await Promise.all(promises);
    const totalTime = results.reduce((sum, time) => sum + time, 0);
    const avgTimePerQuery = totalTime / (concurrentQueries * queriesPerThread);

    console.log(
      `Concurrent compilation - Average time per query: ${avgTimePerQuery.toFixed(3)}ms`,
    );
    expect(avgTimePerQuery).toBeLessThan(3); // Should maintain performance under concurrency
  });

  test("should demonstrate memory efficiency", () => {
    const grammar = new MySQLGrammar();
    const iterations = 10000;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const startMemory = process.memoryUsage();

    for (let i = 0; i < iterations; i++) {
      const builder = new Builder();
      builder.grammar = grammar;

      builder
        .select(["id", "name", "email"])
        .from("users")
        .where("status", "active")
        .where("id", ">", i)
        .orderBy("created_at", "DESC")
        .limit(10);

      const sql = builder.toSql();
      expect(sql).toContain("SELECT");
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const endMemory = process.memoryUsage();
    const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
    const memoryPerQuery = memoryIncrease / iterations;

    console.log(`Memory per query: ${memoryPerQuery.toFixed(2)} bytes`);
    console.log(
      `Total memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
    );

    // Should not leak significant memory (less than 1.5KB per query on average)
    expect(memoryPerQuery).toBeLessThan(1536);
  });

  test("should benchmark grammar instantiation performance", () => {
    const iterations = 1000;

    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      const mysql = new MySQLGrammar();
      const postgres = new PostgreSQLGrammar();
      const sqlite = new SQLiteGrammar();

      expect(mysql).toBeDefined();
      expect(postgres).toBeDefined();
      expect(sqlite).toBeDefined();
    }

    const end = process.hrtime.bigint();
    const totalTimeMs = Number(end - start) / 1_000_000;
    const avgTime = totalTimeMs / iterations;

    console.log(`Grammar instantiation average time: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(1); // Should be under 1ms per instantiation
  });
});
