const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");

app.use(cors());

const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Здесь сервер будет хранить данные о видео в комнатах
let roomsData = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log("Пользователь зашел в: " + roomId);

    // Если в этой комнате уже что-то смотрят, сразу отправляем данные новому участнику
    if (roomsData[roomId]) {
      socket.emit("playerEvent", roomsData[roomId]);
    }
  });

  socket.on("playerEvent", (data) => {
    // Сервер запоминает последнее действие (видео и время)
    roomsData[data.roomId] = data;
    // Рассылает остальным
    socket.to(data.roomId).emit("playerEvent", data);
  });

  socket.on("message", (data) => {
    io.to(data.roomId).emit("message", data);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Сервер запущен"));
