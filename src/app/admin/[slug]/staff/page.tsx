import { requireAdmin } from "@/lib/auth/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Staff } from "@/lib/types";
import { StaffEditor } from "./StaffEditor";

export default async function StaffAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  const { data } = await supabaseAdmin().from("staff").select("id,name,role,active").eq("restaurant_id", r.id).order("name");
  return <StaffEditor slug={slug} staff={(data ?? []) as Staff[]} />;
}
