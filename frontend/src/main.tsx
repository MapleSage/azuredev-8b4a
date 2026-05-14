import React from "react";
import ReactDOM from "react-dom/client";
import TabsInterface from "../components/TabsInterface";
import "../styles/globals.css";

const dev01User = {
  id: "dev01-user",
  displayName: "SageSure Dev01",
  name: "SageSure Dev01",
  email: "dev01@sagesure.local",
  roles: ["agent"],
};

function App() {
  return <TabsInterface signOut={() => undefined} user={dev01User} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
