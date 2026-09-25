import { requireStaffPage, StaffShell } from "../StaffShell";
import { posBootstrap } from "../actions";
import { Pos } from "./Pos";

export default async function PosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staff = await requireStaffPage(slug, `/app/${slug}/pos`);
  const data = await posBootstrap(slug);
  return (
    <StaffShell slug={slug} staff={staff} active="pos">
      <Pos slug={slug} initial={data} />
    </StaffShell>
  );
}
