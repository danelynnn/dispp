import { Outlet } from "react-router";
import "./App.scss";
import AppBar from "./AppBar/AppBar";

function App() {
  return (
    <div className="app">
      <AppBar />
      <Outlet />
    </div>
  );
}

export default App;
