import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getSimpleAuthToken,
  isSimpleAuthEnabled,
  SIMPLE_AUTH_COOKIE,
} from "@/lib/simple-auth";

export default async function RequireAuth({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isSimpleAuthEnabled()) {
    const expected = getSimpleAuthToken();
    const store = await cookies();
    const token = store.get(SIMPLE_AUTH_COOKIE)?.value;
    if (!expected || token !== expected) {
      redirect("/login");
    }
  }

  return children;
}
