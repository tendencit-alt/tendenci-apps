const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

// Janela propria do TENDENCI. Carrega o sistema em producao,
// entao todo deploy no Vercel chega no app sem reinstalar nada.
const APP_URL = "https://www.tendencitech.com.br";

let win = null;
let retry = null;

const OFFLINE = "data:text/html;charset=utf-8," + encodeURIComponent(
  "<body style='margin:0;height:100vh;display:flex;align-items:center;" +
  "justify-content:center;background:#16181d;color:#9ca3af;" +
  "font:14px system-ui,sans-serif'>Sem conexao. Tentando novamente...</body>"
);

function load() {
  if (retry) { clearTimeout(retry); retry = null; }
  if (win) win.loadURL(APP_URL);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: "TENDENCI",
    backgroundColor: "#16181d",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });

  load();

  // Link externo abre no navegador padrao, nunca dentro do app.
  win.webContents.setWindowOpenHandler(function (d) {
    if (d.url.indexOf(APP_URL) !== 0) { shell.openExternal(d.url); return { action: "deny" }; }
    return { action: "allow" };
  });

  win.webContents.on("will-navigate", function (e, url) {
    if (url.indexOf(APP_URL) !== 0 && url.indexOf("data:") !== 0) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // Sem internet: mostra aviso e tenta de novo sozinho.
  win.webContents.on("did-fail-load", function (e, code, desc, url, isMainFrame) {
    if (!isMainFrame || code === -3) return;
    win.loadURL(OFFLINE);
    retry = setTimeout(load, 4000);
  });

  win.on("closed", function () { win = null; });
}

const lock = app.requestSingleInstanceLock();

if (!lock) {
  app.quit();
} else {
  app.on("second-instance", function () {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(createWindow);
  app.on("activate", function () { if (win === null) createWindow(); });
  app.on("window-all-closed", function () { if (process.platform !== "darwin") app.quit(); });
}
