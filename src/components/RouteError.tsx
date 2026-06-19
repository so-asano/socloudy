import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router-dom";

// Chunk/import failures usually mean a new deploy changed the hashed chunks while
// this tab held stale references — a reload fetches the fresh index + chunks.
const CHUNK_ERROR = /dynamically imported module|module script failed|Failed to fetch/i;

export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);
  const isChunkError = CHUNK_ERROR.test(message);

  useEffect(() => {
    if (!isChunkError) return;
    // reload once (guard against an endless loop if it keeps failing)
    const last = Number(sessionStorage.getItem("chunk-reload-at") ?? 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem("chunk-reload-at", String(Date.now()));
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center text-white">
      <div className="flex flex-col items-center gap-4">
        <p className="text-white/90">{t("common.error")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-white px-5 py-2 font-semibold text-sm transition hover:bg-white/20"
        >
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}
