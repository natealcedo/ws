const WebSocket = require("ws");

const HOST = "localhost";
const PORT = 8765;

// WebSocket Server
class WebSocketServer {
  constructor(host = HOST, port = PORT) {
    this.server = new WebSocket.Server({ host, port });
    this.clients = new Set();

    this.server.on("connection", (ws) => {
      this.clients.add(ws);
      console.log("New client connected.");

      ws.on("message", (message) => {
        console.log("Received message:", message.toString());
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log("Client disconnected.");
      });
    });

    console.log(`WebSocket server started on ws://${host}:${port}`);
  }

  sendMessage(message) {
    if (!this.clients.size) return;
    const jsonMessage = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(jsonMessage);
      }
    }
  }
}

// Keyboard Command Handler (Raw Mode - No Enter Required)
class KeyboardCommandHandler {
  constructor(websocketServer) {
    this.websocketServer = websocketServer;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (key) => {
      this.handleKeyPress(key);
    });

    console.log(
      "Keyboard command handler initialized. Press 'c', 'p', 'n', 'd' or 'm'. (Press Ctrl+C to exit)"
    );
  }

  handleKeyPress(key) {
    // Exit on Ctrl+C
    if (key === "\u0003") {
      console.log("Exiting...");
      process.exit();
    }

    const timestamp = Math.floor(Date.now() / 1000);
    let message = null;

    switch (key) {
      case "c":
        message = { command: "ux_capture_image", timestamp };
        break;
      case "p":
        message = { command: "ux_previous", timestamp };
        break;
      case "n":
        message = { command: "ux_next", timestamp };
        break;
      case "m":
        message = { command: "ux_menu", timestamp };
        break;
      case "d":
        message = { command: "ux_damage", timestamp };
        break;
      default:
        return;
    }

    console.log("Sending UX command:", message);
    this.websocketServer.sendMessage(message);
  }
}

// Main Function
function main() {
  console.log("Starting WebSocket server...");
  const websocketServer = new WebSocketServer();

  console.log("Initializing keyboard input handler...");
  new KeyboardCommandHandler(websocketServer);
}

// Run the server
main();
