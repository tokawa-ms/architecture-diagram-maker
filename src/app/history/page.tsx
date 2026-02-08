import RequireAuth from "@/components/RequireAuth";
import HistoryPage from "../protected/history/page";

export default function Page() {
  return (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  );
}
