import RequireAuth from "@/components/RequireAuth";
import ItemsPage from "../protected/items/page";

export default function Page() {
  return (
    <RequireAuth>
      <ItemsPage />
    </RequireAuth>
  );
}
