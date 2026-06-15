import { createReadStream, existsSync, statSync } from "fs";
import { extname, join, normalize, relative, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function resolveFile(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${PORT}`).pathname);
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(__dirname, requested));
  return relative(__dirname, filePath).startsWith("..") ? null : filePath;
}

createServer((req, res) => {
  const filePath = resolveFile(req.url);
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
}).listen(PORT, HOST, () => {
  console.log(`레크 게임 서버 실행 중 -> http://${HOST}:${PORT}`);
});
