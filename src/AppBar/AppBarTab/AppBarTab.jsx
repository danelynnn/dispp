import "./AppBarTab.scss";
import classNames from "classnames";

function AppBarTab({ selected, onClick, children }) {
  return (
    <div>
      <div style={{ position: "relative" }}>
        <div
          className={classNames({ tab: true, selected: selected })}
          onClick={onClick}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default AppBarTab;
