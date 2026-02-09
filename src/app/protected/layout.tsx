import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import UserEmailSync from "@/components/UserEmailSync";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RequireAuth>
      <Suspense>
        <UserEmailSync>{children}</UserEmailSync>
      </Suspense>
    </RequireAuth>
  );
}
