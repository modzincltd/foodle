import { requireAdmin } from "@/lib/auth/admin";
import { getMenus, getOpeningHours } from "@/lib/data/restaurant";
import { normalizeTheme } from "@/lib/site/theme";
import { saveWebsite } from "../actions";
import { WebsiteEditor } from "./WebsiteEditor";

export default async function WebsiteAdmin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await requireAdmin(slug);
  const [menus, hours] = await Promise.all([getMenus(r.id, { channel: "website" }), getOpeningHours(r.id)]);
  return (
    <WebsiteEditor
      initial={normalizeTheme(r.theme)}
      data={{ restaurant: r, menus, hours: hours.filter((h) => h.kind === "service") }}
      action={saveWebsite.bind(null, slug)}
    />
  );
}
