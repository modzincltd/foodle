import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getMenus, getRestaurantBySlug } from "@/lib/data/restaurant";
import { formatMoney } from "@/lib/money";
import type { Menu, Restaurant } from "@/lib/types";

export const dynamic = "force-dynamic";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1c1917" },
  header: { textAlign: "center", marginBottom: 18 },
  name: { fontSize: 26, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  tagline: { fontSize: 11, color: "#78716c", marginTop: 4 },
  menuTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.5 },
  cat: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: "#e7e5e4", textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  desc: { color: "#57534e", fontSize: 8.5, marginTop: 1 },
  price: { fontFamily: "Helvetica-Bold", marginLeft: 12 },
  tags: { fontSize: 7.5, color: "#78716c" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 7.5, color: "#a8a29e" },
  cols: { flexDirection: "row", gap: 24 },
  col: { flex: 1 },
});

function MenuPdf({ r, menus }: { r: Restaurant; menus: Menu[] }) {
  const twoCol = menus.reduce((n, m) => n + m.categories.reduce((k, c) => k + c.items.length, 0), 0) > 28;
  const renderCategories = (cats: Menu["categories"]) =>
    cats.filter((c) => c.items.length).map((c) => (
      <View key={c.id} wrap={false}>
        <Text style={s.cat}>{c.name}</Text>
        {c.items.filter((i) => !i.sold_out).map((i) => (
          <View key={i.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>
                {i.name}
                {i.dietary.length ? <Text style={s.tags}>  {i.dietary.map((d) => d.toUpperCase()).join(" ")}</Text> : null}
              </Text>
              {i.description ? <Text style={s.desc}>{i.description}</Text> : null}
            </View>
            <Text style={s.price}>{formatMoney(i.price_pence, r.currency)}</Text>
          </View>
        ))}
      </View>
    ));

  return (
    <Document title={`${r.name} – Menu`} author={r.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{r.name.toUpperCase()}</Text>
          {r.tagline ? <Text style={s.tagline}>{r.tagline}</Text> : null}
        </View>
        {menus.map((m) => {
          const cats = m.categories.filter((c) => c.items.length);
          const half = Math.ceil(cats.length / 2);
          return (
            <View key={m.id}>
              {menus.length > 1 ? <Text style={s.menuTitle}>{m.name}</Text> : null}
              {twoCol ? (
                <View style={s.cols}>
                  <View style={s.col}>{renderCategories(cats.slice(0, half))}</View>
                  <View style={s.col}>{renderCategories(cats.slice(half))}</View>
                </View>
              ) : renderCategories(cats)}
            </View>
          );
        })}
        <Text style={s.footer} fixed>
          V vegetarian · VG vegan · GF gluten free · Please tell us about any allergies before ordering.
          {"\n"}{[r.address_line1, r.city, r.postcode].filter(Boolean).join(", ")}{r.phone ? ` · ${r.phone}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return new NextResponse("Not found", { status: 404 });
  const menus = await getMenus(r.id, { channel: "website" });
  const buf = await renderToBuffer(<MenuPdf r={r} menus={menus} />);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-menu.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
