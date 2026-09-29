"use client";
import { useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { GalleryItem, Restaurant } from "@/lib/types";
import { createMediaUpload, saveMedia } from "../actions";

export type Media = Pick<Restaurant, "logo_url" | "hero_url" | "hero_video_url" | "gallery">;
type Kind = "logo" | "hero" | "video" | "gallery";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

export function MediaPanel({ slug, media, onChange }: { slug: string; media: Media; onChange: (m: Media) => void }) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: Kind, file: File) {
    const { path, token, publicUrl } = await createMediaUpload(slug, kind, file.type, file.size);
    const { error } = await supabaseBrowser().storage.from("site-media").uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (error) throw new Error(error.message);
    return publicUrl;
  }

  async function run(kind: Kind, fn: () => Promise<Partial<Media>>) {
    setBusy(kind); setError(null);
    try {
      const patch = await fn();
      await saveMedia(slug, patch);
      onChange({ ...media, ...patch });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  const setSingle = (kind: Exclude<Kind, "gallery">, field: "logo_url" | "hero_url" | "hero_video_url") => ({
    onFiles: (files: File[]) => run(kind, async () => ({ [field]: await upload(kind, files[0]) })),
    onRemove: () => run(kind, async () => ({ [field]: null })),
  });

  const addGallery = (files: File[]) => run("gallery", async () => {
    const room = 24 - media.gallery.length;
    if (room <= 0) throw new Error("Gallery is full (24 items)");
    const added: GalleryItem[] = [];
    for (const f of files.slice(0, room)) added.push({ url: await upload("gallery", f), type: f.type.startsWith("video/") ? "video" : "image" });
    return { gallery: [...media.gallery, ...added] };
  });
  const updateGallery = (gallery: GalleryItem[]) => run("gallery", async () => ({ gallery }));
  const move = (i: number, d: -1 | 1) => {
    const g = [...media.gallery]; const j = i + d;
    if (j < 0 || j >= g.length) return;
    [g[i], g[j]] = [g[j], g[i]];
    updateGallery(g);
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <Slot title="Logo" hint="PNG, SVG or WebP with a transparent background works best. Max 10 MB."
        accept={IMAGE_ACCEPT} url={media.logo_url} busy={busy === "logo"} {...setSingle("logo", "logo_url")}>
        {media.logo_url && <img src={media.logo_url} alt="" className="h-16 w-auto max-w-full object-contain" />}
      </Slot>

      <Slot title="Header banner" hint="Wide landscape image, at least 1920 × 800. Max 10 MB."
        accept={IMAGE_ACCEPT} url={media.hero_url} busy={busy === "hero"} {...setSingle("hero", "hero_url")}>
        {media.hero_url && <img src={media.hero_url} alt="" className="aspect-[16/7] w-full rounded-lg object-cover" />}
      </Slot>

      <Slot title="Header video (optional)" hint="Plays muted on a loop behind the header; the banner shows while it loads. MP4 recommended, under 20 MB ideally (max 100 MB)."
        accept={VIDEO_ACCEPT} url={media.hero_video_url} busy={busy === "video"} {...setSingle("video", "hero_video_url")}>
        {media.hero_video_url && <video src={media.hero_video_url} className="aspect-[16/7] w-full rounded-lg object-cover" muted loop autoPlay playsInline />}
      </Slot>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Gallery</h3>
          <span className="text-xs text-muted">{media.gallery.length}/24</span>
        </div>
        <p className="text-xs text-muted">Photos and short videos of the food, room and team. Shown on the home page.</p>
        <div className="grid grid-cols-3 gap-2">
          {media.gallery.map((g, i) => (
            <div key={g.url} className="group relative aspect-square overflow-hidden rounded-lg bg-black/5">
              {g.type === "video" ? <video src={g.url} className="h-full w-full object-cover" muted /> : <img src={g.url} alt="" className="h-full w-full object-cover" />}
              {g.type === "video" && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">▶</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-xs text-white opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-1 disabled:opacity-30">←</button>
                <button type="button" onClick={() => updateGallery(media.gallery.filter((_, j) => j !== i))} className="px-1">✕</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === media.gallery.length - 1} className="px-1 disabled:opacity-30">→</button>
              </div>
            </div>
          ))}
          <Picker accept={`${IMAGE_ACCEPT},${VIDEO_ACCEPT}`} multiple busy={busy === "gallery"} onFiles={addGallery}
            className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted hover:border-primary hover:text-foreground">
            <span className="text-xl">+</span>Add
          </Picker>
        </div>
      </section>
    </div>
  );
}

function Slot({ title, hint, accept, url, busy, onFiles, onRemove, children }: {
  title: string; hint: string; accept: string; url: string | null; busy: boolean;
  onFiles: (f: File[]) => void; onRemove: () => void; children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-bold uppercase tracking-wide text-muted">{title}</h3>
      {url && <div className="rounded-xl border border-border bg-[repeating-conic-gradient(#f5f5f4_0_25%,#fff_0_50%)] bg-[length:16px_16px] p-2">{children}</div>}
      <div className="flex gap-2">
        <Picker accept={accept} busy={busy} onFiles={onFiles} className="btn-ghost flex-1 text-sm">{url ? "Replace" : "Upload"}</Picker>
        {url && <button type="button" className="btn-ghost text-sm" disabled={busy} onClick={onRemove}>Remove</button>}
      </div>
      <p className="text-xs text-muted">{hint}</p>
    </section>
  );
}

function Picker({ accept, multiple, busy, onFiles, className, children }: {
  accept: string; multiple?: boolean; busy: boolean; onFiles: (f: File[]) => void; className: string; children: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button type="button" disabled={busy} onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...e.dataTransfer.files]; if (f.length) onFiles(multiple ? f : f.slice(0, 1)); }}
        className={`${className} ${over ? "ring-2 ring-primary" : ""}`}>
        {busy ? "Uploading…" : children}
      </button>
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple}
        onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; if (f.length) onFiles(f); }} />
    </>
  );
}
