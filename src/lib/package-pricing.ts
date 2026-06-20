import Decimal from "decimal.js";

// ————————————————————————————————————————————————
// Typy wejścia
// ————————————————————————————————————————————————
export interface PricedMenuItem {
  id: string;
  name: string;
  price: Decimal.Value | string | number | null | undefined;
}

export interface PricedSection {
  id: string;
  name: string;
  price: Decimal.Value | string | number | null | undefined;
  selectionMode: string; // "ALL_INCLUDED" | "CHOOSE_X_FROM_Y"
  selectionCount: number | null;
  items: PricedMenuItem[];
}

export interface PricedPackage {
  id: string;
  name: string;
  price: Decimal.Value | string | number | null | undefined;
  vatRate?: number | null;
  sections: PricedSection[];
}

// ————————————————————————————————————————————————
// Breakdown — skąd się wzięła cena (do UI)
// ————————————————————————————————————————————————
export type PriceSource = "PACKAGE" | "SECTIONS" | "ITEMS" | "EMPTY";

export interface SectionBreakdown {
  sectionId: string;
  sectionName: string;
  source: "SECTION_PRICE" | "ITEMS_ALL" | "ITEMS_TOP_X" | "EMPTY";
  unitPrice: string; // Decimal jako string
  includedItems: Array<{ id: string; name: string; price: string }>;
}

export interface PackagePriceResult {
  unitPrice: Decimal;       // cena jednostkowa za osobę
  vatRate: number;          // VAT % (z pakietu, fallback 8)
  source: PriceSource;      // skąd cena
  sections: SectionBreakdown[]; // detale per sekcja
}

// ————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————
function toDec(v: Decimal.Value | string | number | null | undefined): Decimal {
  if (v === null || v === undefined) return new Decimal(0);
  try {
    return new Decimal(v as Decimal.Value);
  } catch {
    return new Decimal(0);
  }
}

// ————————————————————————————————————————————————
// Główna funkcja
// ————————————————————————————————————————————————
/**
 * Oblicza cenę pakietu dla oferty wg hierarchii:
 *  1. Jeśli pakiet ma cenę > 0 → używamy ceny pakietu (sekcje/pozycje = tylko skład)
 *  2. Jeśli pakiet = 0, sekcja ma cenę > 0 → używamy ceny sekcji
 *  3. Jeśli pakiet = 0, sekcja = 0:
 *     - tryb ALL_INCLUDED → suma wszystkich pozycji
 *     - tryb CHOOSE_X_FROM_Y → suma X najdroższych pozycji (najbezpieczniej dla hotelu)
 *
 * Zwraca cenę ZA OSOBĘ oraz breakdown (skąd się wzięła).
 */
export function calculatePackagePrice(pkg: PricedPackage): PackagePriceResult {
  const pkgPrice = toDec(pkg.price);
  const vatRate = pkg.vatRate ?? 8;

  // Wariant 1: pakiet ma cenę
  if (pkgPrice.gt(0)) {
    return {
      unitPrice: pkgPrice,
      vatRate,
      source: "PACKAGE",
      sections: pkg.sections.map((s) => ({
        sectionId: s.id,
        sectionName: s.name,
        source: "EMPTY",
        unitPrice: "0",
        includedItems: [],
      })),
    };
  }

  // Wariant 2/3: sumujemy sekcje
  let totalSections = new Decimal(0);
  const breakdowns: SectionBreakdown[] = [];
  let anySectionHasPrice = false;
  let anyItemHasPrice = false;

  for (const section of pkg.sections) {
    const sectionPrice = toDec(section.price);

    if (sectionPrice.gt(0)) {
      // Wariant 2: cena na sekcji
      anySectionHasPrice = true;
      totalSections = totalSections.add(sectionPrice);
      breakdowns.push({
        sectionId: section.id,
        sectionName: section.name,
        source: "SECTION_PRICE",
        unitPrice: sectionPrice.toFixed(2),
        includedItems: [],
      });
      continue;
    }

    // Wariant 3: cena na pozycjach
    const itemsWithPrice = section.items
      .map((it) => ({ ...it, _price: toDec(it.price) }))
      .filter((it) => it._price.gt(0));

    if (itemsWithPrice.length === 0) {
      // Sekcja bez cen i bez cen na pozycjach — 0 zł (fallback / skład)
      breakdowns.push({
        sectionId: section.id,
        sectionName: section.name,
        source: "EMPTY",
        unitPrice: "0",
        includedItems: [],
      });
      continue;
    }

    anyItemHasPrice = true;

    let chosen: Array<(typeof itemsWithPrice)[number]> = [];
    let sumCell = new Decimal(0);
    let srcType: SectionBreakdown["source"] = "ITEMS_ALL";

    if (section.selectionMode === "CHOOSE_X_FROM_Y") {
      // bierzemy X najdroższych (najbezpieczniej dla hotelu)
      const x = Math.max(1, section.selectionCount || 1);
      chosen = [...itemsWithPrice]
        .sort((a, b) => b._price.cmp(a._price))
        .slice(0, x);
      srcType = "ITEMS_TOP_X";
    } else {
      // ALL_INCLUDED lub nieznany → suma wszystkich z ceną
      chosen = itemsWithPrice;
      srcType = "ITEMS_ALL";
    }

    for (const it of chosen) {
      sumCell = sumCell.add(it._price);
    }

    totalSections = totalSections.add(sumCell);
    breakdowns.push({
      sectionId: section.id,
      sectionName: section.name,
      source: srcType,
      unitPrice: sumCell.toFixed(2),
      includedItems: chosen.map((it) => ({
        id: it.id,
        name: it.name,
        price: it._price.toFixed(2),
      })),
    });
  }

  const source: PriceSource =
    anySectionHasPrice && anyItemHasPrice
      ? "SECTIONS" // mieszanka, ale dominują sekcje — oznaczmy SECTIONS (breakdown ma szczegóły)
      : anySectionHasPrice
      ? "SECTIONS"
      : anyItemHasPrice
      ? "ITEMS"
      : "EMPTY";

  return {
    unitPrice: totalSections,
    vatRate,
    source,
    sections: breakdowns,
  };
}

/**
 * Pomocnik — licząc cenę na podstawie faktycznego wyboru klienta (nie pesymistycznie).
 * Używany po wyborze klienta w agendzie, żeby wykryć różnicę względem oferty.
 *
 * selectedItemIds — Set ID pozycji zaznaczonych przez klienta
 */
export function calculatePackagePriceFromClientSelection(
  pkg: PricedPackage,
  selectedItemIds: Set<string>
): Decimal {
  const pkgPrice = toDec(pkg.price);

  // Jeśli pakiet ma cenę — niezmienne
  if (pkgPrice.gt(0)) return pkgPrice;

  let total = new Decimal(0);
  for (const section of pkg.sections) {
    const sectionPrice = toDec(section.price);
    if (sectionPrice.gt(0)) {
      total = total.add(sectionPrice);
      continue;
    }

    // Cena na pozycjach — sumujemy TYLKO zaznaczone przez klienta (lub wszystkie jeśli ALL_INCLUDED)
    for (const it of section.items) {
      const itPrice = toDec(it.price);
      if (itPrice.lte(0)) continue;

      if (section.selectionMode === "ALL_INCLUDED" || selectedItemIds.has(it.id)) {
        total = total.add(itPrice);
      }
    }
  }

  return total;
}
