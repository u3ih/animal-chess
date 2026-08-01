import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerRealtimeServer, roomsSnapshot } from "./src/server/realtime";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

async function main() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    if (req.url === "/healthz") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    // Lets the Python backend rebuild its lobby cache on startup (open public rooms).
    if (req.url === "/internal/rooms/snapshot") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(roomsSnapshot()));
      return;
    }
    handler(req, res);
  });
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  registerRealtimeServer(io);

  httpServer.listen(port, () => {
    console.log(`> ready on http://${hostname}:${port}`);
  });
}

void main();
