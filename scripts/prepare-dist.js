import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, "../client/dist");
const targetSubDir = path.join(distDir, "work/projects/chatflow/app");

if (fs.existsSync(distDir)) {
  fs.mkdirSync(targetSubDir, { recursive: true });
  const items = fs.readdirSync(distDir);
  for (const item of items) {
    if (item === "work") continue;
    const srcPath = path.join(distDir, item);
    const destPath = path.join(targetSubDir, item);
    fs.cpSync(srcPath, destPath, { recursive: true });
  }
  console.log(
    "Successfully prepared subpath distribution in client/dist/work/projects/chatflow/app"
  );
} else {
  console.warn("client/dist directory not found. Skipping prepare-dist.");
}

