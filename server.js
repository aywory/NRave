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
let usersInRooms = {}; // Храним данные пользователей: { roomId: { socketId: { name, time } } }

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, nickname }) => {
    socket.join(roomId);
    if (!usersInRooms[roomId]) usersInRooms[roomId] = {};

    usersInRooms[roomId][socket.id] = { name: nickname, time: 0 };

    if (roomsData[roomId]) {
      socket.emit("playerEvent", roomsData[roomId]);
    }
    broadcastStatus(roomId);
  });

  socket.on("updateMyStatus", ({ roomId, time, nickname }) => {
    if (usersInRooms[roomId] && usersInRooms[roomId][socket.id]) {
      usersInRooms[roomId][socket.id].time = time;
      usersInRooms[roomId][socket.id].name = nickname;
      broadcastStatus(roomId);
    }
  });

  socket.on("playerEvent", (data) => {
    roomsData[data.roomId] = data;
    socket.to(data.roomId).emit("playerEvent", data);
  });

  socket.on("message", (data) => {
    io.to(data.roomId).emit("message", data);
  });

  socket.on("disconnect", () => {
    for (let roomId in usersInRooms) {
      if (usersInRooms[roomId][socket.id]) {
        delete usersInRooms[roomId][socket.id];
        broadcastStatus(roomId);
      }
    }
  });

  function broadcastStatus(roomId) {
    io.to(roomId).emit("roomStatus", usersInRooms[roomId]);
  }
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log("Сервер запущен"));
