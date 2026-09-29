import { LoginForm } from "./LoginForm";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold">Foodle admin</h1>
        <p className="mb-4 text-sm text-muted">Sign in to manage your restaurant.</p>
        <LoginForm next={next} />
      </div>

      
    </main>
  );
}
