import { Outlet } from "react-router";
import "./ChatArea.scss";
import { useState } from "react";

import jsonData from "ignore/messages.json";

function ChatArea() {
  const [messages, setMessages] = useState(null);
  if (!messages) {
    setMessages(jsonData);
  }
  return <div></div>;
}

export default ChatArea;
