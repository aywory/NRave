const roomId = "nrave_private_room_777";
const socket = io("https://nrave.onrender.com");

let player = null,
  isHost = false,
  currentVideoId = "";
let hostActualState = "pause",
  lastReceivedState = "";

// Спрашиваем имя один раз при входе
let myNickname =
  localStorage.getItem("chat_nickname") ||
  prompt("Ваше имя для чата?", "Смотрящий");
if (!myNickname) myNickname = "Смотрящий";
localStorage.setItem("chat_nickname", myNickname);

// Создаем панель для отображения времени всех участников
const statusList = document.createElement("div");
statusList.id = "user-times-panel";
// Вставляем её после верхней панели
setTimeout(() => {
  const topBar = document.getElementById("topBar");
  if (topBar) topBar.after(statusList);
}, 500);

socket.on("connect", () => {
  document.getElementById("status-info").innerText = "✅ Подключено: " + roomId;
  // Отправляем имя при подключении
  socket.emit("joinRoom", { roomId, nickname: myNickname });
});

// Функция форматирования времени (00:00:00)
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00:00";
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
  hostActualState = "play";
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

// 1. СИНХРОНИЗАЦИЯ ХОЗЯИНА (раз в 4 сек)
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
}, 4000);

// 2. ОБНОВЛЕНИЕ СТАТУСА (отправляем свое время на сервер раз в 2 сек)
setInterval(() => {
  if (player && typeof player.getCurrentTime === "function") {
    socket.emit("updateMyStatus", {
      roomId,
      time: player.getCurrentTime(),
      nickname: myNickname,
    });
  }
}, 2000);

// Получаем данные о времени всех участников
socket.on("roomStatus", (users) => {
  if (!statusList) return;
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
    // Пауза / Плей
    if (data.state === "play") {
      if (lastReceivedState !== "play") {
        player.play();
        lastReceivedState = "play";
      }
    } else if (data.state === "pause") {
      if (lastReceivedState !== "pause") {
        player.pause();
        lastReceivedState = "pause";
      }
    }

    // МЯГКАЯ СИНХРОНИЗАЦИЯ: Порог 15 секунд, чтобы не дергало при плохом интернете
    if (data.state === "play") {
      let myTime = player.getCurrentTime();
      if (Math.abs(myTime - data.time) > 15) {
        player.seek(data.time + 1); // +1 сек компенсация задержки
      }
    }
  }
});

/* --- ЧАТ (ПОЛНЫЙ КОД) --- */
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (text === "" || text.length > 500) return;

  const now = new Date();
  const timeStr =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  socket.emit("message", {
    roomId,
    text,
    user: myNickname,
    time: timeStr,
  });
  input.value = "";
}

socket.on("message", (data) => {
  const chat = document.getElementById("chat");
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg";
  const userName = data.user || "Смотрящий";
  const userTime = data.time || "--:--";

  msgDiv.innerHTML = `
        <div class="msg-info">
            <b>${userName}</b>
            <span class="msg-time">${userTime}</span>
        </div>
        <div class="msg-text">${data.text}</div>
    `;

  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
});

document.getElementById("msgInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* --- СМАЙЛИКИ (ПОЛНЫЙ КОД) --- */
const emojiList = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "☹️",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "🤬",
  "🤯",
  "😳",
  "🥵",
  "🥶",
  "😱",
  "😨",
  "😰",
  "😥",
  "😓",
  "🤗",
  "🤔",
  "🤭",
  "🤫",
  "🤥",
  "😶",
  "😐",
  "😑",
  "😬",
  "🙄",
  "😯",
  "😦",
  "😧",
  "😮",
  "😲",
  "🥱",
  "😴",
  "🤤",
  "😪",
  "😵",
  "🤐",
  "🥴",
  "🤢",
  "🤮",
  "🤧",
  "😷",
  "🤒",
  "🤕",
  "🤑",
  "🤠",
  "😈",
  "👿",
  "👹",
  "👺",
  "🤡",
  "👻",
  "💀",
  "☠️",
  "👽",
  "👾",
  "🤖",
  "🎃",
  "😺",
  "😸",
  "😹",
  "😻",
  "😼",
  "😽",
  "🙀",
  "😿",
  "😾",
  "🙌",
  "👏",
  "👍",
  "👎",
  "👊",
  "✊",
  "👋",
  "💪",
  "🙏",
];

function initEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  if (!picker) return;
  emojiList.forEach((emoji) => {
    const span = document.createElement("span");
    span.className = "emoji-item";
    span.innerText = emoji;
    span.onclick = () => {
      const input = document.getElementById("msgInput");
      input.value += emoji;
      input.focus();
    };
    picker.appendChild(span);
  });
}

function toggleEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  const isVisible = picker.style.display === "grid";
  picker.style.display = isVisible ? "none" : "grid";
}

initEmojiPicker();

/* --- ИСПРАВЛЕНИЯ ИНТЕРФЕЙСА --- */
function toggleTopBar() {
  const bar = document.getElementById("topBar");
  const btn = document.getElementById("toggleBtn");
  if (bar.classList.contains("hidden")) {
    bar.classList.remove("hidden");
    btn.innerText = "▲";
  } else {
    bar.classList.add("hidden");
    btn.innerText = "▼";
  }
}

if (window.visualViewport) {
  const iosFix = () => {
    document.getElementById("app-root").style.height =
      window.visualViewport.height + "px";
    window.scrollTo(0, 0);
  };
  window.visualViewport.addEventListener("resize", iosFix);
}
