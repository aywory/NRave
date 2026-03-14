const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Пользователь подключился");

  // Присоединение к комнате
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  // Передача команд плеера (пауза, плей, перемотка)
  socket.on("playerEvent", (data) => {
    // Отправляем всем в комнате, кроме отправителя
    socket.to(data.roomId).emit("playerEvent", data);
  });

  // Чат
  socket.on("message", (data) => {
    io.to(data.roomId).emit("message", data);
  });
});

http.listen(3000, () => console.log("Сервер запущен на порту 3000"));
