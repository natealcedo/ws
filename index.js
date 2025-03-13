const WebSocket = require("ws");
const os = require("os");
const fs = require("fs");
const https = require("https");

const TELEMETRY_PORT = 8766;
const TELEMETRY_INTERVAL = 1000; // 1 second

const serverOptions = {
  key: fs.readFileSync("./localhost-key.pem"),
  cert: fs.readFileSync("./localhost.pem"),
};

// Create HTTPS server
const httpsServer = https.createServer(serverOptions);
httpsServer.listen(TELEMETRY_PORT, () => {
  console.log(
    `Telemetry WebSocket server running on wss://localhost:${TELEMETRY_PORT}`
  );
});

// Create WebSocket server using the HTTPS server
const telemetryServer = new WebSocket.Server({ server: httpsServer });

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

function generatePixhawkMetrics() {
  return {
    bloc_kind: "pixhawk-metrics",
    timestamp: Date.now(),
    attitude: {
      roll: Math.random() * 2 - 1,
      pitch: Math.random() * 2 - 1,
      yaw: Math.random() * Math.PI * 2,
      rollspeed: Math.random() * 0.1,
      pitchspeed: Math.random() * 0.1,
      yawspeed: Math.random() * 0.1,
    },
    imu: {
      primary: {
        name: "ICM-20689",
        acceleration: {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
          z: -9.81 + Math.random() * 0.2 - 0.1,
        },
        gyroscope: {
          x: Math.random() * 0.1,
          y: Math.random() * 0.1,
          z: Math.random() * 0.1,
        },
      },
    },
    battery: {
      voltage: 24.0 - Math.random() * 2,
      current: 20.5 + Math.random() * 5,
      remaining: Math.max(0, 100 - Math.floor((Date.now() / 1000) % 100)),
    },
  };
}

function generateLinuxMetrics() {
  return {
    bloc_kind: "linux-metrics",
    timestamp: Date.now(),
    system_info: {
      os_version: "Ubuntu 22.04.3 LTS",
      kernel_version: os.release(),
      architecture: os.arch(),
      boot_time: Date.now() - os.uptime() * 1000,
    },
    cpu: {
      usage: {
        total: Math.random() * 100,
        cores: Array.from(
          { length: os.cpus().length },
          () => Math.random() * 100
        ),
        load_average: os
          .loadavg()
          .map((load) => load + Math.random() * 0.5 - 0.25),
      },
      temperature: {
        current: 40 + Math.random() * 10,
      },
    },
    memory: {
      total: os.totalmem(),
      used: os.totalmem() * Math.random(),
      free: os.freemem(),
      swap_used: os.totalmem() * 0.1 * Math.random(),
      percent: Math.random() * 100,
    },
    storage: {
      total: 512 * 1024 * 1024 * 1024,
      used: 256 * 1024 * 1024 * 1024,
      free: 256 * 1024 * 1024 * 1024,
      io: {
        read_bytes: Math.random() * 1000000000,
        write_bytes: Math.random() * 500000000,
        read_time: Math.random() * 1000,
        write_time: Math.random() * 1000,
      },
    },
    network: {
      wifi: {
        interface: "wlan0",
        ssid: "ExampleSSID",
        signal_level: Math.floor(Math.random() * -30) - 50,
        ip_address: "192.168.1.100",
      },
      statistics: {
        bytes_sent: Math.floor(Math.random() * 100000000),
        bytes_received: Math.floor(Math.random() * 100000000),
        packets_sent: Math.floor(Math.random() * 10000),
        packets_received: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 10),
        drops: Math.floor(Math.random() * 5),
      },
    },
    processes: {
      total: Math.floor(Math.random() * 300),
      critical_processes: {
        rover_control: Math.random() > 0.5,
        telemetry_server: Math.random() > 0.5,
      },
    },
  };
}

setInterval(() => {
  const data =
    Math.random() > 0.5 ? generatePixhawkMetrics() : generateLinuxMetrics();
  const message = JSON.stringify(data, null, 2);
  console.log("Sending telemetry data:", message);
  broadcastMessage(telemetryClients, message);
}, TELEMETRY_INTERVAL);

process.on("SIGINT", () => {
  console.log("\nShutting down telemetry server...");
  telemetryServer.close();
  httpsServer.close();
  process.exit(0);
});
