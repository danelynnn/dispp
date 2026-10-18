import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { Component } from "react";
import "./style.css";

import App from "./App";
import DirectMessage from "DirectMessage/DirectMessage";
import ChatArea from "DirectMessage/ChatArea/ChatArea";

let router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      {
        path: "dm",
        Component: DirectMessage,
        children: [
          { path: "friends", Component: ChatArea },
          { path: "chat/:username", Component: ChatArea },
        ],
      },
      { path: "server", Component: Component },
    ],
  },
]);
const root = createRoot(document.getElementById("root"));
root.render(<RouterProvider router={router} />);
