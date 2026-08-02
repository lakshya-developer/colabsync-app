const { io } = require("socket.io-client");

const SOCKET_URL = "http://localhost:5000"; // adjust if your socket server uses a different port
const SOCKET_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTNmZjc2MjE5Nzk4MzdlMDg0ZWY0OGYiLCJlbWFpbCI6Imxha3NoeWF2MjIxQGdtYWlsLmNvbSIsIm5hbWUiOiJMYWtzaHlhIFZlcm1hIiwicm9sZSI6ImFkbWluIiwiY29tcGFueUlkIjoiNjk0MDIzNDg1MDdkYzcxMWRhODcxMTIwIiwiaXNWZXJpZmllZCI6dHJ1ZSwiaWF0IjoxNzg0MjI0MTk1LCJleHAiOjE3ODQyNjczOTUsImlzcyI6ImNvbGxhYnN5bmMiLCJzdWIiOiI2OTNmZjc2MjE5Nzk4MzdlMDg0ZWY0OGYifQ.VbjtsxmbKHjgn__gECYyO-NwDSGuA4I2ow1BaNGIFq0";

const socket = io(SOCKET_URL, {
  auth: {
    token: SOCKET_TOKEN,
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("room:join", { roomId: "YOUR_ROOM_ID" }, (ack) => {
    console.log("room:join ack:", ack);

    socket.emit(
      "message:send",
      { roomId: "YOUR_ROOM_ID", content: "Hello from CLI" },
      (ack2) => {
        console.log("message:send ack:", ack2);
      }
    );
  });
});

socket.on("connect_error", (err) => {
  console.error("connect_error:", err.message);
});

socket.on("message:new", (msg) => {
  console.log("message:new", msg);
});

socket.on("notification:new", (payload) => {
  console.log("notification:new", payload);
});

socket.on("error", (err) => {
  console.error("socket error:", err);
});

socket.emit("room:join", { roomId: "YOUR_ROOM_ID" }, (ack) => {
  console.log("room:join ack:", ack);
});

socket.emit(
  "message:send",
  { roomId: "YOUR_ROOM_ID", content: "Hello from CLI" },
  (ack) => {
    console.log("message:send ack:", ack);
  }
);

socket.emit(
  "notification:read",
  { notificationId: "YOUR_NOTIFICATION_ID" },
  (ack) => {
    console.log("notification:read ack:", ack);
  }
);


process.stdin.resume();