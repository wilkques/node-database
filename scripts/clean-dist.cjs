#!/usr/bin/env node

/**
 * Cross-platform dist directory cleaner with retry logic for Windows
 */

const fs = require("fs");
const path = require("path");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function forceRemoveDir(dirPath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (fs.existsSync(dirPath)) {
        // First try: normal removal
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`✅ Successfully cleaned ${dirPath}`);
        return true;
      } else {
        console.log(`ℹ️ Directory ${dirPath} does not exist, skipping clean`);
        return true;
      }
    } catch (error) {
      if (error.code === "EBUSY" && attempt < maxRetries) {
        console.log(
          `⚠️ Directory busy, retrying in ${attempt}s... (attempt ${attempt}/${maxRetries})`,
        );
        await sleep(attempt * 1000);

        // Try to kill any processes that might be holding file handles
        if (process.platform === "win32") {
          try {
            const { execSync } = require("child_process");
            // Close any handles to the directory (Windows specific)
            execSync(`taskkill /f /im node.exe 2>nul || exit 0`, {
              stdio: "ignore",
            });
            await sleep(500);
          } catch (e) {
            // Ignore errors from taskkill
          }
        }
      } else {
        console.error(`❌ Failed to clean ${dirPath}: ${error.message}`);
        if (error.code === "EBUSY") {
          console.log(
            "💡 Try closing any editors, file explorers, or terminals that might have files open in the dist/ directory",
          );
          console.log(
            "💡 Or try running: npm run build (which will overwrite files instead of deleting)",
          );
        }
        return false;
      }
    }
  }
  return false;
}

async function main() {
  const distPath = path.join(process.cwd(), "dist");
  console.log("🧹 Cleaning dist directory...");

  const success = await forceRemoveDir(distPath);
  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error("❌ Clean script failed:", error);
  process.exit(1);
});
