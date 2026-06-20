import Decimal from "decimal.js";

export interface DiffItem {
  name: string;
  quantity: number;
  unitPrice: string;
  vatRate: number;
  sourceType: string | null;
  offerItemId: string | null;
  timeFrom?: string | null;
  timeTo?: string | null;
  hallName?: string | null;
  day?: number;
}

export interface ItemChange {
  before: DiffItem;
  after: DiffItem;
  fields: string[];
}

export interface AmendmentDiff {
  added: DiffItem[];
  removed: DiffItem[];
  changed: ItemChange[];
}

/**
 * Porównuje snapshot pozycji z aktualnymi — identyfikacja po offerItemId.
 * Snapshoty z poprzedniego aneksu (lub bazowe) vs aktualne offerItems.
 */
export function computeAmendmentDiff(
  baseline: DiffItem[],
  current: DiffItem[]
): AmendmentDiff {
  const baselineMap = new Map<string, DiffItem>();
  for (const b of baseline) {
    if (b.offerItemId) baselineMap.set(b.offerItemId, b);
  }
  const currentMap = new Map<string, DiffItem>();
  for (const c of current) {
    if (c.offerItemId) currentMap.set(c.offerItemId, c);
  }

  const added: DiffItem[] = [];
  const removed: DiffItem[] = [];
  const changed: ItemChange[] = [];

  for (const c of current) {
    if (!c.offerItemId || !baselineMap.has(c.offerItemId)) {
      added.push(c);
      continue;
    }
    const b = baselineMap.get(c.offerItemId)!;
    const fields: string[] = [];
    if (b.name !== c.name) fields.push("nazwa");
    if (b.quantity !== c.quantity) fields.push("ilość");
    if (!new Decimal(b.unitPrice).equals(new Decimal(c.unitPrice))) fields.push("cena");
    if (b.vatRate !== c.vatRate) fields.push("VAT");
    if ((b.timeFrom || "") !== (c.timeFrom || "")) fields.push("godzina od");
    if ((b.timeTo || "") !== (c.timeTo || "")) fields.push("godzina do");
    if ((b.hallName || "") !== (c.hallName || "")) fields.push("sala");
    if (fields.length > 0) changed.push({ before: b, after: c, fields });
  }

  for (const b of baseline) {
    if (!b.offerItemId || !currentMap.has(b.offerItemId)) {
      removed.push(b);
    }
  }

  return { added, removed, changed };
}

export function itemBrutto(item: DiffItem, personCount: number): Decimal {
  const mul = item.sourceType === "PACKAGE" ? personCount : 1;
  const netto = new Decimal(item.unitPrice).mul(item.quantity).mul(mul);
  return netto.mul(new Decimal(1).add(new Decimal(item.vatRate).div(100)));
}
