@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500&display=swap');

:root {
  --bg:        #080c10;
  --bg-panel:  #0e1318;
  --bg-card:   #141b22;
  --bg-input:  #1a2330;
  --border:    rgba(255,255,255,0.07);
  --accent:    #4f8ef7;
  --accent2:   #7c5cfc;
  --green:     #2ea043;
  --text:      #e8eef5;
  --text-dim:  #5a6878;
  --text-mid:  #8fa0b5;
  --radius:    12px;
  --radius-lg: 18px;
  --shadow:    0 8px 32px rgba(0,0,0,0.5);
}

*, *::before, *::after { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

body, html {
  margin: 0; padding: 0;
  width: 100%; height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  overflow: hidden;
  position: fixed;
}

/* ══════════ LAYOUT ══════════ */
#app-root {
  display: flex;
  width: 100%;
  height: 100%;
}

.main-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-width: 0;
  background: var(--bg);
}

/* ══════════ HEADER ══════════ */
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: all .3s ease;
}

.top-bar.hidden { display: none !important; }

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.logo-text {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* URL форма */
.url-form {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-grow: 1;
  min-width: 0;
}

.url-input-wrap {
  display: flex;
  align-items: center;
  flex-grow: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  gap: 8px;
  transition: border-color .2s;
  min-width: 0;
}

.url-input-wrap:focus-within {
  border-color: rgba(79, 142, 247, 0.5);
  box-shadow: 0 0 0 3px rgba(79, 142, 247, 0.08);
}

.url-icon { font-size: 16px; flex-shrink: 0; }

.url-input-wrap input {
  flex-grow: 1;
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  padding: 10px 0;
  outline: none;
  min-width: 0;
}

.url-input-wrap input::placeholder { color: var(--text-dim); }

.platform-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .5px;
  padding: 2px 7px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: all .2s;
}
.platform-badge.yt  { background: rgba(255,0,0,.15); color: #ff4444; }
.platform-badge.vk  { background: rgba(74,118,168,.2); color: #71aaeb; }
.platform-badge.tw  { background: rgba(145,70,255,.2); color: #b580ff; }
.platform-badge.mp  { background: rgba(79,242,151,.15); color: #4ff297; }

/* Правая часть хедера */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 12px;
  color: var(--text-mid);
  white-space: nowrap;
}

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-dim);
  transition: background .3s;
}
.status-dot.online { background: #4ff297; box-shadow: 0 0 6px #4ff29780; }
.status-dot.host   { background: #ffd700; box-shadow: 0 0 6px #ffd70080; }

/* ══════════ КНОПКИ ══════════ */
.btn {
  border: none;
  border-radius: var(--radius);
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: all .2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-load {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  padding: 10px 18px;
  font-size: 14px;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-load:hover { opacity: .9; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,142,247,.3); }
.btn-load:active { transform: translateY(0); }

.btn-host {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text);
  width: 38px; height: 38px;
  padding: 0;
  justify-content: center;
  border-radius: var(--radius);
  font-size: 16px;
}
.btn-host:hover { border-color: rgba(255,215,0,.3); background: rgba(255,215,0,.08); }
.btn-host.active { border-color: #ffd700; background: rgba(255,215,0,.12); box-shadow: 0 0 12px rgba(255,215,0,.2); }

.btn-toggle {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-dim);
  width: 32px; height: 32px;
  padding: 0;
  justify-content: center;
  border-radius: 8px;
  font-size: 11px;
}
.btn-toggle:hover { color: var(--text); border-color: rgba(255,255,255,.15); }

/* ══════════ УЧАСТНИКИ ══════════ */
#user-times-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  min-height: 36px;
  flex-shrink: 0;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--text-mid);
  background: var(--bg-input);
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--border);
}

