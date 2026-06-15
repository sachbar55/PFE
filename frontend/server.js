import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const port = Number(process.env.PORT ?? process.env.FRONTEND_PORT ?? 5173);
const rootDir = path.resolve("src");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const normalized = path.resolve(rootDir, `.${pathname}`);
    const relativePath = path.relative(rootDir, normalized);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const content = await fs.readFile(normalized);
    const ext = path.extname(normalized);
    res.writeHead(200, { "Content-Type": contentTypes[ext] ?? "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(port, () => {
  process.stdout.write(`Frontend prêt sur http://localhost:${port}\n`);
});
