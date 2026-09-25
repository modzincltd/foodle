import Link from "next/link";
import { redirect } from "next/navigation";
import { myRestaurants } from "@/lib/auth/admin";

export default async function AdminHome() {
  const rs = await myRestaurants();
  if (rs.length === 1) redirect(`/admin/${rs[0].slug}`);
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold">Your restaurants</h1>
      {rs.length === 0 && (
        <p className="mt-3 text-muted">Your account isn&apos;t linked to a restaurant yet. Ask Foodle support to add you.</p>
      )}
      <ul className="mt-4 space-y-2">
        {rs.map((r) => (
          <li key={r.id}><Link href={`/admin/${r.slug}`} className="card block p-4 font-semibold hover:shadow">{r.name}</Link></li>
        ))}
      </ul>
    </main>
  );
}
