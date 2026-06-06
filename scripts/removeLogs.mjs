import { readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const directory = "./"; // Root directory of your project

const removeConsoleLogs = (dir) => {
  readdirSync(dir).forEach((file) => {
    const fullPath = join(dir, file);

    // Skip the "index.ts" file
    if (
      fullPath.endsWith("index.ts") ||
      fullPath.endsWith("generateModule.js") ||
      fullPath.endsWith("removeConsoleLogs.mjs")
    ) {
      return;
    }

    if (statSync(fullPath).isDirectory()) {
      if (!fullPath.includes("node_modules")) {
        removeConsoleLogs(fullPath); // Recursively process subdirectories
      }
    } else if (fullPath.endsWith(".js") || fullPath.endsWith(".ts")) {
      let content = readFileSync(fullPath, "utf8");
      const updatedContent = content.replace(/console\.log\([^)]*\);?/g, "");

      if (content !== updatedContent) {
        writeFileSync(fullPath, updatedContent, "utf8");
        console.log(`🛠 Removed console.log from: ${fullPath}`);
      }
    }
  });
};

removeConsoleLogs(directory);
console.log("✅ All console.log statements have been removed.");
