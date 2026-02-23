import "./AppBar.scss";
import variables from "_variables.module.scss";
import { ReactComponent as Logo } from "img/logo.svg";
import { useState } from "react";
import classNames from "classnames";
import AppBarTab from "./AppBarTab/AppBarTab";

function AppBar() {
  const [selected, setSelected] = useState(0);

  function select(i) {
    if (selected != i) {
      setSelected(i);
    }
  }

  return (
    <div className="appbar-pane">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <AppBarTab selected={selected == i} onClick={() => setSelected(i)}>
          <div
            className={classNames({
              "tab-button": true,
              selected: selected == i,
            })}
          >
            <Logo color={variables.lightColour} />
          </div>
        </AppBarTab>
      ))}
    </div>
  );
}

export default AppBar;
