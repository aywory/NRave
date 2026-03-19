const roomId = "nrave_private_room_777";
const socket = io("https://nrave.onrender.com");

let player = null,
  isHost = false,
  currentVideoId = "";
let hostActualState = "pause",
  lastReceivedState = "";
let myNickname = "Смотрящий";

socket.on("connect", () => {
  document.getElementById("status-info").innerText = "✅ Подключено: " + roomId;
  socket.emit("joinRoom", roomId);
});

function setMeAsHost() {
  isHost = true;
  myNickname = "Хозяин";
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
  }, 600);
}

function activateMobilePlayer() {
  document.getElementById("mobile-overlay").style.display = "none";
  if (player) player.play();
}

// Синхронизация
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

socket.on("playerEvent", (data) => {
  if (isHost && data.action !== "changeVideo") return;

  if (data.action === "changeVideo") {
    if (data.videoId !== currentVideoId) initPlayer(data.videoId, data.time);
    return;
  }

  if (player) {
    // 1. Синхронизируем состояние ПАУЗА/ПЛЕЙ только если оно реально изменилось
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

    // 2. Синхронизируем время ТОЛЬКО если разрыв реально огромный
    // 65 мбит интернета позволяют другу буферизировать видео,
    // поэтому дадим ему окно в 10 секунд, чтобы плеер не дергался.
    if (data.state === "play") {
      let myTime = player.getCurrentTime();
      if (Math.abs(myTime - data.time) > 10) {
        player.seek(data.time);
      }
    }
  }
});

/* --- ЧАТ (С ЛИМИТОМ) --- */
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (text === "" || text.length > 500) return;

  // Генерируем текущее время
  const now = new Date();
  const timeStr =
    now.getHours().toString().padStart(2, "0") +
    ":" +
    now.getMinutes().toString().padStart(2, "0");

  socket.emit("message", {
    roomId,
    text,
    user: myNickname,
    time: timeStr, // Отправляем время всем
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

if (window.visualViewport) {
  const iosFix = () => {
    document.getElementById("app-root").style.height =
      window.visualViewport.height + "px";
    window.scrollTo(0, 0);
  };
  window.visualViewport.addEventListener("resize", iosFix);
}

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

// Запуск инициализации смайлов
initEmojiPicker();

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
