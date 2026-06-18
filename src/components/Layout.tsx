import { sessionAtom } from "@/atoms/auth";
import { composerAtom } from "@/atoms/composer";
import { homeTopAtom } from "@/atoms/feed";
import { Avatar } from "@/components/Avatar";
import { Composer } from "@/components/Composer";
import { Lightbox } from "@/components/Lightbox";
import { SettingsControls } from "@/components/SettingsControls";
import { useAuthActions } from "@/lib/auth";
import { useSavedFeeds, useTimelineLatest, useUnreadCount } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Bell,
  Cloud,
  Hash,
  Home,
  LogOut,
  type LucideIcon,
  PenSquare,
  Search,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

export function Layout() {
  const { t } = useTranslation();
  const me = useAtomValue(sessionAtom);
  const setComposer = useSetAtom(composerAtom);
  const { logout } = useAuthActions();
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadCount();
  const { data: feeds = [] } = useSavedFeeds();
  const { data: latestTop } = useTimelineLatest();
  const homeTop = useAtomValue(homeTopAtom);
  const hasNewHome = !!latestTop && !!homeTop && latestTop !== homeTop;
  const qc = useQueryClient();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `grid size-12 place-items-center rounded-full transition ${
      isActive ? "bg-white text-sky" : "hover:bg-white/25"
    }`;

  const doLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  // clicking a nav item scrolls back to the top (e.g. re-tapping the current tab)
  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Home: scroll up and pull in any new posts.
  const goHome = () => {
    toTop();
    qc.invalidateQueries({ queryKey: ["timeline"] });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl">
      {/* Sidebar */}
      <header className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 p-4 sm:flex">
        <div className="mb-2 flex items-center gap-2 px-3 font-bold text-2xl">
          <Cloud className="size-7 text-white" fill="none" />
          {t("app.name")}
        </div>
        <nav className="flex flex-row gap-1">
          <NavLink
            to="/"
            end
            className={navClass}
            aria-label={t("nav.home")}
            title={t("nav.home")}
            onClick={goHome}
          >
            <span className="relative">
              <Home className="size-6" />
              {hasNewHome ? (
                <span className="-top-0.5 -right-1 absolute size-2.5 rounded-full bg-white ring-2 ring-sky" />
              ) : null}
            </span>
          </NavLink>
          <NavLink
            to="/search"
            className={navClass}
            aria-label={t("nav.search")}
            title={t("nav.search")}
            onClick={toTop}
          >
            <Search className="size-6" />
          </NavLink>
          <NavLink
            to="/notifications"
            className={navClass}
            aria-label={t("nav.notifications")}
            title={t("nav.notifications")}
            onClick={toTop}
          >
            <span className="relative">
              <Bell className="size-6" />
              <Badge count={unread} />
            </span>
          </NavLink>
          {/* profile is reachable from the user avatar at the bottom */}
        </nav>
        <button
          type="button"
          onClick={() => setComposer({ open: true })}
          aria-label={t("nav.post")}
          title={t("nav.post")}
          className="mt-2 grid size-12 place-items-center rounded-full border border-white text-white transition hover:bg-white/25"
        >
          <PenSquare className="size-5" />
        </button>

        {/* pinned custom feeds */}
        {feeds.length > 0 ? (
          <nav className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
            {feeds.map((f) => (
              <NavLink
                key={f.uri}
                to={`/feed/${encodeURIComponent(f.uri)}`}
                title={f.name}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-sm transition ${
                    isActive ? "bg-white text-sky" : "hover:bg-white/25"
                  }`
                }
              >
                {f.avatar ? (
                  <img src={f.avatar} alt="" className="size-7 shrink-0 rounded-full" />
                ) : (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20">
                    <Hash className="size-4" />
                  </span>
                )}
                <span className="truncate">{f.name}</span>
              </NavLink>
            ))}
          </nav>
        ) : null}

        <div className="mt-auto flex flex-col gap-2">
          <SettingsControls />
          {me ? (
            <div className="flex items-center gap-2">
              <NavLink
                to={`/profile/${me.handle}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-full p-2 transition hover:bg-white/25"
              >
                <Avatar src={me.avatar} alt={me.handle} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-sm">
                    {me.displayName ?? me.handle}
                  </span>
                  <span className="block truncate text-white/70 text-xs">@{me.handle}</span>
                </span>
              </NavLink>
              <button
                type="button"
                onClick={doLogout}
                aria-label={t("nav.logout")}
                title={t("nav.logout")}
                className="grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-white/25"
              >
                <LogOut className="size-5" />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {/* Main column — own stacking context so card z-indexes don't escape to the sidebar */}
      <main className="relative isolate min-w-0 flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-white/30 border-t py-2 backdrop-blur-xl sm:hidden">
        <MobileLink to="/" end icon={Home} label={t("nav.home")} onClick={goHome} />
        <MobileLink to="/search" icon={Search} label={t("nav.search")} onClick={toTop} />
        <MobileLink
          to="/notifications"
          icon={Bell}
          label={t("nav.notifications")}
          badge={unread}
          onClick={toTop}
        />
        <button
          type="button"
          onClick={() => setComposer({ open: true })}
          aria-label={t("nav.post")}
          className="px-4 py-1"
        >
          <PenSquare className="size-6" />
        </button>
        {me ? (
          <MobileLink to={`/profile/${me.handle}`} icon={User} label={t("nav.profile")} />
        ) : null}
      </nav>

      <Composer />
      <Lightbox />
    </div>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="-top-1.5 -right-2 absolute grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-1 font-bold text-[10px] text-sky-dark shadow-sm ring-2 ring-sky">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MobileLink({
  to,
  icon: Icon,
  label,
  end,
  badge = 0,
  onClick,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  badge?: number;
  onClick?: () => void;
}): ReactNode {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      onClick={onClick}
      className={({ isActive }) => `relative px-4 py-1 ${isActive ? "text-sky" : ""}`}
    >
      <Icon className="size-6" />
      <Badge count={badge} />
    </NavLink>
  );
}
