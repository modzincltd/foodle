"use client";
import { useState, useTransition } from "react";
import { staffLogin } from "./actions";

export function PinPad({ slug, next }: { slug: string; next?: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (p: string) =>
    start(async () => {
      setError(null);
      const res = await staffLogin(slug, p, next);
      if (res?.error) { setError(res.error); setPin(""); }
    });

  const press = (d: string) => {
    if (pending) return;
    const p = (pin + d).slice(0, 6);
    setPin(p);
    if (p.length === 4) submit(p); // default 4-digit PINs auto-submit
  };

  return (
    <div className="w-72">
      <div className="mb-4 flex justify-center gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${i < pin.length ? "bg-accent" : "bg-stone-700"}`} />
        ))}
      </div>
      {error && <p className="mb-3 text-center text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "→"].map((k) => (
          <button
            key={k}
            type="button"
            disabled={pending}
            onClick={() => (k === "⌫" ? setPin((p) => p.slice(0, -1)) : k === "→" ? pin.length >= 4 && submit(pin) : press(k))}
            className="h-16 rounded-2xl bg-stone-800 text-2xl font-semibold text-white active:bg-stone-700 disabled:opacity-50"
          >
            {k}
          </button>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-stone-500">{pending ? "Checking…" : "Enter your PIN"}</p>
    </div>
  );
}
