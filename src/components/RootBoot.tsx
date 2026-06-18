import { Spinner } from "@/components/Spinner";
import { resumeSession } from "@/lib/agent";
import { useAuthActions } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

/**
 * App boot gate: tries to resume a stored session before rendering routes,
 * so a refresh doesn't flash the login screen for already-authed users.
 */
export function RootBoot() {
  const [ready, setReady] = useState(false);
  const { restore } = useAuthActions();

  useEffect(() => {
    (async () => {
      if (await resumeSession()) await restore();
      setReady(true);
    })();
  }, [restore]);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }
  return <Outlet />;
}
