import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AtlasPage } from "../features/atlas/AtlasPage";
import { LibraryPage } from "../features/library/LibraryPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AppShell } from "./AppShell";

export const routes = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "library", element: <Navigate to="/library/tracks" replace /> },
      { path: "library/:view", element: <LibraryPage /> },
      { path: "atlas", element: <AtlasPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/overview" replace /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
