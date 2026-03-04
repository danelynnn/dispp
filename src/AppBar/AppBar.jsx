import "./AppBar.scss";
import variables from "_variables.module.scss";

import { useState } from "react";
import classNames from "classnames";
import { useMatch, useNavigate, useResolvedPath } from "react-router";

import AppBarTab from "./AppBarTab/AppBarTab";
import { ReactComponent as Logo } from "img/logo.svg";

function AppBar() {
  const navigate = useNavigate();

  const match = `${useResolvedPath("").pathname}/:path/*`;
  const route = useMatch(match)?.params.path;

  function select(tab) {
    if (route != tab) {
      navigate(tab);
    }
  }

  return (
    <div className="appbar-pane">
      <AppBarTab selected={route == "dm"} onClick={() => select("dm")}>
        <div
          className={classNames({
            "tab-button": true,
            selected: route == "dm",
          })}
        >
          <Logo color={variables.lightColour} />
        </div>
      </AppBarTab>
      <AppBarTab selected={route == null} onClick={() => select(null)}>
        <div
          className={classNames({
            "tab-button": true,
            selected: route == null,
          })}
        >
          <Logo color={variables.lightColour} />
        </div>
      </AppBarTab>
    </div>
  );
}

export default AppBar;
