const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");

app.use(cors());

const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000, // Ждать 60 секунд перед тем как считать пользователя отключенным
  pingInterval: 25000, // Проверять связь каждые 25 секунд
});

let roomsData = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    if (roomsData[roomId]) {
      socket.emit("playerEvent", roomsData[roomId]);
    }
  });

  socket.on("playerEvent", (data) => {
    roomsData[data.roomId] = data;
    socket.to(data.roomId).emit("playerEvent", data);
  });

  socket.on("message", (data) => {
    io.to(data.roomId).emit("message", data);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Сервер запущен"));
