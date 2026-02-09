import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import ProtectedHome from "./protected/page";

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <ProtectedHome />
      </Suspense>
    </RequireAuth>
  );
}
