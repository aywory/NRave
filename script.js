// ═══════════════════════════════════════════
//  NRave — Multi-platform Watch Together
// ═══════════════════════════════════════════

const roomId = "nrave_private_room_777";
const socket = io("https://nrave.onrender.com");

// ── Состояние ──
let player = null;
let isHost = false;
let currentVideoId = "";
let currentPlatform = ""; // "youtube" | "vk" | "twitch" | "rutube" | "direct"
let hostActualState = "pause";
let isApiReady = false;
let pendingHostPwd = null; // пароль, который сейчас проверяется сервером
let silentHostAttempt = false; // true = автопопытка при подключении, ошибку не показываем

// ── Ник ──
// Базовое имя хранится отдельно от отображаемого — так корона 👑
// добавляется/убирается автоматически и не портит то, что ты вводишь.
let baseNickname =
  localStorage.getItem("chat_nickname_base") ||
  (localStorage.getItem("chat_nickname") || "").replace(/^👑\s*/, "") ||
  prompt("Ваше имя?", "Смотрящий");
if (!baseNickname) baseNickname = "Смотрящий";
localStorage.setItem("chat_nickname_base", baseNickname);

function getDisplayName() {
  return (isHost ? "👑 " : "") + baseNickname;
}

// ═══════════════════════════════════════════
//  ОПРЕДЕЛЕНИЕ ПЛАТФОРМЫ
// ═══════════════════════════════════════════

/**
 * Разбирает ссылку и возвращает объект:
 * { platform: "youtube"|"vk"|"twitch"|"direct", id: string, embedUrl: string }
 * или null если не распознана
 */
function parseVideoUrl(url) {
  url = url.trim();

  // YouTube
  const ytRegex =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch) {
    return { platform: "youtube", id: ytMatch[1], embedUrl: null };
  }

  // VK Video — несколько форматов, включая новый домен vkvideo.ru
  // https://vk.com/video-123456_789012
  // https://vk.com/video?z=video-123456_789012
  // https://vk.com/clip-123456_789012
  // https://vkvideo.ru/video-123456_789012
  // https://vk.com/someuser?z=video-123456_789012%2Fpl_cat_8
  if (/vk(?:video)?\.(?:com|ru)/i.test(url)) {
    const vkIdMatch = url.match(/(?:video|clip)(-?\d+_\d+)/);
    if (vkIdMatch) {
      const vkId = vkIdMatch[1];
      const [oid, vid] = vkId.split("_");
      // Некоторые видео (из закрытых групп/профилей) встраиваются ТОЛЬКО
      // если передать их персональный hash из исходной ссылки на видео
      let hashParam = "";
      const hashMatch = url.match(/[?&]hash=([a-zA-Z0-9]+)/);
      if (hashMatch) hashParam = `&hash=${hashMatch[1]}`;
      // Формируем embed ссылку VK (единственный формат, который реально
      // отдаёт только плеер, без остального интерфейса сайта)
      const embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2&autoplay=1${hashParam}`;
      return { platform: "vk", id: vkId, embedUrl };
    }
  }

  // Twitch канал: twitch.tv/channelname
  const twitchChannelRegex = /twitch\.tv\/([A-Za-z0-9_]+)(?:\/)?(?:$|\?)/;
  const twitchChannelMatch = url.match(twitchChannelRegex);
  if (
    twitchChannelMatch &&
    !url.includes("/videos/") &&
    !url.includes("/clip/")
  ) {
    const channel = twitchChannelMatch[1];
    const embedUrl = `https://player.twitch.tv/?channel=${channel}&${twitchParents()}&autoplay=true`;
    return { platform: "twitch", id: channel, embedUrl };
  }

  // Twitch VOD: twitch.tv/videos/12345
  const twitchVodRegex = /twitch\.tv\/videos\/(\d+)/;
  const twitchVodMatch = url.match(twitchVodRegex);
  if (twitchVodMatch) {
    const embedUrl = `https://player.twitch.tv/?video=v${twitchVodMatch[1]}&${twitchParents()}&autoplay=true`;
    return { platform: "twitch", id: "v" + twitchVodMatch[1], embedUrl };
  }

  // Rutube — https://rutube.ru/video/<hash>/ или уже готовая embed-ссылка
  // https://rutube.ru/play/embed/<hash>
  const rutubeRegex = /rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9]+)/;
  const rutubeMatch = url.match(rutubeRegex);
  if (rutubeMatch) {
    const rutubeId = rutubeMatch[1];
    const embedUrl = `https://rutube.ru/play/embed/${rutubeId}`;
    return { platform: "rutube", id: rutubeId, embedUrl };
  }

  // Прямой видеофайл (mp4, webm, m3u8)
  if (/\.(mp4|webm|m3u8|ogg)(\?.*)?$/i.test(url) || url.startsWith("blob:")) {
    return { platform: "direct", id: url, embedUrl: url };
  }

  // Ссылка не подходит ни под один из поддерживаемых сервисов.
  // Мы намеренно НЕ пытаемся вставить произвольный сайт в iframe "как есть" —
  // подавляющее большинство сайтов (кинотеатры, стриминги и т.п.) либо
  // запрещают встраивание через X-Frame-Options/CSP, либо, как в вашем
  // случае с Megogo, просто откроют внутри плеера всю страницу целиком
  // со своим меню и рекомендациями, а не чистое видео.
  return null;
}

