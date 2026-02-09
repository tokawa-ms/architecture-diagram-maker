import { Suspense } from "react";
import RequireAuth from "@/components/RequireAuth";
import AboutPage from "../protected/about/page";

export default function Page() {
  return (
    <RequireAuth>
      <Suspense>
        <AboutPage />
      </Suspense>
    </RequireAuth>
  );
}
