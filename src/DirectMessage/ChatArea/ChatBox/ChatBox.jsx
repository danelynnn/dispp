import "./ChatBox.scss";

import { ReactComponent as Add } from "img/add.svg";

function ChatBox({ username, submit }) {
  return (
    <div className="chat-box">
      <Add height="24px" />
      <textarea
        placeholder={`Message @${username}`}
        onInput={(e) => {
          e.target.style.height = "";
          e.target.style.height = `${e.target.scrollHeight - 32}px`;
        }}
        onKeyDown={(e) => {
          // Enter was pressed without shift key
          if (e.key == "Enter" && !e.shiftKey) {
            // block newline
            e.preventDefault();
            submit(e.target.value);
          }
        }}
      />
    </div>
  );
}

export default ChatBox;
