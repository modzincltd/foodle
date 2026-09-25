"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOut() {
  const router = useRouter();
  return (
    <button className="block hover:text-foreground" onClick={async () => { await supabaseBrowser().auth.signOut(); router.push("/admin/login"); router.refresh(); }}>
      Sign out
    </button>
  );
}
