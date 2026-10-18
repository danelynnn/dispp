import { app, BrowserWindow, ipcMain } from "electron";
import XMPPStream from "./stream.js";
import path from "node:path";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stream = new XMPPStream("worlio.com");
// code here
stream
  .connect()
  .then((header) => {
    // return stream.authenticate(header, "dispp_test", "mGQ2&h_S!C]Q9&T");
    return stream.authenticate(header, "danelyn", "pagUe*GXn5?A3&'");
  })
  .then(
    (resourcepart) => {
      console.log(resourcepart);

      stream.retrieveRoster().then((roster) => {
        console.log(roster);
      });

      stream.retrieveProfile("unrealapex@disroot.org").then((profile) => {
        console.log(profile);
      });
    },
    (err) => {
      console.log(err);
    },
  );
stream.onReceive = (message) => {
  // console.log(message);
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadURL("http://localhost:3000");
};

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle("xmpp:retrieveRoster", () => stream.retrieveRoster());
  ipcMain.handle("xmpp:sendMessage", (event, ...[target, message]) => {
    stream.sendMessage(target, message);
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
