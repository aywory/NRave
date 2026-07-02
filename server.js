const express = require("express");
const app = express();
const http = require("http").createServer(app);
const cors = require("cors");

app.use(cors());

const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Пароль ведущего. ВАЖНО: задайте свой через переменную окружения
// HOST_PASSWORD в настройках Render (Environment), а не прямо здесь —
// иначе он будет виден всем в публичном репозитории на GitHub.
const HOST_PASSWORD = process.env.HOST_PASSWORD || "nrave2026";

let roomsData = {};
let usersInRooms = {};
let roomHost = {}; // roomId -> socketId текущего ведущего, либо null

io.on("connection", (socket) => {
  console.log("Пользователь подключен:", socket.id);

  socket.on("joinRoom", (data) => {
    const rId = data.roomId || data;
    const name = data.nickname || "Смотрящий";
    socket.join(rId);

    if (!usersInRooms[rId]) usersInRooms[rId] = {};
    usersInRooms[rId][socket.id] = { name: name, time: 0 };

    if (roomsData[rId]) socket.emit("playerEvent", roomsData[rId]);
    socket.emit("hostAssigned", { hostId: roomHost[rId] || null });
    io.to(rId).emit("roomStatus", usersInRooms[rId]);
  });

  socket.on("updateMyStatus", (data) => {
    if (usersInRooms[data.roomId] && usersInRooms[data.roomId][socket.id]) {
      usersInRooms[data.roomId][socket.id].time = data.time;
      usersInRooms[data.roomId][socket.id].name = data.nickname;
      io.to(data.roomId).emit("roomStatus", usersInRooms[data.roomId]);
    }
  });

  // Стать ведущим можно только зная правильный пароль.
  // Проверка идёт на сервере — обойти её через консоль браузера нельзя.
  socket.on("claimHost", (data) => {
    const rId = data.roomId;
    if (data.password === HOST_PASSWORD) {
      roomHost[rId] = socket.id;
      io.to(rId).emit("hostAssigned", { hostId: socket.id });
    } else {
      socket.emit("hostDenied", { reason: "wrong_password" });
    }
  });

  socket.on("releaseHost", (data) => {
    const rId = data.roomId;
    if (roomHost[rId] === socket.id) {
      roomHost[rId] = null;
      io.to(rId).emit("hostAssigned", { hostId: null });
    }
  });

  socket.on("playerEvent", (data) => {
    // Игнорируем команды управления видео от кого угодно, кроме
    // подтверждённого сервером ведущего этой комнаты.
    if (roomHost[data.roomId] !== socket.id) return;
    roomsData[data.roomId] = data;
    socket.to(data.roomId).emit("playerEvent", data);
  });

  socket.on("message", (data) => {
    console.log("Сообщение:", data.text);
    io.to(data.roomId).emit("message", data);
  });

  socket.on("disconnect", () => {
    for (let rId in usersInRooms) {
      if (usersInRooms[rId][socket.id]) {
        delete usersInRooms[rId][socket.id];
        io.to(rId).emit("roomStatus", usersInRooms[rId]);
      }
    }
    // Если отключился ведущий — освобождаем корону, чтобы её можно
    // было забрать заново (в т.ч. ему самому после переподключения).
    for (let rId in roomHost) {
      if (roomHost[rId] === socket.id) {
        roomHost[rId] = null;
        io.to(rId).emit("hostAssigned", { hostId: null });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Сервер работает на порту", PORT));
