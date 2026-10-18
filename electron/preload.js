const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
  retrieveRoster: () => ipcRenderer.invoke("xmpp:retrieveRoster"),
  sendMessage: (target, message) => ipcRenderer.invoke("xmpp:sendMessage", target, message),
});
