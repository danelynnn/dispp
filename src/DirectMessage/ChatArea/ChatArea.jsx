import "./ChatArea.scss";

import { useState } from "react";
import { Outlet, useParams } from "react-router";

import Message from "./Message/Message";
import ChatBox from "./ChatBox/ChatBox";
import { ReactComponent as Arobase } from "img/at.svg";
import { ReactComponent as Offline } from "img/offline.svg";
import { ReactComponent as Online } from "img/online.svg";
import { ReactComponent as Away } from "img/away.svg";

import jsonData from "ignore/messages.json";

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
  const { username } = useParams();

  const statuses = {
    0: <Offline width={10} />,
    1: <Online width={102} />,
    2: <Away width={10} />,
  };

  if (!messages) {
    setMessages(jsonData.messages.slice(-50, -1));
    console.log(jsonData.messages.slice(0, 100));
  }

  console.log("update");

  return (
    <div class="chat">
      <div class="chat-header">
        <Arobase width={24} />
        <p class="title">{username}</p>
        {statuses[0]}
        <div style={{ flexGrow: 1 }}></div>
        <input type="text" className="search-bar" placeholder="Search" />
      </div>
      <div class="chat-body">
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
      <div class="chat-panel">
        <ChatBox
          username={username}
          submit={(value) => {
            console.log(value);
          }}
        />
      </div>
    </div>
  );
}

export default ChatArea;
