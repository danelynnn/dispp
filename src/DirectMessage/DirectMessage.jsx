import { Outlet } from "react-router";
import "./DirectMessage.scss";
import FriendsPane from "./FriendsPane/FriendsPane";

function DirectMessage() {
  return (
    <div className="main">
      <FriendsPane />
      <Outlet />
    </div>
  );
}

export default DirectMessage;
