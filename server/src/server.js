require("dotenv").config();

const http = require("http");
const app = require("./app");
const setupWebSocket = require("./websocket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
});
