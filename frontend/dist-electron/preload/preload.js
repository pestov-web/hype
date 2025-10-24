import { contextBridge as t, ipcRenderer as e } from "electron";
const p = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  getAppVersion: () => e.invoke("app:getVersion"),
  minimizeWindow: () => e.send("app:window:minimize"),
  maximizeWindow: () => e.send("app:window:maximize"),
  closeWindow: () => e.send("app:window:close"),
  showNotification: (o, n) => {
    e.send("app:show-notification", { title: o, body: n });
  },
  getTheme: () => e.invoke("app:get-theme"),
  onThemeUpdated: (o) => {
    const n = "app:theme-updated";
    return e.on(n, (i, s) => {
      o(s);
    }), () => {
      e.removeAllListeners(n);
    };
  },
  onWindowMaximized: (o) => {
    const n = "app:window:isMaximized", i = (s, r) => o(r);
    return e.on(n, i), () => {
      e.removeListener(n, i);
    };
  }
};
t.exposeInMainWorld("electron", p);
