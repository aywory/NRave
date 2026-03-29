const roomId = "nrave_private_room_777";
const socket = io("https://nrave.onrender.com");

let player = null,
  isHost = false,
  currentVideoId = "";
let hostActualState = "pause";
let isApiReady = false;

// Имя пользователя
let myNickname =
  localStorage.getItem("chat_nickname") || prompt("Ваше имя?", "Смотрящий");
if (!myNickname) myNickname = "Смотрящий";
localStorage.setItem("chat_nickname", myNickname);

// Панель времени
const statusList = document.createElement("div");
statusList.id = "user-times-panel";
setTimeout(() => {
  const topBar = document.getElementById("topBar");
  if (topBar) topBar.after(statusList);
}, 800);

// Инициализация YouTube API
function onYouTubeIframeAPIReady() {
  isApiReady = true;
  console.log("YouTube API Ready");
}

socket.on("connect", () => {
  document.getElementById("status-info").innerText = "✅ На связи";
  socket.emit("joinRoom", { roomId, nickname: myNickname });
});

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
  document.getElementById("status-info").innerText = "⭐ Вы главный";
}

function extractVideoId(url) {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function loadVideo() {
  const link = document.getElementById("ytLink").value;
  const videoId = extractVideoId(link);
  if (videoId) {
    currentVideoId = videoId;
    setMeAsHost();
    initYTPlayer(videoId);
    socket.emit("playerEvent", {
      roomId,
      action: "changeVideo",
      videoId: videoId,
      time: 0,
      state: "play",
    });
  } else {
    alert("Неверная ссылка на YouTube");
  }
}

function initYTPlayer(videoId, startTime = 0) {
  if (player) {
    player.destroy();
  }

  currentVideoId = videoId;
  player = new YT.Player("player", {
    height: "100%",
    width: "100%",
    videoId: videoId,
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1, // ВОТ ЭТО добавлено для iPhone
    },
    events: {
      onReady: (event) => {
        if (startTime > 0) event.target.seekTo(startTime);
        if (!isHost)
          document.getElementById("mobile-overlay").style.display = "flex";
      },
      onStateChange: (event) => {
        if (isHost) {
          if (event.data === YT.PlayerState.PLAYING) hostActualState = "play";
          if (event.data === YT.PlayerState.PAUSED) hostActualState = "pause";
          if (event.data === YT.PlayerState.BUFFERING)
            hostActualState = "pause";
        }
      },
    },
  });
}
function activateMobilePlayer() {
  document.getElementById("mobile-overlay").style.display = "none";
  if (player && typeof player.playVideo === "function") player.playVideo();
}

// Отправка данных ХОЗЯИНА
setInterval(() => {
  if (isHost && player && typeof player.getCurrentTime === "function") {
    socket.emit("playerEvent", {
      roomId,
      action: "syncTime",
      time: player.getCurrentTime(),
      videoId: currentVideoId,
      state: hostActualState,
    });
  }
}, 3000);

// Отправка СТАТУСА времени участников
setInterval(() => {
  if (player && typeof player.getCurrentTime === "function") {
    socket.emit("updateMyStatus", {
      roomId,
      time: player.getCurrentTime(),
      nickname: myNickname,
    });
  }
}, 2000);

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
    if (data.videoId !== currentVideoId) initYTPlayer(data.videoId, data.time);
    return;
  }

  if (player && typeof player.getPlayerState === "function") {
    // Синхронизация паузы/плей
    if (
      data.state === "play" &&
      player.getPlayerState() !== YT.PlayerState.PLAYING
    ) {
      player.playVideo();
    } else if (
      data.state === "pause" &&
      player.getPlayerState() !== YT.PlayerState.PAUSED
    ) {
      player.pauseVideo();
    }

    // Синхронизация времени: Порог 5 секунд (Ютуб быстрее и точнее ВК)
    let myTime = player.getCurrentTime();
    if (data.state === "play" && Math.abs(myTime - data.time) > 5) {
      player.seekTo(data.time, true);
    }
  }
});

/* ЧАТ */
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || text.length > 500) return;
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

/* ЭМОДЗИ */
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
  "😍",
  "🥰",
  "😘",
  "😋",
  "😛",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "😎",
  "🤩",
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
  picker.innerHTML = "";
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
  if (picker) {
    const isVisible = picker.style.display === "grid";
    picker.style.display = isVisible ? "none" : "grid";
  }
}

window.onload = () => {
  initEmojiPicker();
};

function toggleTopBar() {
  const bar = document.getElementById("topBar");
  const btn = document.getElementById("toggleBtn");
  bar.classList.toggle("hidden");
  btn.innerText = bar.classList.contains("hidden") ? "▼" : "▲";
}

// Сброс скролла при фокусе на инпут (фикс для iOS)
document.getElementById("msgInput").addEventListener("focus", () => {
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;
});
