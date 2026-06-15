import fs from "node:fs/promises";
import path from "node:path";

const srcDir = path.resolve("src");
const distDir = path.resolve("dist");

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });
await fs.cp(srcDir, distDir, { recursive: true });

process.stdout.write("Frontend build généré dans /frontend/dist\n");
