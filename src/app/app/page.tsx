"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffEntry() {
  const [slug, setSlug] = useState("");
  const router = useRouter();
  return (
    <main className="staff-app flex min-h-screen items-center justify-center p-6">
      <form className="w-full max-w-sm space-y-3" onSubmit={(e) => { e.preventDefault(); if (slug) router.push(`/app/${slug.trim().toLowerCase()}`); }}>
        <h1 className="text-2xl font-bold">Staff login</h1>
        <p className="text-sm text-stone-400">Enter your restaurant code.</p>
        <input className="input bg-stone-900 border-stone-700 text-white" placeholder="e.g. demo" value={slug} onChange={(e) => setSlug(e.target.value)} autoFocus />
        <button className="btn-primary w-full">Continue</button>
      </form>
    </main>
  );
}
