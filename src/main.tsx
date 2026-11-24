import React, { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import Page from "./page";
import AdminPage from "./admin/AdminPage";
import { currentPath, isAdminPath, subscribeToPath } from "./routing";

const Root = () => {
  const pathname = useSyncExternalStore(
    subscribeToPath,
    currentPath,
    () => "/",
  );
  return isAdminPath(pathname) ? <AdminPage /> : <Page />;
};

const root = document.getElementById("root");
if (!root) throw new Error("앱을 표시할 root 요소가 없습니다.");

createRoot(root).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
