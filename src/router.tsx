import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { RootBoot } from "@/components/RootBoot";
import { Navigate, createBrowserRouter } from "react-router-dom";

// Route components are code-split: each page lands in its own chunk, loaded on navigation.
export const router = createBrowserRouter([
  {
    element: <RootBoot />,
    children: [
      {
        path: "/login",
        lazy: () => import("@/routes/Login").then((m) => ({ Component: m.LoginPage })),
      },
      {
        element: (
          <RequireAuth>
            <Layout />
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            lazy: () => import("@/routes/Home").then((m) => ({ Component: m.HomePage })),
          },
          {
            path: "search",
            lazy: () => import("@/routes/Search").then((m) => ({ Component: m.SearchPage })),
          },
          {
            path: "notifications",
            lazy: () =>
              import("@/routes/Notifications").then((m) => ({ Component: m.NotificationsPage })),
          },
          {
            path: "feed/:feed",
            lazy: () => import("@/routes/FeedView").then((m) => ({ Component: m.FeedViewPage })),
          },
          {
            path: "profile/:actor",
            lazy: () => import("@/routes/Profile").then((m) => ({ Component: m.ProfilePage })),
          },
          {
            path: "thread/*",
            lazy: () => import("@/routes/Thread").then((m) => ({ Component: m.ThreadPage })),
          },
          { path: "*", element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
]);