// Twitch требует ТОЧНОЕ совпадение параметра parent с доменом,
// с которого встраивается плеер. Передаём сразу несколько вероятных
// вариантов (с www и без), чтобы не словить "видео недоступно".
function twitchParents() {
  const host = location.hostname || "localhost";
  const variants = new Set([host, "localhost"]);
  if (host.startsWith("www.")) variants.add(host.slice(4));
  else variants.add("www." + host);
  return Array.from(variants)
    .map((h) => `parent=${h}`)
    .join("&");
}

// ── Иконки платформ ──
const platformMeta = {
  youtube: { icon: "▶", label: "YouTube", cls: "yt" },
  vk: { icon: "🔵", label: "VK", cls: "vk" },
  twitch: { icon: "💜", label: "Twitch", cls: "tw" },
  rutube: { icon: "🟠", label: "Rutube", cls: "mp" },
  direct: { icon: "🎬", label: "MP4/HLS", cls: "mp" },
};

// Живое определение платформы при вводе
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("ytLink");
  const badge = document.getElementById("platformBadge");
  const icon = document.getElementById("platformIcon");

  if (input) {
    input.addEventListener("input", () => {
      const parsed = parseVideoUrl(input.value);
      if (parsed && platformMeta[parsed.platform]) {
        const meta = platformMeta[parsed.platform];
        badge.textContent = meta.label;
        badge.className = "platform-badge " + meta.cls;
        icon.textContent = meta.icon;
      } else {
        badge.textContent = "";
        badge.className = "platform-badge";
        icon.textContent = "🔗";
      }
    });
  }

  initEmojiPicker();

  // Инициализация мини-профиля
  const avatar = document.getElementById("profileAvatar");
  if (avatar) avatar.textContent = baseNickname.charAt(0).toUpperCase();
  renderHostControl();

  // Enter в поле имени = сохранить
  const nickInput = document.getElementById("nicknameInput");
  if (nickInput) {
    nickInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") saveNickname();
    });
  }
});

// ═══════════════════════════════════════════
//  YouTube IFrame API
// ═══════════════════════════════════════════
function onYouTubeIframeAPIReady() {
  isApiReady = true;
}

// ═══════════════════════════════════════════
//  ПОДКЛЮЧЕНИЕ
// ═══════════════════════════════════════════
socket.on("connect", () => {
  const dot = document.querySelector(".status-dot");
  if (dot) {
    dot.classList.add("online");
  }
  document.getElementById("status-text").innerText = "На связи";
  socket.emit("joinRoom", { roomId, nickname: getDisplayName() });

  // Если раньше уже вводили правильный пароль ведущего на этом устройстве —
  // пробуем автоматически восстановить корону молча, без запроса пароля.
  const savedPwd = localStorage.getItem("nrave_host_pwd");
  if (savedPwd) {
    pendingHostPwd = savedPwd;
    silentHostAttempt = true;
    socket.emit("claimHost", { roomId, password: savedPwd });
  }
});

socket.on("disconnect", () => {
  const dot = document.querySelector(".status-dot");
  if (dot) {
    dot.classList.remove("online", "host");
  }
  document.getElementById("status-text").innerText = "Переподключение...";
});

// ═══════════════════════════════════════════
//  ВЕДУЩИЙ (корона по паролю)
// ═══════════════════════════════════════════

