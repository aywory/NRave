/* 1. НАСТРОЙКИ СЕРВЕРА */
const roomId = "nrave_private_room_777";
const socket = io("https://nrave.onrender.com"); // Ваш адрес на Render

let player = null;
let isHost = false;
let currentVideoId = "";
let hostActualState = "pause";
let lastReceivedState = "";
let myNickname = "Гость " + Math.floor(Math.random() * 1000);

/* 2. ПОДКЛЮЧЕНИЕ */
socket.on("connect", () => {
  document.getElementById("status-info").innerText = "✅ Подключено: " + roomId;
  socket.emit("joinRoom", roomId);
});

function setMeAsHost() {
  isHost = true;
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
  } else {
    alert("Вставьте корректную ссылку на видео ВК");
  }
}

/* 3. РАБОТА С ПЛЕЕРОМ */
function initPlayer(videoId, startTime = 0) {
  currentVideoId = videoId;
  const container = document.getElementById("player-container");
  const parts = videoId.split("_");
  const iframe = document.createElement("iframe");

  // Параметры для автоплея и API
  iframe.src = `https://vk.com/video_ext.php?oid=${parts[0]}&id=${parts[1]}&js_api=1&autoplay=1`;
  iframe.allow = "autoplay; encrypted-media; fullscreen";
  container.innerHTML = "";
  container.appendChild(iframe);

  // Если мы не хост, показываем кнопку "Нажать для старта" (нужно для мобильных)
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
      console.error("VK API Error:", e);
    }
  }, 600);
}

function activateMobilePlayer() {
  document.getElementById("mobile-overlay").style.display = "none";
  lastReceivedState = "";
  if (player) player.play();
}

/* 4. СИНХРОНИЗАЦИЯ */
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
}, 2000);

socket.on("playerEvent", (data) => {
  if (isHost && data.action !== "changeVideo") return;

  if (data.action === "changeVideo") {
    if (data.videoId !== currentVideoId) initPlayer(data.videoId, data.time);
    return;
  }

  if (player) {
    if (data.state === "play" && lastReceivedState !== "play") {
      player.play();
      lastReceivedState = "play";
    } else if (data.state === "pause" && lastReceivedState !== "pause") {
      player.pause();
      lastReceivedState = "pause";
    }

    // Коррекция времени (если разрыв больше 3 сек)
    if (data.state === "play") {
      let myTime = player.getCurrentTime();
      if (Math.abs(myTime - data.time) > 3) {
        player.seek(data.time);
      }
    }
  }
});

/* 5. ЧАТ */
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (text !== "") {
    socket.emit("message", { roomId, text, user: myNickname });
    input.value = "";
  }
}

socket.on("message", (data) => {
  const chat = document.getElementById("chat");
  const msgDiv = document.createElement("div");
  msgDiv.className = "msg";
  msgDiv.innerHTML = `<b>${data.user}:</b> ${data.text}`;
  chat.appendChild(msgDiv);
  chat.scrollTop = chat.scrollHeight;
});

document.getElementById("msgInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* 6. ФИКС ДЛЯ IPHONE (высота экрана) */
if (window.visualViewport) {
  const iosFix = () => {
    document.getElementById("app-root").style.height =
      window.visualViewport.height + "px";
    window.scrollTo(0, 0);
  };
  window.visualViewport.addEventListener("resize", iosFix);
}
