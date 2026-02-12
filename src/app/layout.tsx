import type { Metadata } from "next";
import MsalAuthProvider from "@/components/MsalAuthProvider";
import { buildRuntimeConfig } from "@/lib/runtime-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Architecture Diagram Maker",
  description: "Architecture diagram editor for Azure-focused systems.",
};

/**
 * Force dynamic rendering so that the runtime config script tag always
 * reflects the actual server environment variables (not a cached static
 * shell).
 */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read env vars on the server at request time and inject them into the
  // client bundle so NEXT_PUBLIC_* values are available even when they
  // were not present at Docker build time.
  const runtimeConfig = buildRuntimeConfig();

  return (
    <html lang="ja">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__RUNTIME_CONFIG__=${JSON.stringify(runtimeConfig)};`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <MsalAuthProvider>{children}</MsalAuthProvider>
      </body>
    </html>
  );
}
