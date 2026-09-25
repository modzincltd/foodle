import { requireAdmin } from "@/lib/auth/admin";
import { getTables } from "@/lib/data/restaurant";
import { TablesEditor } from "./TablesEditor";

export default async function TablesAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  const { tables, areas } = await getTables(r.id);
  return <TablesEditor slug={slug} tables={tables} areas={areas} baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />;
}
