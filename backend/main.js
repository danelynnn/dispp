import { promisify } from "node:util";
import XMPPStream from "./stream.js";
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const stream = new XMPPStream("worlio.com", "dispp_test");
stream.onReceive = (message) => {
  console.log(message);
};

stream
  .connect()
  .then((header) => {
    return stream.authenticate(header, "mGQ2&h_S!C]Q9&T");
  })
  .then(
    (resourcepart) => {
      console.log(resourcepart);
      return stream.retrieveRoster();
    },
    (err) => {
      console.log(err);
    },
  )
  .then((response) => {
    console.log(response);
    awaitInput();
  });

function awaitInput() {
  rl.question("> ", (message) => {
    // stream.sendMessage("danelyn@worlio.com", message);
    stream.requestArchive("danelyn@worlio.com").then((data) => {
      console.log(data);
    });
    awaitInput();
  });
}
