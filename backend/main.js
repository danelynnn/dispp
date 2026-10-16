import XMPPStream from "./stream.js";
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const stream = new XMPPStream(
  "worlio.com",
  (response) => {
    stream.authenticate(response, "danelyn", "pagUe*GXn5?A3&'");
  },
  (data) => {
    console.log("received xml data");
    console.log(data.toString());
  },
);

function awaitInput() {
  rl.question("chat: ", (message) => {
    stream.sendMessage("danelyn@worlio.com", message);
    awaitInput();
  });
}
awaitInput();
