"use client";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { HomeContent, type HomeData } from "@/components/site/HomeContent";
import { FONTS, TEMPLATES, googleFontsHref, themeVars, type SiteTheme, type TemplateId } from "@/lib/site/theme";
import { SubmitButton } from "../settings/SubmitButton";
import { MediaPanel, type Media } from "./MediaPanel";

export function WebsiteEditor({ initial, data, action }: { initial: SiteTheme; data: HomeData; action: (fd: FormData) => Promise<void> }) {
  const [t, setT] = useState<SiteTheme>(initial);
  const [saved, setSaved] = useState<SiteTheme>(initial);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"design" | "media">("design");
  const [media, setMedia] = useState<Media>({
    logo_url: data.restaurant.logo_url, hero_url: data.restaurant.hero_url,
    hero_video_url: data.restaurant.hero_video_url, gallery: data.restaurant.gallery ?? [],
  });
  const restaurant = { ...data.restaurant, ...media };
  const dirty = JSON.stringify(t) !== JSON.stringify(saved);
  const set = <K extends keyof SiteTheme>(k: K, v: SiteTheme[K]) => setT((p) => ({ ...p, [k]: v }));

  const pickTemplate = (id: TemplateId) => {
    const def = TEMPLATES.find((x) => x.id === id)!;
    setT({ template: id, ...def.preset });
  };

  async function submit(fd: FormData) {
    await action(fd);
    setSaved(t);
  }

  return (
    <form action={submit} className="flex h-[calc(100vh-3rem)] flex-col gap-4 lg:flex-row">
      {/* All fonts so the dropdowns and preview render instantly */}
      <link rel="stylesheet" href={googleFontsHref(FONTS.map((f) => f.name))} precedence="default" />
      {(["template", "primary", "accent", "background", "heading_font", "body_font"] as const).map((k) => (
        <input key={k} type="hidden" name={k} value={t[k]} />
      ))}

      <div className="w-full shrink-0 space-y-6 overflow-y-auto lg:w-80">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Website</h1>
          <a href={`/r/${data.restaurant.slug}`} target="_blank" className="text-sm text-muted hover:text-foreground">View live ↗</a>
        </div>

        <div className="flex gap-1 rounded-xl bg-black/5 p-1 text-sm font-semibold">
          {(["design", "media"] as const).map((x) => (
            <button key={x} type="button" onClick={() => setTab(x)} className={`flex-1 rounded-lg py-1.5 capitalize ${tab === x ? "bg-card shadow-sm" : "text-muted"}`}>{x === "media" ? "Logo & media" : "Design"}</button>
          ))}
        </div>

        {tab === "media" && <MediaPanel slug={data.restaurant.slug} media={media} onChange={setMedia} />}

        <div className={tab === "design" ? "space-y-6" : "hidden"}>
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Template</h2>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => pickTemplate(tpl.id)}
              className={`card flex w-full items-center gap-3 p-3 text-left transition ${t.template === tpl.id ? "ring-2 ring-primary" : "hover:bg-black/5"}`}
            >
              <Thumb id={tpl.id} theme={t.template === tpl.id ? t : { template: tpl.id, ...tpl.preset }} />
              <div>
                <div className="font-semibold">{tpl.name}</div>
                <div className="text-xs text-muted">{tpl.blurb}</div>
              </div>
            </button>
          ))}
          <p className="text-xs text-muted">Switching template resets fonts and colours to its defaults.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Fonts</h2>
          <FontSelect label="Headings" value={t.heading_font} onChange={(v) => set("heading_font", v)} />
          <FontSelect label="Body text" value={t.body_font} onChange={(v) => set("body_font", v)} />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Colours</h2>
          <Colour label="Background" value={t.background} onChange={(v) => set("background", v)} />
          <Colour label="Brand (buttons & links)" value={t.primary} onChange={(v) => set("primary", v)} />
          <Colour label="Accent (highlights)" value={t.accent} onChange={(v) => set("accent", v)} />
          <p className="text-xs text-muted">Text colour adjusts automatically for light or dark backgrounds.</p>
        </section>
        </div>

        <div className={`sticky bottom-0 items-center gap-3 bg-background py-3 ${tab === "design" ? "flex" : "hidden"}`}>
          <SubmitButton />
          {dirty && <button type="button" className="btn-ghost" onClick={() => setT(saved)}>Discard</button>}
          <span className="text-xs text-muted">{dirty ? "Unsaved changes" : "Saved"}</span>
        </div>
      </div>

      <div className="flex min-h-[60vh] min-w-0 flex-1 flex-col rounded-2xl border border-border bg-stone-100">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted">
          <span>Preview</span>
          <div className="flex gap-1">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={`rounded-md px-2 py-1 capitalize ${device === d ? "bg-white font-semibold text-foreground shadow-sm" : ""}`}>{d}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div inert className={`mx-auto overflow-hidden rounded-xl shadow-lg transition-all ${device === "mobile" ? "max-w-[390px]" : "max-w-full"}`}>
            <SiteShell restaurant={restaurant} theme={t}>
              <HomeContent theme={t} {...data} restaurant={restaurant} />
            </SiteShell>
          </div>
        </div>
      </div>
    </form>
  );
}

function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ fontFamily: `'${value}'` }}>
        {(["sans", "serif", "display"] as const).map((kind) => (
          <optgroup key={kind} label={kind === "sans" ? "Sans serif" : kind === "serif" ? "Serif" : "Display"}>
            {FONTS.filter((f) => f.kind === kind).map((f) => <option key={f.name} value={f.name} style={{ fontFamily: `'${f.name}'` }}>{f.name}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Colour({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [last, setLast] = useState(value);
  if (value !== last) { setLast(value); setText(value); }
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input
          className="input w-24 px-2 py-1 font-mono text-xs uppercase"
          value={text}
          maxLength={7}
          onChange={(e) => { setText(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase()); }}
          onBlur={() => setText(value)}
        />
        <input type="color" className="h-9 w-10 cursor-pointer rounded-lg border border-border bg-transparent" value={value} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  );
}

/** Tiny wireframe of each template in its own colours. */
function Thumb({ id, theme }: { id: TemplateId; theme: SiteTheme }) {
  const bar = "h-1 rounded-full";
  return (
    <div style={themeVars(theme)} className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-background p-1.5">
      {id === "classic" && (<>
        <div className="mb-1 h-5 rounded-sm bg-stone-800" />
        <div className="flex gap-1"><div className="flex-1 space-y-1"><div className={`${bar} bg-primary`} /><div className={`${bar} bg-muted/40`} /><div className={`${bar} bg-muted/40`} /></div><div className="h-5 w-4 rounded-sm bg-card ring-1 ring-border" /></div>
      </>)}
      {id === "modern" && (<>
        <div className="mb-1 flex gap-1"><div className="flex-1 space-y-1 pt-1"><div className="h-1.5 w-8 rounded-sm bg-foreground" /><div className={`${bar} w-5 bg-primary`} /></div><div className="h-5 w-7 rounded-sm bg-accent" /></div>
        <div className="flex gap-1"><div className="h-4 flex-1 rounded-sm bg-card ring-1 ring-border" /><div className="h-4 flex-1 rounded-sm bg-card ring-1 ring-border" /></div>
      </>)}
      {id === "bistro" && (<>
        <div className="mb-1 h-5 rounded-sm bg-primary/80" />
        <div className="mx-auto w-10 space-y-1"><div className={`${bar} mx-auto w-5 bg-accent`} /><div className={`${bar} bg-muted/40`} /><div className={`${bar} bg-muted/40`} /></div>
      </>)}
    </div>
  );
}
