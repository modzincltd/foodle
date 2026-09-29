// Website theme: templates, font list and colour helpers.
// Isomorphic (used by the public site and the admin live preview).

export type TemplateId = "classic" | "modern" | "bistro";

export interface SiteTheme {
  template: TemplateId;
  primary: string; // buttons, links
  accent: string; // highlights, category labels
  background: string; // page background (text colours derive from it)
  heading_font: string;
  body_font: string;
}

/** Shape stored in restaurants.theme (jsonb). Older rows only have primary/accent. */
export type ThemeJson = Partial<SiteTheme> & { primary: string; accent: string };

type FontKind = "sans" | "serif" | "display";
export interface FontDef { name: string; kind: FontKind; weights: string }

export const FONTS: FontDef[] = [
  { name: "Inter", kind: "sans", weights: "400;500;600;700;900" },
  { name: "DM Sans", kind: "sans", weights: "400;500;700" },
  { name: "Poppins", kind: "sans", weights: "400;500;600;700;800" },
  { name: "Montserrat", kind: "sans", weights: "400;500;600;700;800" },
  { name: "Work Sans", kind: "sans", weights: "400;500;600;700" },
  { name: "Lato", kind: "sans", weights: "400;700;900" },
  { name: "Playfair Display", kind: "serif", weights: "400;600;700;900" },
  { name: "Lora", kind: "serif", weights: "400;500;600;700" },
  { name: "Cormorant Garamond", kind: "serif", weights: "400;500;600;700" },
  { name: "Fraunces", kind: "serif", weights: "400;600;700;900" },
  { name: "DM Serif Display", kind: "serif", weights: "400" },
  { name: "Bebas Neue", kind: "display", weights: "400" },
  { name: "Oswald", kind: "display", weights: "400;500;600;700" },
];

export interface TemplateDef {
  id: TemplateId;
  name: string;
  blurb: string;
  preset: Omit<SiteTheme, "template">;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "classic",
    name: "Classic",
    blurb: "Photo hero, full menu with opening hours alongside.",
    preset: { primary: "#c2410c", accent: "#f59e0b", background: "#fafaf7", heading_font: "Poppins", body_font: "Inter" },
  },
  {
    id: "modern",
    name: "Modern",
    blurb: "Bold type, split hero and menu sections as cards.",
    preset: { primary: "#111827", accent: "#16a34a", background: "#ffffff", heading_font: "Bebas Neue", body_font: "DM Sans" },
  },
  {
    id: "bistro",
    name: "Bistro",
    blurb: "Centred and elegant, serif type and a printed-menu feel.",
    preset: { primary: "#7c2d12", accent: "#a16207", background: "#f5efe6", heading_font: "Playfair Display", body_font: "Lora" },
  },
];

const HEX = /^#[0-9a-f]{6}$/i;
const fontNames = new Set(FONTS.map((f) => f.name));

export function isTemplate(v: unknown): v is TemplateId {
  return TEMPLATES.some((t) => t.id === v);
}

/** Fill gaps from the template preset so old rows keep working. */
export function normalizeTheme(raw: Partial<ThemeJson> | null | undefined): SiteTheme {
  const template = isTemplate(raw?.template) ? raw!.template! : "classic";
  const p = TEMPLATES.find((t) => t.id === template)!.preset;
  const hex = (v: unknown, d: string) => (typeof v === "string" && HEX.test(v) ? v : d);
  const font = (v: unknown, d: string) => (typeof v === "string" && fontNames.has(v) ? v : d);
  return {
    template,
    primary: hex(raw?.primary, p.primary),
    accent: hex(raw?.accent, p.accent),
    background: hex(raw?.background, p.background),
    heading_font: font(raw?.heading_font, p.heading_font),
    body_font: font(raw?.body_font, p.body_font),
  };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const isDark = (hex: string) => luminance(hex) < 0.4;

function stack(name: string) {
  const kind = FONTS.find((f) => f.name === name)?.kind ?? "sans";
  const fallback = kind === "serif" ? "Georgia, 'Times New Roman', serif" : "ui-sans-serif, system-ui, sans-serif";
  return `'${name}', ${fallback}`;
}

/** CSS custom properties for a themed site wrapper. */
export function themeVars(t: SiteTheme): React.CSSProperties {
  const dark = isDark(t.background);
  return {
    ["--background" as string]: t.background,
    ["--foreground" as string]: dark ? "#fafaf9" : "#1c1917",
    ["--muted" as string]: dark ? "#a8a29e" : "#6b6460",
    ["--card" as string]: dark ? `color-mix(in srgb, ${t.background}, white 7%)` : `color-mix(in srgb, ${t.background}, white 60%)`,
    ["--border" as string]: dark ? `color-mix(in srgb, ${t.background}, white 16%)` : `color-mix(in srgb, ${t.background}, black 11%)`,
    ["--primary" as string]: t.primary,
    ["--on-primary" as string]: isDark(t.primary) ? "#ffffff" : "#111111",
    ["--accent" as string]: t.accent,
    ["--font-heading" as string]: stack(t.heading_font),
    ["--font-body" as string]: stack(t.body_font),
  };
}

/** Google Fonts stylesheet URL for the given font names. */
export function googleFontsHref(names: string[]) {
  const fams = [...new Set(names)]
    .map((n) => FONTS.find((f) => f.name === n))
    .filter((f): f is FontDef => !!f)
    .map((f) => `family=${f.name.replace(/ /g, "+")}:wght@${f.weights}`);
  return `https://fonts.googleapis.com/css2?${fams.join("&")}&display=swap`;
}
