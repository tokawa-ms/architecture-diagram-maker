import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguageFromSearch, getMessages } from "@/lib/i18n";
import { isSimpleAuthEnabled } from "@/lib/simple-auth";
import { redirect } from "next/navigation";

const toSearchString = (params?: Record<string, string | string[] | undefined>) => {
  if (!params) return "";
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      next.set(key, value);
    } else if (Array.isArray(value) && value.length > 0) {
      next.set(key, value[0]);
    }
  }
  return next.toString();
};

type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (!isSimpleAuthEnabled()) {
    redirect("/");
  }

  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? undefined;
  const search = toSearchString(resolvedSearchParams);
  const language = getLanguageFromSearch(search);
  const messages = getMessages(language);
  const hasError =
    resolvedSearchParams?.error === "1" ||
    (Array.isArray(resolvedSearchParams?.error) &&
      resolvedSearchParams?.error[0] === "1");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold text-slate-900">
              {messages.appName}
            </div>
            <p className="text-sm text-slate-500">{messages.tagline}</p>
          </div>
          <LanguageSwitcher current={language} label={messages.languageLabel} />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="relative mx-auto w-[360px] max-w-[90vw]">
          <div className="pointer-events-none absolute -inset-4 rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.12),_transparent_55%)]" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)]">
            <div className="text-center">
              <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {messages.loginTitle}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {messages.loginSubtitle}
              </p>
            </div>
            <form
              className="mx-auto mt-6 grid w-[280px] max-w-[80vw] gap-4"
              action="/api/auth/login"
              method="POST"
            >
            <input type="hidden" name="lang" value={language} />
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                {messages.loginUserLabel}
              </span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                required
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">
                {messages.loginPassLabel}
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                required
              />
            </label>
            {hasError && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {messages.loginError}
              </p>
            )}
            <button
              type="submit"
              className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
            >
              {messages.loginAction}
            </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
