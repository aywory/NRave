function loadVideo() {
  const link = document.getElementById("vkLink").value;
  // Исправленное регулярное выражение, которое понимает и m.vkvideo.ru и vk.com
  const match = link.match(/video(-?\d+_\d+)/);

  if (match) {
    const videoId = match[1]; // Получим что-то вроде -56169357_456266703
    console.log("ID видео найден:", videoId);
    initPlayer(videoId);

    // Отправляем всем в комнате, что мы сменили видео
    socket.emit("playerEvent", {
      roomId: roomId,
      action: "changeVideo",
      videoId: videoId,
    });
  } else {
    alert(
      "Неверная ссылка на видео ВК. Убедитесь, что в ссылке есть слово 'video' и цифры.",
    );
  }
}

function initPlayer(videoId) {
  const parts = videoId.split("_");
  const oid = parts[0];
  const vid = parts[1];

  const container = document.getElementById("vk_player");
  container.innerHTML = ""; // Очищаем старое видео

  // Создаем плеер
  player = new VK.VideoPlayer(container, {
    oid: oid,
    id: vid,
    width: "100%", // Растянуть на всю ширину
    height: 450,
    autoplay: 1,
  });

  // Слушаем события (когда плеер будет готов)
  player.on("inited", () => {
    console.log("Плеер готов к работе");
  });
}

// Добавим в обработчик socket.on('playerEvent') поддержку смены видео:
socket.on("playerEvent", (data) => {
  if (data.action === "changeVideo") {
    initPlayer(data.videoId);
  }
  if (player) {
    if (data.action === "play") player.play();
    if (data.action === "pause") player.pause();
  }
});
