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

let roomsData = {};
let usersInRooms = {};

io.on("connection", (socket) => {
  console.log("Пользователь подключен:", socket.id);

  socket.on("joinRoom", (data) => {
    const rId = data.roomId || data;
    const name = data.nickname || "Смотрящий";
    socket.join(rId);

    if (!usersInRooms[rId]) usersInRooms[rId] = {};
    usersInRooms[rId][socket.id] = { name: name, time: 0 };

    if (roomsData[rId]) socket.emit("playerEvent", roomsData[rId]);
    io.to(rId).emit("roomStatus", usersInRooms[rId]);
  });

  socket.on("updateMyStatus", (data) => {
    if (usersInRooms[data.roomId] && usersInRooms[data.roomId][socket.id]) {
      usersInRooms[data.roomId][socket.id].time = data.time;
      usersInRooms[data.roomId][socket.id].name = data.nickname;
      io.to(data.roomId).emit("roomStatus", usersInRooms[data.roomId]);
    }
  });

  socket.on("playerEvent", (data) => {
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
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Сервер работает на порту", PORT));
