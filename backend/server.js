// backend/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
require("dotenv").config();

const apiRouter = require("./api");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", apiRouter);

// Tiempo real
io.on("connection", (socket) => {
  console.log("Cliente conectado");

  socket.on("pujar", (data) => {
    io.emit("nuevaPuja", data);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Backend escuchando en puerto " + PORT);
});
