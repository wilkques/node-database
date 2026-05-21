#!/usr/bin/env node

/**
 * Pre-publish verification script
 * Runs automated checks before publishing to npm
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import path from "path";

const packagePath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));

console.log("🔍 Pre-publish verification for @wilkques/database\n");

const checks = [];
let allPassed = true;

function addCheck(name, passed, details = "") {
  checks.push({ name, passed, details });
  if (!passed) allPassed = false;
  const status = passed ? "✅" : "❌";
  console.log(`${status} ${name}${details ? ` - ${details}` : ""}`);
}

// Check package.json configuration
console.log("📋 Package Configuration:");
addCheck("Package name", pkg.name === "@wilkques/database");
addCheck("Version format", /^\d+\.\d+\.\d+$/.test(pkg.version));
addCheck("Description present", !!pkg.description);
addCheck("Main entry point", pkg.main === "dist/index.js");
addCheck("Types entry point", pkg.types === "dist/index.d.ts");
addCheck("ESM module type", pkg.type === "module");

// Check required files exist
console.log("\n📁 Required Files:");
const requiredFiles = [
  "dist/index.js",
  "dist/index.d.ts",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
];

requiredFiles.forEach((file) => {
  addCheck(`${file} exists`, existsSync(file));
});

// Check dependencies
console.log("\n📦 Dependencies:");
addCheck(
  "No runtime dependencies",
  Object.keys(pkg.dependencies || {}).length === 0,
);
addCheck(
  "Has peer dependencies",
  Object.keys(pkg.peerDependencies || {}).length > 0,
);
addCheck(
  "Has dev dependencies",
  Object.keys(pkg.devDependencies || {}).length > 0,
);

// Run tests
console.log("\n🧪 Tests:");
try {
  execSync("npm test", { stdio: "pipe" });
  addCheck("All tests pass", true);
} catch (error) {
  addCheck("All tests pass", false, "Some tests failed");
}

// Check TypeScript compilation
console.log("\n🔨 Build:");
try {
  execSync("npm run type-check", { stdio: "pipe" });
  addCheck("TypeScript compilation", true);
} catch (error) {
  addCheck("TypeScript compilation", false, "Type errors found");
}

// Check linting
console.log("\n📏 Code Quality:");
try {
  execSync("npm run lint", { stdio: "pipe" });
  addCheck("Linting passes", true);
} catch (error) {
  addCheck("Linting passes", false, "Lint errors found");
}

// Check npm package
console.log("\n📤 Package Validation:");
try {
  const packResult = execSync("npm pack --dry-run", {
    stdio: "pipe",
    encoding: "utf8",
  });
  const lines = packResult.split("\n");
  const packageSizeLine = lines.find((line) => line.includes("npm pack"));
  addCheck("Package builds successfully", true);

  // Check package size (should be reasonable)
  if (packageSizeLine) {
    const sizeMatch = packageSizeLine.match(/(\d+\.?\d*)\s*(B|kB|MB)/);
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2];
      const isReasonableSize = (unit === "kB" && size < 500) || unit === "B";
      addCheck("Package size reasonable", isReasonableSize, `${size}${unit}`);
    }
  }
} catch (error) {
  addCheck("Package builds successfully", false, "npm pack failed");
}

// Check npm registry availability
console.log("\n🌐 Registry:");
try {
  execSync(`npm view ${pkg.name}`, { stdio: "pipe" });
  addCheck("Package name available", false, "Package already exists");
} catch (error) {
  if (error.message.includes("E404")) {
    addCheck("Package name available", true, "Ready for first publish");
  } else {
    addCheck("Registry connectivity", false, "Cannot check npm registry");
  }
}

// Check git status
console.log("\n📝 Git Status:");
try {
  const gitStatus = execSync("git status --porcelain", {
    stdio: "pipe",
    encoding: "utf8",
  });
  addCheck(
    "Working directory clean",
    gitStatus.trim() === "",
    "Uncommitted changes detected",
  );
} catch (error) {
  addCheck("Git repository", false, "Not a git repository");
}

// Final summary
console.log("\n" + "=".repeat(50));
console.log(
  `📊 Summary: ${checks.filter((c) => c.passed).length}/${checks.length} checks passed`,
);

if (allPassed) {
  console.log("🎉 All checks passed! Ready for publishing.");
  console.log("\nNext steps:");
  console.log("1. npm login (if not already logged in)");
  console.log("2. npm publish --dry-run (final verification)");
  console.log("3. npm publish --access public");
} else {
  console.log(
    "❌ Some checks failed. Please resolve issues before publishing.",
  );
  console.log("\nFailed checks:");
  checks
    .filter((c) => !c.passed)
    .forEach((c) =>
      console.log(`   - ${c.name}${c.details ? `: ${c.details}` : ""}`),
    );
}

process.exit(allPassed ? 0 : 1);
