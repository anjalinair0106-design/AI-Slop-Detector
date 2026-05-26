const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 4173;
const ROOT = __dirname;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

function resolvePath(urlPath) {
  if (urlPath === "/" || urlPath === "") {
    return path.join(ROOT, "web", "index.html");
  }
  return path.join(ROOT, urlPath.replace(/^\/+/, ""));
}

http
  .createServer((req, res) => {
    const filePath = resolvePath(req.url.split("?")[0]);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`Slop detector app running at http://localhost:${PORT}`);
  });
