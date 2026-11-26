import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AtlasPage } from "../features/atlas/AtlasPage";
import { ComparePage } from "../features/comparison/ComparePage";
import { LibraryPage } from "../features/library/LibraryPage";
import { ObservatoryPage } from "../features/observatory/ObservatoryPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { isApplicationError } from "../ipc/client";
import { AppShell } from "./AppShell";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry once, and only when the native side says it could succeed.
        retry: (count, error) =>
          count < 1 && (!isApplicationError(error) || error.recoverable),
        refetchOnWindowFocus: false,
      },
    },
  });
}

const queryClient = createQueryClient();

export const routes = [
  {
    path: "/",
    element: (
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    ),
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "library", element: <Navigate to="/library/tracks" replace /> },
      { path: "library/:view", element: <LibraryPage /> },
      { path: "tracks/:trackId", element: <ObservatoryPage /> },
      { path: "atlas", element: <AtlasPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/overview" replace /> },
    ],
  },
];

const router = createBrowserRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
