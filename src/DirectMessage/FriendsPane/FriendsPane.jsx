import "./FriendsPane.scss";
import { ReactComponent as Wave } from "img/wave.svg";
import { ReactComponent as Plus } from "img/plus.svg";
import { useState } from "react";
import { useMatch, useNavigate, useResolvedPath } from "react-router";
import classNames from "classnames";

import unreal from "img/ignore/unreal.webp";

function FriendsPane() {
  const navigate = useNavigate();
  const match = `${useResolvedPath("").pathname}/*`;
  const route = useMatch(match).params["*"];

  function select(tab) {
    if (route != tab) {
      navigate(tab);
    }
  }

  const [friends, setFriends] = useState([
    { username: "unreal", address: "xmpp@address.org" },
  ]);

  return (
    <div className="pane">
      {console.log(route)}
      <div style={{ display: "flex" }}>
        <input
          type="text"
          placeholder="Find or start a conversation"
          style={{ flexGrow: 1 }}
        />
      </div>
      <div>
        <div
          className={classNames({
            "pane-button": true,
            selected: route == "friends",
          })}
          onClick={() => select("friends")}
        >
          <Wave height={24} />
          <p style={{ flexGrow: 1 }}>Friends</p>
        </div>
        <div
          style={{
            display: "flex",
            padding: 6,
            marginTop: 18,
            marginBottom: 6,
          }}
        >
          <h3 style={{ flexGrow: 1 }}>DIRECT MESSAGES</h3>
          <Plus height={15} />
        </div>
        {friends?.map((friend) => (
          <div
            className={classNames({
              "pane-item": true,
              selected: route == `chat/${friend.username}`,
            })}
            onClick={() => select(`chat/${friend.username}`)}
          >
            <img src={unreal} className="pane-avatar" />
            <p style={{ flexGrow: 1 }}>{friend.username}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FriendsPane;
