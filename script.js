const roomId = "nrave_private_room_777";
const socket = io("https://nrave.onrender.com");

let player = null,
  isHost = false,
  currentVideoId = "";
let hostActualState = "pause",
  lastReceivedState = "";
let myNickname = prompt("Ваше имя?", "Зритель") || "Зритель";

// UI для отображения времени участников
const statusList = document.createElement("div");
statusList.id = "user-times";
document.querySelector(".top-bar").after(statusList);

socket.on("connect", () => {
  document.getElementById("status-info").innerText = "✅ Подключено";
  socket.emit("joinRoom", { roomId, nickname: myNickname });
});

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => (v < 10 ? "0" + v : v)).join(":");
}

function setMeAsHost() {
  isHost = true;
  myNickname = "👑 " + myNickname.replace("👑 ", "");
  document.getElementById("hostBtn").style.background = "#ff9800";
  document.getElementById("status-info").innerText = "⭐ Вы управляете видео";
}

function loadVideo() {
  const link = document.getElementById("vkLink").value;
  const match = link.match(/video(-?\d+_\d+)/);
  if (match) {
    currentVideoId = match[1];
    setMeAsHost();
    initPlayer(currentVideoId);
    socket.emit("playerEvent", {
      roomId,
      action: "changeVideo",
      videoId: currentVideoId,
      time: 0,
      state: "play",
    });
  }
}

function initPlayer(videoId, startTime = 0) {
  currentVideoId = videoId;
  const container = document.getElementById("player-container");
  const parts = videoId.split("_");
  const iframe = document.createElement("iframe");
  iframe.src = `https://vk.com/video_ext.php?oid=${parts[0]}&id=${parts[1]}&js_api=1&autoplay=1`;
  iframe.allow = "autoplay; encrypted-media; fullscreen";
  container.innerHTML = "";
  container.appendChild(iframe);

  if (!isHost) document.getElementById("mobile-overlay").style.display = "flex";

  setTimeout(() => {
    try {
      player = new VK.VideoPlayer(iframe);
      player.on("inited", () => {
        if (startTime > 0) player.seek(startTime);
        player.on("started", () => {
          if (isHost) hostActualState = "play";
        });
        player.on("resumed", () => {
          if (isHost) hostActualState = "play";
        });
        player.on("paused", () => {
          if (isHost) hostActualState = "pause";
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, 1000);
}

function activateMobilePlayer() {
  document.getElementById("mobile-overlay").style.display = "none";
  if (player) player.play();
}

// 1. Отправка данных ХОЗЯИНА для синхронизации (раз в 3 сек)
setInterval(() => {
  if (isHost && player) {
    socket.emit("playerEvent", {
      roomId,
      action: "syncTime",
      time: player.getCurrentTime(),
      videoId: currentVideoId,
      state: hostActualState,
    });
  }
}, 3000);

// 2. Отправка ЛЮБОГО игрока на сервер для списка "кто где" (раз в 2 сек)
setInterval(() => {
  if (player && player.getCurrentTime) {
    socket.emit("updateMyStatus", {
      roomId,
      time: player.getCurrentTime(),
      nickname: myNickname,
    });
  }
}, 2000);

// Принимаем статус комнаты
socket.on("roomStatus", (users) => {
  let html = "";
  for (let id in users) {
    const u = users[id];
    html += `<div class="user-badge">● ${u.name}: <span>${formatTime(u.time)}</span></div>`;
  }
  statusList.innerHTML = html;
});

socket.on("playerEvent", (data) => {
  if (isHost && data.action !== "changeVideo") return;

  if (data.action === "changeVideo") {
    if (data.videoId !== currentVideoId) initPlayer(data.videoId, data.time);
    return;
  }

  if (player) {
    // Синхронизация состояния (Play/Pause)
    if (data.state === "play" && lastReceivedState !== "play") {
      player.play();
      lastReceivedState = "play";
    } else if (data.state === "pause" && lastReceivedState !== "pause") {
      player.pause();
      lastReceivedState = "pause";
    }

    // МЯГКАЯ СИНХРОНИЗАЦИЯ ВРЕМЕНИ
    // Если разница больше 15 секунд — значит друг сильно отстал/убежал, перематываем.
    // Если меньше — не трогаем, пусть буферизуется спокойно.
    let myTime = player.getCurrentTime();
    let diff = Math.abs(myTime - data.time);

    if (data.state === "play" && diff > 15) {
      console.log("Синхронизация: прыжок на " + diff + " сек");
      player.seek(data.time + 1); // +1 сек на компенсацию задержки сети
    }
  }
});

/* ЧАТ БЕЗ ИЗМЕНЕНИЙ ( sendMessage / socket.on("message") ) */
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (text === "" || text.length > 500) return;
  const now = new Date();
  const timeStr =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");
  socket.emit("message", { roomId, text, user: myNickname, time: timeStr });
  input.value = "";
}

socket.on("message", (data) => {
  const chat = document.getElementById("chat");
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg";
  msgDiv.innerHTML = `<div class="msg-info"><b>${data.user}</b><span class="msg-time">${data.time}</span></div><div class="msg-text">${data.text}</div>`;
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
});
document.getElementById("msgInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
initEmojiPicker();

function toggleTopBar() {
  const bar = document.getElementById("topBar");
  const btn = document.getElementById("toggleBtn");
  bar.classList.toggle("hidden");
  btn.innerText = bar.classList.contains("hidden") ? "▼" : "▲";
}