.user-badge .dot { color: #4ff297; font-size: 8px; }
.user-badge .utime { color: var(--accent); font-weight: 600; }

/* ══════════ ВИДЕО ══════════ */
.video-box {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
  position: relative;
}

.video-ratio {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-ratio iframe,
.video-ratio video,
.video-ratio > div[id$="-wrap"] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* Заглушка */
.video-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #0e1520 0%, #080c10 70%);
  z-index: 2;
}

.placeholder-inner {
  text-align: center;
  padding: 32px;
  max-width: 400px;
}

.placeholder-icon {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: .6;
}

.placeholder-title {
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 8px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.placeholder-hint {
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 24px;
}

.supported-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.platform-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 20px;
  letter-spacing: .3px;
}
.platform-tag.yt { background: rgba(255,0,0,.12); color: #ff6060; border: 1px solid rgba(255,0,0,.2); }
.platform-tag.vk { background: rgba(74,118,168,.15); color: #71aaeb; border: 1px solid rgba(74,118,168,.25); }
.platform-tag.tw { background: rgba(145,70,255,.12); color: #b580ff; border: 1px solid rgba(145,70,255,.2); }
.platform-tag.mp { background: rgba(79,242,151,.1); color: #4ff297; border: 1px solid rgba(79,242,151,.2); }

/* Мобильный оверлей */
#mobile-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.85);
  backdrop-filter: blur(4px);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 100;
  cursor: pointer;
}

.overlay-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.overlay-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  box-shadow: 0 8px 32px rgba(79,142,247,.4);
}

/* ══════════ САЙДБАР (ЧАТ) ══════════ */
.sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sidebar-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: -.3px;
}

.online-count {
  font-size: 11px;
  color: #4ff297;
  background: rgba(79,242,151,.1);
  border: 1px solid rgba(79,242,151,.2);
  padding: 2px 8px;
  border-radius: 12px;
}

/* ЧАТ */
#chat {
  flex-grow: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

#chat::-webkit-scrollbar { width: 3px; }
#chat::-webkit-scrollbar-track { background: transparent; }
#chat::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 10px; }

/* Сообщения */
.msg {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 95%;
  word-wrap: break-word;
  overflow-wrap: anywhere;
  animation: msgIn .2s ease;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.msg.my-msg {
  background: rgba(79, 142, 247, 0.1);
  border-color: rgba(79, 142, 247, 0.2);
  align-self: flex-end;
}

.msg-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
}

.msg-info b { color: var(--accent); font-size: 12px; font-weight: 600; }
.msg-time   { font-size: 10px; color: var(--text-dim); margin-left: auto; }
.msg-text   { color: var(--text); line-height: 1.4; font-size: 13px; }

/* Системные сообщения */
.msg.sys-msg {
  background: transparent;
  border: none;
  text-align: center;
  color: var(--text-dim);
  font-size: 11px;
  padding: 2px 0;
}

/* Эмодзи пикер */
.emoji-picker {
  display: none;
  grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
  gap: 2px;
  padding: 10px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  max-height: 180px;
  overflow-y: auto;
  flex-shrink: 0;
}

.emoji-picker.open { display: grid; }

.emoji-picker::-webkit-scrollbar { width: 3px; }
.emoji-picker::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }

.emoji-item {
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  text-align: center;
  transition: background .15s;
}
.emoji-item:hover { background: rgba(255,255,255,.08); }

/* Футер чата */
.footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.emoji-btn {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  flex-shrink: 0;
  transition: background .15s;
  line-height: 1;
}
.emoji-btn:hover { background: var(--bg-input); }

#msgInput {
  flex-grow: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 20px;
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  outline: none;
  transition: border-color .2s;
}
#msgInput:focus { border-color: rgba(79,142,247,.4); }
#msgInput::placeholder { color: var(--text-dim); }

.send-btn {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  border: none;
  width: 38px; height: 38px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s;
}
.send-btn:hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(79,142,247,.35); }
.send-btn:active { transform: scale(.96); }

/* ══════════ MOBILE ══════════ */
@media (max-width: 900px) {
  #app-root { flex-direction: column; }

  .main-content { flex-grow: 0; width: 100%; }

  .sidebar {
    width: 100%;
    flex-grow: 1;
    border-left: none;
    border-top: 1px solid var(--border);
  }

  .video-box {
    width: 100%;
    aspect-ratio: 16/9;
    flex-grow: 0;
  }

  .video-ratio { aspect-ratio: 16/9; height: auto; }

  .top-bar { display: none; }

  .logo-text { font-size: 16px; }

  .url-form { flex-grow: 1; }

  .btn-load { padding: 8px 12px; font-size: 13px; }
}

@media (max-width: 600px) {
  .logo { display: none; }
}