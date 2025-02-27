const WebSocket = require("ws");
const os = require("os");

const TELEMETRY_PORT = 8766;
const TELEMETRY_INTERVAL = 1000; // 1 second

const telemetryServer = new WebSocket.Server({ port: TELEMETRY_PORT });

console.log(
  `Telemetry WebSocket server running on ws://localhost:${TELEMETRY_PORT}`
);

let telemetryClients = new Set();

telemetryServer.on("connection", (ws) => {
  telemetryClients.add(ws);
  console.log("New telemetry client connected");

  ws.on("close", () => {
    telemetryClients.delete(ws);
    console.log("Telemetry client disconnected");
  });
});

function broadcastMessage(clients, message) {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function generateTelemetryData() {
  return {
    accelerometer: {
      x: (Math.sin(Date.now() * 0.001) * 0.1).toFixed(3),
      y: (Math.cos(Date.now() * 0.001) * 0.1).toFixed(3),
      z: (9.81 + Math.sin(Date.now() * 0.002) * 0.05).toFixed(3),
    },
    temperature: (25 + Math.sin(Date.now() * 0.001) * 2).toFixed(2),
    battery: Math.max(0, 100 - Math.floor((Date.now() / 1000) % 100)),
    timestamp: new Date().toISOString(),
  };
}

setInterval(() => {
  const data = JSON.stringify(generateTelemetryData(), null, 2);
  console.log("Sending telemetry data:\n", data);
  broadcastMessage(telemetryClients, data);
}, TELEMETRY_INTERVAL);

process.on("SIGINT", () => {
  console.log("\nShutting down telemetry server...");
  telemetryServer.close();
  process.exit(0);
});
