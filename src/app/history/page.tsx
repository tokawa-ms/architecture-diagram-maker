import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import HistoryPage from "../protected/history/page";

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <HistoryPage />
      </Suspense>
    </RequireAuth>
  );
}
