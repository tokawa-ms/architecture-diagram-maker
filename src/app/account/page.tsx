import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import AccountPage from "../protected/account/page";

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <AccountPage />
      </Suspense>
    </RequireAuth>
  );
}
