#!/usr/bin/env node
/**
 * Foodle print bridge.
 * Runs on any machine on the restaurant LAN (Raspberry Pi, old laptop, the till PC).
 * Polls `print_jobs` for this restaurant and sends ESC/POS bytes to network
 * thermal printers (Epson TM-series, Star, most generic 80mm printers on port 9100).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... RESTAURANT_ID=... \
 *   PRINTER_kitchen=192.168.1.50 PRINTER_bar=192.168.1.51 PRINTER_receipt=192.168.1.52 \
 *   node index.mjs
 *
 * Any printer name not configured falls back to PRINTER_kitchen; set
 * PRINTER_xxx=console to print to stdout (handy for testing).
 */
import net from "node:net";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESTAURANT_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESTAURANT_ID) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and RESTAURANT_ID");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const POLL_MS = Number(process.env.POLL_MS ?? 3000);

// ---- ESC/POS helpers ----
const ESC = "\x1b", GS = "\x1d";
const cmd = {
  init: ESC + "@",
  center: ESC + "a\x01", left: ESC + "a\x00",
  bold: (on) => ESC + "E" + (on ? "\x01" : "\x00"),
  big: ESC + "!\x30", huge: GS + "!\x11", normal: ESC + "!\x00" + GS + "!\x00",
  feed: (n = 3) => ESC + "d" + String.fromCharCode(n),
  cut: GS + "V\x41\x00",
  beep: ESC + "B\x03\x02",
};
const line = (w = 48) => "-".repeat(w) + "\n";
const money = (p) => "£" + (p / 100).toFixed(2);
const row = (l, r, w = 48) => l.slice(0, w - r.length - 1).padEnd(w - r.length) + r + "\n";
const time = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function renderTicket(p) {
  let s = cmd.init + cmd.center + cmd.huge + cmd.bold(true);
  s += (p.type === "dine_in" ? `TABLE ${p.table ?? "?"}` : p.type.toUpperCase()) + "\n";
  s += cmd.normal + cmd.big + `#${p.order_number}\n` + cmd.normal + cmd.bold(false);
  s += `${p.station.toUpperCase()} · ${time(p.at)}` + (p.requested_at ? ` · FOR ${time(p.requested_at)}` : "") + "\n";
  if (p.customer) s += p.customer + "\n";
  s += cmd.left + line();
  for (const it of p.items) {
    s += cmd.big + cmd.bold(true) + `${it.qty} x ${it.name}\n` + cmd.normal + cmd.bold(false);
    for (const m of it.modifiers ?? []) s += `     + ${m}\n`;
    if (it.notes) s += `     ** ${it.notes.toUpperCase()} **\n`;
  }
  if (p.notes) s += line() + cmd.bold(true) + `NOTE: ${p.notes}\n` + cmd.bold(false);
  return s + cmd.feed(4) + cmd.cut + cmd.beep;
}

function renderReceipt(p) {
  const r = p.restaurant ?? {};
  let s = cmd.init + cmd.center + cmd.big + cmd.bold(true) + `${r.name ?? ""}\n` + cmd.normal + cmd.bold(false);
  s += [r.address_line1, r.city, r.postcode].filter(Boolean).join(", ") + "\n";
  if (r.phone) s += r.phone + "\n";
  s += `\n${new Date(p.at).toLocaleString("en-GB")}   Order #${p.order_number}${p.table ? `   Table ${p.table}` : ""}\n`;
  s += cmd.left + line();
  for (const it of p.items) {
    s += row(`${it.qty} x ${it.name}`, money(it.line_total_pence));
    for (const m of it.modifiers ?? []) s += `    + ${m}\n`;
  }
  s += line();
  s += row("Subtotal", money(p.subtotal_pence));
  if (p.discount_pence) s += row("Discount", "-" + money(p.discount_pence));
  if (p.service_pence) s += row("Service", money(p.service_pence));
  s += cmd.bold(true) + row("TOTAL", money(p.total_pence)) + cmd.bold(false);
  const vat = r.settings?.vat_rate ?? 20;
  s += row(`Includes VAT @ ${vat}%`, money(Math.round(p.total_pence - p.total_pence / (1 + vat / 100))));
  s += row("Paid by", (p.payment_method ?? "").replace("_", " "));
  s += cmd.center + "\nThank you!\n";
  return s + cmd.feed(4) + cmd.cut;
}

function renderAlert(p) {
  return cmd.init + cmd.center + cmd.huge + cmd.bold(true) + `${p.message}\n` + cmd.normal + time(p.at) + "\n" + cmd.feed(3) + cmd.cut + cmd.beep;
}

function render(job) {
  if (job.kind === "receipt") return renderReceipt(job.payload);
  if (job.kind === "alert") return renderAlert(job.payload);
  return renderTicket(job.payload);
}

function printerFor(name) {
  return process.env[`PRINTER_${name}`] ?? process.env.PRINTER_kitchen ?? "console";
}

function send(host, data) {
  if (host === "console") { console.log("\n" + data.replace(/[\x00-\x1f]/g, "")); return Promise.resolve(); }
  const [h, port = "9100"] = host.split(":");
  return new Promise((res, rej) => {
    const sock = net.createConnection({ host: h, port: Number(port) }, () => {
      sock.write(Buffer.from(data, "latin1"), () => sock.end());
    });
    sock.setTimeout(5000, () => { sock.destroy(); rej(new Error("printer timeout")); });
    sock.on("error", rej);
    sock.on("close", () => res());
  });
}

async function tick() {
  const { data: jobs, error } = await db
    .from("print_jobs").select("*")
    .eq("restaurant_id", RESTAURANT_ID).eq("status", "queued")
    .order("created_at").limit(10);
  if (error) return console.error(error.message);
  for (const job of jobs ?? []) {
    const { data: claimed } = await db.from("print_jobs").update({ status: "printing" }).eq("id", job.id).eq("status", "queued").select("id");
    if (!claimed?.length) continue; // another bridge took it
    try {
      await send(printerFor(job.printer), render(job));
      await db.from("print_jobs").update({ status: "done", printed_at: new Date().toISOString() }).eq("id", job.id);
      console.log(`printed ${job.kind} #${job.payload.order_number ?? ""} -> ${job.printer}`);
    } catch (e) {
      console.error(`print failed: ${e.message}`);
      await db.from("print_jobs").update({ status: "failed", error: String(e.message) }).eq("id", job.id);
    }
  }
}

console.log(`Foodle print bridge · restaurant ${RESTAURANT_ID} · polling every ${POLL_MS}ms`);
setInterval(() => tick().catch(console.error), POLL_MS);
tick();