// Сервер — единственный источник правды о том, кто ведущий.
// Это защищает от того, что кто угодно объявит себя ведущим локально.
socket.on("hostAssigned", (data) => {
  const wasHost = isHost;
  isHost = !!data.hostId && data.hostId === socket.id;

  if (isHost && pendingHostPwd) {
    localStorage.setItem("nrave_host_pwd", pendingHostPwd);
  }
  if (!isHost && wasHost) {
    // корону забрали / передали другому
  }
  pendingHostPwd = null;
  silentHostAttempt = false;

  updateHostUI();
});

socket.on("hostDenied", (data) => {
  const wasSilent = silentHostAttempt;
  pendingHostPwd = null;
  silentHostAttempt = false;
  if (wasSilent) {
    // сохранённый пароль больше не подходит — тихо забываем его
    localStorage.removeItem("nrave_host_pwd");
    return;
  }
  showError(
    data && data.reason === "wrong_password"
      ? "Неверный пароль ведущего"
      : "Не удалось стать ведущим",
  );
});

function requestHost() {
  const pwd = prompt("Введите пароль ведущего:");
  if (pwd === null || pwd === "") return;
  pendingHostPwd = pwd;
  silentHostAttempt = false;
  socket.emit("claimHost", { roomId, password: pwd });
}

function releaseHost() {
  localStorage.removeItem("nrave_host_pwd");
  socket.emit("releaseHost", { roomId });
}

function updateHostUI() {
  const dot = document.querySelector(".status-dot");
  const statusText = document.getElementById("status-text");
  const profileBtn = document.getElementById("profileBtn");
  const crownBadge = document.getElementById("crownBadge");

  if (isHost) {
    if (dot) {
      dot.classList.remove("online");
      dot.classList.add("host");
    }
    statusText.innerText = "Ведущий";
    if (profileBtn) profileBtn.classList.add("active");
    if (crownBadge) crownBadge.style.display = "block";
  } else {
    if (dot) {
      dot.classList.remove("host");
      dot.classList.add("online");
    }
    statusText.innerText = "На связи";
    if (profileBtn) profileBtn.classList.remove("active");
    if (crownBadge) crownBadge.style.display = "none";
  }

  // Сразу обновляем имя (с короной/без) у всех остальных
  socket.emit("updateMyStatus", {
    roomId,
    time: getCurrentTime() || 0,
    nickname: getDisplayName(),
  });

  renderHostControl();
}

function renderHostControl() {
  const area = document.getElementById("hostControlArea");
  if (!area) return;
  if (isHost) {
    area.innerHTML =
      '<p class="profile-host-status">👑 Вы ведущий</p>' +
      '<button class="btn btn-secondary" onclick="releaseHost()">Отдать корону</button>';
  } else {
    area.innerHTML =
      '<button class="btn btn-load" onclick="requestHost()">Стать ведущим</button>';
  }
}

// ═══════════════════════════════════════════
//  МИНИ-ПРОФИЛЬ (смена имени)
// ═══════════════════════════════════════════
function toggleProfilePanel() {
  const panel = document.getElementById("profilePanel");
  if (!panel) return;
  const opening = !panel.classList.contains("open");
  panel.classList.toggle("open");
  if (opening) {
    document.getElementById("nicknameInput").value = baseNickname;
    renderHostControl();
  }
}

function saveNickname() {
  const input = document.getElementById("nicknameInput");
  const val = input.value.trim().slice(0, 20);
  if (!val) return;
  baseNickname = val;
  localStorage.setItem("chat_nickname_base", baseNickname);
  const avatar = document.getElementById("profileAvatar");
  if (avatar) avatar.textContent = baseNickname.charAt(0).toUpperCase();
  socket.emit("updateMyStatus", {
    roomId,
    time: getCurrentTime() || 0,
    nickname: getDisplayName(),
  });
  document.getElementById("profilePanel").classList.remove("open");
}

// Закрываем панель профиля при клике вне неё
document.addEventListener("click", (e) => {
  const panel = document.getElementById("profilePanel");
  const wrap = document.querySelector(".profile-wrap");
  if (
    panel &&
    panel.classList.contains("open") &&
    wrap &&
    !wrap.contains(e.target)
  ) {
    panel.classList.remove("open");
  }
});

// ═══════════════════════════════════════════
//  ЗАГРУЗКА ВИДЕО
// ═══════════════════════════════════════════
function loadVideo() {
  const url = document.getElementById("ytLink").value.trim();
  if (!url) return;

  if (!isHost) {
    showError(
      "Только ведущий может загружать видео. Нажмите на профиль 🙂 и станьте ведущим.",
    );
    return;
  }

  const parsed = parseVideoUrl(url);
  if (!parsed) {
    showError(
      "Поддерживаются только YouTube, VK, Rutube, Twitch и прямые mp4/m3u8-ссылки.",
    );
    return;
  }

  initPlayer(parsed, 0);
  socket.emit("playerEvent", {
    roomId,
    action: "changeVideo",
    platform: parsed.platform,
    videoId: parsed.id,
    embedUrl: parsed.embedUrl,
    time: 0,
    state: "play",
  });
}

