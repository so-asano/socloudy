import { sessionAtom } from "@/atoms/auth";
import { agent } from "@/lib/agent";
import type { AppBskyActorDefs } from "@atproto/api";
import { useSetAtom } from "jotai";
import { useCallback } from "react";

async function fetchMyProfile(): Promise<AppBskyActorDefs.ProfileViewDetailed | null> {
  const did = agent.session?.did;
  if (!did) return null;
  const res = await agent.getProfile({ actor: did });
  return res.data;
}

/** Login / logout / session-restore actions that also sync the Jotai session atom. */
export function useAuthActions() {
  const setSession = useSetAtom(sessionAtom);

  const login = useCallback(
    async (identifier: string, password: string) => {
      await agent.login({ identifier, password });
      setSession(await fetchMyProfile());
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    await agent.logout().catch(() => {});
    setSession(null);
  }, [setSession]);

  const restore = useCallback(async () => {
    setSession(await fetchMyProfile());
  }, [setSession]);

  return { login, logout, restore };
}
