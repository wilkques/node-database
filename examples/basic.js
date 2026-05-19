/**
 * Basic usage example for the Database package
 */

import Database from "../index.js";

async function basicExample() {
  console.log("🚀 Database Package - Basic Example\n");

  try {
    // Create MySQL connection
    console.log("📡 Connecting to MySQL database...");

    const db = await Database.connect({
      driver: "mysql",
      host: "localhost",
      username: "root",
      password: "",
      database: "test",
      port: 3306,
      charset: "utf8mb4",
    });

    console.log("✅ Connected successfully!\n");

    // Enable query logging
    db.connection.enableQueryLog();

    // Example 1: Simple SELECT
    console.log("📊 Example 1: Simple SELECT");
    const users = await db
      .table("users")
      .select("id", "name", "email")
      .where("status", "=", "active")
      .orderBy("created_at", "desc")
      .limit(10)
      .get();

    console.log(`Found ${users.length} users:`, users);
    console.log();

    // Example 2: Complex query with JOIN
    console.log("📊 Example 2: Complex query with JOIN");
    const userProfiles = await db
      .table("users as u")
      .select("u.id", "u.name", "u.email", "p.bio", "p.avatar")
      .leftJoin("profiles as p", "u.id", "=", "p.user_id")
      .whereIn("u.role", ["admin", "user"])
      .whereNotNull("u.email")
      .get();

    console.log(`Found ${userProfiles.length} user profiles:`, userProfiles);
    console.log();

    // Example 3: Aggregation
    console.log("📊 Example 3: Aggregation");
    const userCount = await db.table("users").count();
    const avgAge = await db.table("users").avg("age");

    console.log(`Total users: ${userCount}`);
    console.log(`Average age: ${avgAge}`);
    console.log();

    // Example 4: Subquery
    console.log("📊 Example 4: Subquery");
    const activeUserIds = await db
      .table("users")
      .select("id")
      .whereIn("id", (query) => {
        query
          .table("user_sessions")
          .select("user_id")
          .where(
            "last_activity",
            ">",
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          );
      })
      .get();

    console.log(`Active user IDs:`, activeUserIds);
    console.log();

    // Example 5: INSERT
    console.log("📊 Example 5: INSERT");
    const insertResult = await db.table("users").insert({
      name: "John Doe",
      email: "john.doe@example.com",
      status: "active",
      created_at: new Date(),
    });

    console.log("Insert result:", insertResult);
    console.log();

    // Example 6: UPDATE
    console.log("📊 Example 6: UPDATE");
    const updateResult = await db
      .table("users")
      .where("email", "=", "john.doe@example.com")
      .update({
        name: "John Smith",
        updated_at: new Date(),
      });

    console.log("Update result:", updateResult);
    console.log();

    // Example 7: Transaction
    console.log("📊 Example 7: Transaction");
    try {
      const transactionResult = await db.connection.transaction(async (trx) => {
        // Create user
        const userResult = await db.table("users").insert({
          name: "Jane Doe",
          email: "jane.doe@example.com",
          status: "active",
        });

        // Create profile
        await db.table("profiles").insert({
          user_id: userResult.insertId,
          bio: "Software developer",
          avatar: "avatar.jpg",
        });

        return userResult.insertId;
      });

      console.log("Transaction completed, new user ID:", transactionResult);
    } catch (error) {
      console.log("Transaction failed:", error.message);
    }
    console.log();

    // Example 8: Raw SQL (if needed)
    console.log("📊 Example 8: Raw queries");
    console.log(
      "SQL for previous SELECT:",
      db.table("users").select("*").toSql(),
    );
    console.log();

    // Show query log
    console.log("📋 Query log:");
    const queryLog = db.connection.getQueryLog();
    queryLog.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.sql}`);
      if (entry.bindings.length > 0) {
        console.log(`   Bindings: [${entry.bindings.join(", ")}]`);
      }
    });

    // Close connection
    await db.connection.close();
    console.log("\n✅ Connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  }
}

// Alternative connection methods
async function alternativeConnections() {
  console.log("\n🔄 Alternative Connection Examples\n");

  try {
    // SQLite example
    console.log("📱 SQLite connection:");
    const sqlite = await Database.connect({
      driver: "sqlite",
      database: "./test.db",
    });

    const sqliteUsers = await sqlite.table("users").select("*").limit(5).get();
    console.log("SQLite users:", sqliteUsers);
    await sqlite.connection.close();

    // PostgreSQL example
    console.log("\n🐘 PostgreSQL connection:");
    const postgres = await Database.connect({
      driver: "postgres",
      host: "localhost",
      username: "postgres",
      password: "password",
      database: "testdb",
      port: 5432,
    });

    const pgUsers = await postgres.table("users").select("*").limit(5).get();
    console.log("PostgreSQL users:", pgUsers);
    await postgres.connection.close();

    // String parameters
    console.log("\n📝 String parameters connection:");
    const stringDb = await Database.connect(
      "mysql",
      "localhost",
      "root",
      "",
      "test",
    );
    await stringDb.connection.close();
  } catch (error) {
    console.error("❌ Alternative connection error:", error.message);
  }
}

// Run examples
async function runExamples() {
  await basicExample();
  await alternativeConnections();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples().catch(console.error);
}

export { basicExample, alternativeConnections };
