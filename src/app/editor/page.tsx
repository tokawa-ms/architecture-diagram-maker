import RequireAuth from "@/components/RequireAuth";
import EditorPage from "../protected/editor/page";

export default function Page() {
  return (
    <RequireAuth>
      <EditorPage />
    </RequireAuth>
  );
}
