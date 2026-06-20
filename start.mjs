import http from "node:http";

const port = parseInt(process.env.PORT || "3000");

const { default: server } = await import("./dist/server/server.js");

const httpServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

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
