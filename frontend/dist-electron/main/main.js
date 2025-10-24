import { app as n, protocol as w, BrowserWindow as u, ipcMain as l, Notification as g, nativeTheme as s } from "electron";
import i from "node:path";
import { fileURLToPath as b } from "node:url";
const f = process.env.VITE_DEV_SERVER_URL, c = !!f, x = b(import.meta.url), m = i.dirname(x);
let e = null;
function h() {
  const a = c ? i.join(m, "preload.js") : i.join(m, "../preload/preload.js");
  if (e = new u({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "Hype",
    backgroundColor: s.shouldUseDarkColors ? "#202225" : "#ffffff",
    webPreferences: {
      preload: a,
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !1,
      webSecurity: !1
      // Отключаем для доступа к файлам
    }
  }), c || e.webContents.session.webRequest.onHeadersReceived((o, t) => {
    t({
      responseHeaders: {
        ...o.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' app: file: data: blob: https://rtc.pestov-web.ru wss://ws.pestov-web.ru"
        ]
      }
    });
  }), c && f)
    e.loadURL(f), e.webContents.openDevTools({ mode: "detach" });
  else {
    const o = n.getAppPath(), t = i.join(o, "dist", "index.html");
    console.log("=== Electron Production Debug ==="), console.log("__dirname:", m), console.log("app.getAppPath():", o), console.log("Loading index.html from:", t), e.loadFile(t).catch((d) => {
      console.error("Failed to load index.html:", d);
    }), e.webContents.openDevTools({ mode: "detach" });
  }
  e.on("closed", () => {
    e = null;
  });
}
n.requestSingleInstanceLock() || (n.quit(), process.exit(0));
n.on("second-instance", () => {
  e && (e.isMinimized() && e.restore(), e.focus());
});
n.whenReady().then(() => {
  w.interceptFileProtocol("file", (a, o) => {
    let t = a.url.replace("file:///", "");
    process.platform === "win32" && (t = t.replace(/^([a-z]):/i, "$1:"));
    const d = n.getAppPath();
    if (console.log("🔧 File protocol intercepted:", a.url), t.includes("/dist/assets/")) {
      const p = t.split("/dist/assets/")[1], r = i.join(d, "dist", "assets", p);
      console.log("  → Asset resolved to:", r), o({ path: r });
      return;
    }
    if (t.includes("/dist/assets/onnxruntime-web/")) {
      const p = t.split("/dist/assets/onnxruntime-web/")[1], r = i.join(d, "dist", "onnxruntime-web", p);
      console.log("  → ONNX Runtime resolved to:", r), o({ path: r });
      return;
    }
    o({ path: i.normalize(t) });
  }), h(), n.on("activate", () => {
    u.getAllWindows().length === 0 && h();
  });
});
n.on("window-all-closed", () => {
  process.platform !== "darwin" && n.quit();
});
l.handle("app:getVersion", () => n.getVersion());
l.on("app:window:minimize", () => {
  e?.minimize();
});
l.on("app:window:maximize", () => {
  e && (e.isMaximized() ? e.unmaximize() : e.maximize(), e.webContents.send("app:window:isMaximized", e.isMaximized()));
});
l.on("app:window:close", () => {
  e?.close();
});
l.on("app:show-notification", (a, o) => {
  if (!o || !o.title)
    return;
  new g({
    title: o.title,
    body: o.body ?? ""
  }).show();
});
l.handle("app:get-theme", () => ({
  shouldUseDarkColors: s.shouldUseDarkColors,
  themeSource: s.themeSource
}));
s.on("updated", () => {
  e?.webContents.send("app:theme-updated", {
    shouldUseDarkColors: s.shouldUseDarkColors,
    themeSource: s.themeSource
  });
});
