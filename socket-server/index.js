require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");

const socketAuth = require(".//middleware/socketAuth");

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log("MongoDb server connected.");
});

io.use(socketAuth);

io.on("connection", (socket) => {
  console.log("a user connected");

  require("./socket/chat.socket")(io, socket);
  require("./socket/task.socket")(io, socket);
  require("./socket/presence.socket")(io, socket);
  require("./socket/notification.socket")(io, socket);

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(process.env.PORT, () => {
  console.log(`server running at http://locatlhost: ${process.env.PORT}`);
});
