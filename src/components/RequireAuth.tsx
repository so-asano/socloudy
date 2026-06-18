import { isAuthedAtom } from "@/atoms/auth";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

export function RequireAuth({ children }: { children: ReactNode }) {
  const authed = useAtomValue(isAuthedAtom);
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
