import { isAuthedAtom } from "@/atoms/auth";
import { SettingsControls } from "@/components/SettingsControls";
import { Spinner } from "@/components/Spinner";
import { getService, switchService } from "@/lib/agent";
import { useAuthActions } from "@/lib/auth";
import { Capacitor } from "@capacitor/core";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";

export function LoginPage() {
  const { t } = useTranslation();
  const authed = useAtomValue(isAuthedAtom);
  const location = useLocation();
  const { login } = useAuthActions();

  const [service, setSvc] = useState(getService());
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  // native: lift the centered form above the on-screen keyboard
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handles: { remove: () => void }[] = [];
    import("@capacitor/keyboard").then(({ Keyboard }) => {
      Keyboard.addListener("keyboardWillShow", (e) => setKbHeight(e.keyboardHeight)).then((h) =>
        handles.push(h),
      );
      Keyboard.addListener("keyboardWillHide", () => setKbHeight(0)).then((h) => handles.push(h));
    });
    return () => {
      for (const h of handles) h.remove();
    };
  }, []);

  if (authed) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      switchService(service);
      await login(identifier.trim(), password);
    } catch {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div
      className="grid min-h-dvh place-items-center px-4 pb-4 pt-[calc(1rem_+_var(--top-inset))] transition-[padding] duration-200"
      style={kbHeight ? { paddingBottom: kbHeight } : undefined}
    >
      <div className="absolute top-[calc(1rem_+_var(--top-inset))] right-4">
        <SettingsControls />
      </div>
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/cloud.svg" alt="" className="size-12" />
          <h1 className="font-bold text-2xl">{t("login.title")}</h1>
          <p className="text-sm text-white/80">{t("login.subtitle")}</p>
        </div>

        <Field label={t("login.service")} hint={t("login.serviceHint")}>
          <input
            type="url"
            value={service}
            onChange={(e) => setSvc(e.target.value)}
            required
            className={inputClass}
          />
        </Field>

        <Field label={t("login.identifier")}>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t("login.identifierPlaceholder")}
            autoCapitalize="none"
            autoCorrect="off"
            required
            className={inputClass}
          />
        </Field>

        <Field label={t("login.password")} hint={t("login.passwordHint")}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            required
            className={inputClass}
          />
        </Field>

        {error ? <p className="text-red-500 text-sm">{t("login.failed")}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-sky py-3 font-bold text-white transition enabled:hover:bg-sky-dark disabled:opacity-50"
        >
          {loading ? <Spinner className="size-6 text-white" /> : null}
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white bg-white/10 px-4 py-2.5 text-white outline-none placeholder:text-white/50 focus:bg-white/20";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-medium text-sm">{label}</span>
      {children}
      {hint ? <span className="block text-white/70 text-xs">{hint}</span> : null}
    </label>
  );
}
