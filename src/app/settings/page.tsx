import RequireAuth from "@/components/RequireAuth";
import SettingsPage from "../protected/settings/page";

export default function Page() {
  return (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  );
}