function showError(msg) {
  const el = document.getElementById("status-text");
  const prev = el.innerText;
  el.innerText = "⚠ " + msg;
  setTimeout(() => {
    el.innerText = prev;
  }, 3000);
}

// ═══════════════════════════════════════════
//  ИНИЦИАЛИЗАЦИЯ ПЛЕЕРА
// ═══════════════════════════════════════════
function hidePlayers() {
  document.getElementById("videoPlaceholder").style.display = "none";
  document.getElementById("yt-player-wrap").style.display = "none";
  document.getElementById("iframe-player-wrap").style.display = "none";
  document.getElementById("video-player-wrap").style.display = "none";
}

function initPlayer(parsed, startTime) {
  hidePlayers();
  currentVideoId = parsed.id;
  currentPlatform = parsed.platform;

  if (parsed.platform === "youtube") {
    initYTPlayer(parsed.id, startTime);
  } else if (parsed.platform === "direct") {
    initDirectPlayer(parsed.embedUrl, startTime);
  } else {
    // VK, Twitch, Rutube — все через универсальный iframe-плеер
    initIframePlayer(parsed.embedUrl);
  }
}

// ── YouTube ──
function initYTPlayer(videoId, startTime = 0) {
  if (player && typeof player.destroy === "function") {
    player.destroy();
    player = null;
  }

  document.getElementById("yt-player-wrap").style.display = "block";

  const tryInit = () => {
    player = new YT.Player("player", {
      height: "100%",
      width: "100%",
      videoId,
      playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1 },
      events: {
        onReady: (e) => {
          if (startTime > 0) e.target.seekTo(startTime);
          if (!isHost)
            document.getElementById("mobile-overlay").style.display = "flex";
        },
        onStateChange: (e) => {
          if (!isHost) return;
          if (e.data === YT.PlayerState.PLAYING) hostActualState = "play";
          if (e.data === YT.PlayerState.PAUSED) hostActualState = "pause";
          if (e.data === YT.PlayerState.BUFFERING) hostActualState = "pause";
        },
      },
    });
  };

  if (isApiReady) tryInit();
  else {
    const wait = setInterval(() => {
      if (isApiReady) {
        clearInterval(wait);
        tryInit();
      }
    }, 200);
  }
}

// ── iframe (VK, Twitch, generic) ──
function initIframePlayer(embedUrl) {
  document.getElementById("iframe-player-wrap").style.display = "block";
  const iframe = document.getElementById("genericIframe");
  iframe.src = embedUrl;
  if (!isHost) document.getElementById("mobile-overlay").style.display = "flex";
}

// ── Прямой файл ──
function initDirectPlayer(url, startTime = 0) {
  document.getElementById("video-player-wrap").style.display = "block";
  const video = document.getElementById("directVideo");
  video.src = url;
  video.currentTime = startTime;
  video.play().catch(() => {});

  if (isHost) {
    video.addEventListener("play", () => {
      hostActualState = "play";
    });
    video.addEventListener("pause", () => {
      hostActualState = "pause";
    });
  } else {
    document.getElementById("mobile-overlay").style.display = "flex";
  }
}

// ── Активация мобильного оверлея ──
function activateMobilePlayer() {
  document.getElementById("mobile-overlay").style.display = "none";
  if (
    currentPlatform === "youtube" &&
    player &&
    typeof player.playVideo === "function"
  ) {
    player.playVideo();
  } else if (currentPlatform === "direct") {
    document
      .getElementById("directVideo")
      .play()
      .catch(() => {});
  }
}

// ═══════════════════════════════════════════
//  ПОЛУЧЕНИЕ ТЕКУЩЕГО ВРЕМЕНИ
// ═══════════════════════════════════════════
function getCurrentTime() {
  if (
    currentPlatform === "youtube" &&
    player &&
    typeof player.getCurrentTime === "function"
  ) {
    return player.getCurrentTime();
  }
  if (currentPlatform === "direct") {
    const v = document.getElementById("directVideo");
    return v ? v.currentTime : 0;
  }
  return 0;
}

