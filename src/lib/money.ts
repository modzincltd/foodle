export function formatMoney(pence: number, currency = "GBP", locale = "en-GB") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(pence / 100);
}

export function lineTotal(unitPence: number, modifiers: { price_pence: number }[], qty: number) {
  const mods = modifiers.reduce((s, m) => s + m.price_pence, 0);
  return (unitPence + mods) * qty;
}
