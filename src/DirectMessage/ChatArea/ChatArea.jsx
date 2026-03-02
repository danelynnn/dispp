import { Outlet } from "react-router";
import "./ChatArea.scss";
import { useState } from "react";

import jsonData from "ignore/messages.json";
import Message from "./Message/Message";

function Divider({ children }) {
  return (
    <div style={{ display: "flex", gap: 4, padding: "0px 12px 0px 12px" }}>
      <div style={{ flexGrow: 1 }}>
        <hr />
      </div>
      {children}
      <div style={{ flexGrow: 1 }}>
        <hr />
      </div>
    </div>
  );
}

function ChatArea() {
  const [messages, setMessages] = useState(null);
  if (!messages) {
    setMessages(jsonData.messages.slice(-50, -1));
    console.log(jsonData.messages.slice(0, 100));
  }

  console.log("update");

  return (
    <div class="chat">
      {messages?.flatMap((message, idx, arr) => {
        var leader = false;

        const messageTimestamp = new Date(message.timestamp);

        if (idx == 0) {
          return [
            <Divider>{messageTimestamp.toLocaleDateString("en-US")}</Divider>,
            <Message message={message} leader={true} />,
          ];
        }

        const prevMessage = arr[idx - 1];
        const prevTimestamp = new Date(prevMessage.timestamp);
        const prevStampDay = new Date(prevMessage.timestamp);
        prevStampDay.setHours(0, 0, 0, 0);

        if (messageTimestamp - prevStampDay > 1000 * 3600 * 24) {
          return [
            <Divider>{messageTimestamp.toLocaleDateString("en-US")}</Divider>,
            <Message message={message} leader={true} />,
          ];
        } else if (prevMessage.author.id !== message.author.id) {
          return <Message message={message} leader={true} />;
        } else {
          return <Message message={message} />;
        }
      })}
    </div>
  );
}

export default ChatArea;
