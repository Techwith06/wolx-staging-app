import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const port = parseInt(process.env.PORT || "3000");
const dir = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(dir, "dist/client");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};

const { default: server } = await import("./dist/server/server.js");

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // Try static file first (skip index.html — SSR handles it)
    if (req.method === "GET" || req.method === "HEAD") {
      const filePath = path.join(clientDir, url.pathname === "/" ? "" : url.pathname);
      try {
        const stat = await fs.promises.stat(filePath);
        if (stat.isFile()) {
          const ext = path.extname(filePath);
          const contentType = MIME[ext] || "application/octet-stream";
          res.writeHead(200, {
            "Content-Type": contentType,
            "Content-Length": stat.size,
            "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
          });
          if (req.method === "GET") {
            fs.createReadStream(filePath).pipe(res);
          } else {
            res.end();
          }
          return;
        }
      } catch {
        // file not found, fall through to SSR
      }
    }

    // Forward to SSR handler
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
      });
    }

    const request = new Request(url, { method: req.method, headers, body });
    const response = await server.fetch(request, {}, {});

    res.statusCode = response.status;
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }

    if (response.body) {
      const reader = response.body.getReader();
      const pump = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          pump();
        });
      };
      pump();
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
