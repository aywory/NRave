const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors"); // Добавили модуль cors

// Разрешаем все подключения со всех сайтов
app.use(cors());

const io = require("socket.io")(http, {
  cors: {
    origin: "*", // Разрешить всем
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("Пользователь подключился");

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log("Зашел в комнату: " + roomId);
  });

  socket.on("playerEvent", (data) => {
    socket.to(data.roomId).emit("playerEvent", data);
  });

  socket.on("message", (data) => {
    io.to(data.roomId).emit("message", data);
  });
});

// Важно: порт должен быть таким, какой дает Render
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Сервер запущен на порту " + PORT));