// ── Синхронизация от хоста → клиентам ──
setInterval(() => {
  if (!isHost) return;
  const t = getCurrentTime();
  if (t === null) return;
  socket.emit("playerEvent", {
    roomId,
    action: "syncTime",
    platform: currentPlatform,
    videoId: currentVideoId,
    time: t,
    state: hostActualState,
  });
}, 3000);

// ── Отправка своего времени для панели участников ──
setInterval(() => {
  const t = getCurrentTime();
  if (t === null) return;
  socket.emit("updateMyStatus", {
    roomId,
    time: t,
    nickname: getDisplayName(),
  });
}, 2000);

// ── Приём событий плеера ──
socket.on("playerEvent", (data) => {
  // Хост игнорирует всё кроме смены видео (от другого хоста)
  if (isHost && data.action !== "changeVideo") return;

  if (data.action === "changeVideo") {
    // Если другой хост загружает видео
    if (!isHost) {
      const parsed = {
        platform: data.platform,
        id: data.videoId,
        embedUrl: data.embedUrl,
      };
      initPlayer(parsed, data.time || 0);
    }
    return;
  }

  // syncTime
  if (
    data.platform === "youtube" &&
    player &&
    typeof player.getPlayerState === "function"
  ) {
    const state = player.getPlayerState();
    if (data.state === "play" && state !== YT.PlayerState.PLAYING)
      player.playVideo();
    if (data.state === "pause" && state !== YT.PlayerState.PAUSED)
      player.pauseVideo();

    const myTime = player.getCurrentTime();
    if (data.state === "play" && Math.abs(myTime - data.time) > 5) {
      player.seekTo(data.time, true);
    }
  }

  if (data.platform === "direct") {
    const v = document.getElementById("directVideo");
    if (!v) return;
    if (data.state === "play" && v.paused) v.play().catch(() => {});
    if (data.state === "pause" && !v.paused) v.pause();
    if (data.state === "play" && Math.abs(v.currentTime - data.time) > 5) {
      v.currentTime = data.time;
    }
  }
  // VK / Twitch через iframe — синхронизация через seekTo невозможна без postMessage API,
  // поэтому для них можно показывать время хоста как ориентир в панели участников.
});

// ═══════════════════════════════════════════
//  ПАНЕЛЬ УЧАСТНИКОВ
// ═══════════════════════════════════════════
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((v, i) => (i === 0 ? v : String(v).padStart(2, "0")))
    .join(":");
}

socket.on("roomStatus", (users) => {
  const panel = document.getElementById("user-times-panel");
  const counter = document.getElementById("onlineCount");
  if (!panel) return;

  const count = Object.keys(users).length;
  if (counter) counter.textContent = count + " онлайн";

  let html = "";
  for (const id in users) {
    const u = users[id];
    html += `<div class="user-badge">
      <span class="dot">●</span>
      <span>${u.name}</span>
      <span class="utime">${formatTime(u.time)}</span>
    </div>`;
  }
  panel.innerHTML = html;
});

// ═══════════════════════════════════════════
//  ЧАТ
// ═══════════════════════════════════════════
function sendMessage() {
  const input = document.getElementById("msgInput");
  const text = input.value.trim();
  if (!text || text.length > 500) return;
  const now = new Date();
  const timeStr =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");
  socket.emit("message", {
    roomId,
    text,
    user: getDisplayName(),
    senderId: socket.id,
    time: timeStr,
  });
  input.value = "";
}

socket.on("message", (data) => {
  const chat = document.getElementById("chat");
  const div = document.createElement("div");
  const isMine = data.senderId === socket.id;
  div.className = "msg" + (isMine ? " my-msg" : "");
  div.innerHTML = `
    <div class="msg-info">
      <b>${escapeHtml(data.user)}</b>
      <span class="msg-time">${data.time}</span>
    </div>
    <div class="msg-text">${escapeHtml(data.text)}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
});

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("msgInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
});

// ═══════════════════════════════════════════
//  ЭМОДЗИ
// ═══════════════════════════════════════════
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
  "🔥",
  "💯",
  "❤️",
  "🎉",
  "🍿",
  "🎬",
  "🎵",
  "⭐",
  "💎",
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
  if (picker) picker.classList.toggle("open");
}

// ═══════════════════════════════════════════
//  UI
// ═══════════════════════════════════════════
function toggleTopBar() {
  const bar = document.getElementById("topBar");
  const btn = document.getElementById("toggleBtn");
  bar.classList.toggle("hidden");
  btn.innerText = bar.classList.contains("hidden") ? "▼" : "▲";
}
