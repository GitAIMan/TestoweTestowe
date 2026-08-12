import { describe, it, expect } from "vitest";
import { computeAmendmentDiff, itemBrutto, type DiffItem } from "./amendment-diff";

function makeItem(overrides: Partial<DiffItem> = {}): DiffItem {
  return {
    name: "Sala Balowa",
    quantity: 1,
    unitPrice: "100",
    vatRate: 23,
    sourceType: "HALL",
    offerItemId: "item-1",
    ...overrides,
  };
}

describe("computeAmendmentDiff", () => {
  it("wykrywa dodaną pozycję (brak w baseline)", () => {
    const current = [makeItem({ offerItemId: "new-1" })];
    const diff = computeAmendmentDiff([], current);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it("wykrywa usuniętą pozycję (brak w current)", () => {
    const baseline = [makeItem({ offerItemId: "old-1" })];
    const diff = computeAmendmentDiff(baseline, []);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(0);
  });

  it("wykrywa zmianę ceny", () => {
    const baseline = [makeItem({ unitPrice: "100" })];
    const current = [makeItem({ unitPrice: "150" })];
    const diff = computeAmendmentDiff(baseline, current);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0].fields).toContain("cena");
  });

  it("nie zgłasza zmiany ceny gdy wartości są liczbowo równe mimo różnego zapisu (100 vs 100.00)", () => {
    const baseline = [makeItem({ unitPrice: "100" })];
    const current = [makeItem({ unitPrice: "100.00" })];
    const diff = computeAmendmentDiff(baseline, current);
    expect(diff.changed).toHaveLength(0);
  });

  it("wykrywa wielokrotne pola zmienione naraz", () => {
    const baseline = [makeItem({ quantity: 1, vatRate: 23, hallName: "Sala A" })];
    const current = [makeItem({ quantity: 2, vatRate: 8, hallName: "Sala B" })];
    const diff = computeAmendmentDiff(baseline, current);
    expect(diff.changed[0].fields).toEqual(
      expect.arrayContaining(["ilość", "VAT", "sala"])
    );
  });

  it("pozycje bez offerItemId zawsze liczone jako dodane/usunięte, nigdy dopasowane", () => {
    const baseline = [makeItem({ offerItemId: null })];
    const current = [makeItem({ offerItemId: null })];
    const diff = computeAmendmentDiff(baseline, current);
    // brak offerItemId -> nie trafiają do map, więc current bez dopasowania = added,
    // a baseline bez dopasowania w currentMap = removed
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
    expect(diff.changed).toHaveLength(0);
  });

  it("brak zmian gdy baseline i current identyczne", () => {
    const item = makeItem();
    const diff = computeAmendmentDiff([item], [{ ...item }]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });
});

describe("itemBrutto", () => {
  it("pozycja PACKAGE mnoży przez liczbę osób", () => {
    const item = makeItem({
      sourceType: "PACKAGE",
      unitPrice: "100",
      quantity: 1,
      vatRate: 8,
    });
    // 100 * 1 * 10 osób * 1.08 = 1080
    const result = itemBrutto(item, 10);
    expect(result.toNumber()).toBeCloseTo(1080, 2);
  });

  it("pozycja HALL/CUSTOM nie mnoży przez liczbę osób", () => {
    const item = makeItem({
      sourceType: "HALL",
      unitPrice: "500",
      quantity: 1,
      vatRate: 23,
    });
    // 500 * 1 * 1.23 = 615, personCount ignorowany
    const result = itemBrutto(item, 50);
    expect(result.toNumber()).toBeCloseTo(615, 2);
  });

  it("VAT 0% liczy się poprawnie (brutto = netto)", () => {
    const item = makeItem({ unitPrice: "200", quantity: 2, vatRate: 0, sourceType: "CUSTOM" });
    const result = itemBrutto(item, 1);
    expect(result.toNumber()).toBe(400);
  });
});
