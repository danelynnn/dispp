import "./Message.scss";

function format(utc, justTime = false) {
  const datetime = new Date(utc);
  if (justTime) {
    return datetime.toLocaleTimeString("en-US", { timeStyle: "short" });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 1000 * 3600 * 24);

  if (datetime > today) {
    return datetime.toLocaleTimeString("en-US");
  } else if (datetime > yesterday) {
    return `Yesterday at ${datetime.toLocaleTimeString("en-US")}`;
  } else {
    return datetime.toLocaleString("en-US");
  }
}

function Message({ message, leader = false }) {
  return (
    <div className="message">
      {leader ? (
        <div className="avatar-container">
          <img
            className="chat-avatar"
            src={message.author.avatarUrl}
            height={40}
          />
        </div>
      ) : (
        <div>
          <p
            class="timestamp"
            style={{ width: 42, overflowX: "hidden", whiteSpace: "nowrap" }}
          >
            {/* {format(message.timestamp, true)} */}
          </p>
        </div>
      )}
      <div className="message-body">
        {leader && (
          <div className="message-header">
            <p class="author">{message.author.nickname}</p>
            <p class="timestamp">{format(message.timestamp)}</p>
          </div>
        )}
        <p>{message.content}</p>
      </div>
    </div>
  );
}

export default Message;
