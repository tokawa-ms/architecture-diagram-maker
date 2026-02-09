import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import EditorPage from "../protected/editor/page";

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <EditorPage />
      </Suspense>
    </RequireAuth>
  );
}
