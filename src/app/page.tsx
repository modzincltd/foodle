import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 h-16 w-16 rounded-2xl bg-primary" />
      <h1 className="text-5xl font-black tracking-tight">Foodle</h1>
      <p className="mt-3 max-w-md text-lg text-muted">Menus, tills, online ordering, bookings and your website — one platform for your restaurant.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/admin" className="btn-primary">Restaurant admin</Link>
        <Link href="/app" className="btn-ghost">Staff login</Link>
        <Link href="/r/demo" className="btn-ghost">Demo restaurant</Link>
      </div>
    </main>
  );
}
