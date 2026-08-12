import { describe, it, expect } from "vitest";
import {
  calculatePackagePrice,
  calculatePackagePriceFromClientSelection,
  type PricedPackage,
} from "./package-pricing";

describe("calculatePackagePrice — hierarchia cen", () => {
  it("wariant 1: cena pakietu > 0 wygrywa, ignoruje ceny sekcji/pozycji", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Dania główne",
      price: 150,
      vatRate: 8,
      sections: [
        {
          id: "s1",
          name: "Zupy",
          price: 999, // musi być ignorowane
          selectionMode: "ALL_INCLUDED",
          selectionCount: null,
          items: [{ id: "i1", name: "Rosół", price: 50 }],
        },
      ],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.unitPrice.toNumber()).toBe(150);
    expect(result.source).toBe("PACKAGE");
    expect(result.vatRate).toBe(8);
  });

  it("wariant 2: pakiet = 0, sekcja ma cenę > 0 → suma cen sekcji", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Dania główne",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Zupy",
          price: 20,
          selectionMode: "ALL_INCLUDED",
          selectionCount: null,
          items: [{ id: "i1", name: "Rosół", price: 999 }], // ignorowane
        },
        {
          id: "s2",
          name: "Mięsa",
          price: 40,
          selectionMode: "ALL_INCLUDED",
          selectionCount: null,
          items: [],
        },
      ],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.unitPrice.toNumber()).toBe(60);
    expect(result.source).toBe("SECTIONS");
  });

  it("wariant 3a: ALL_INCLUDED sumuje wszystkie pozycje z ceną", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Zupy",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Zupy",
          price: 0,
          selectionMode: "ALL_INCLUDED",
          selectionCount: null,
          items: [
            { id: "i1", name: "Rosół", price: 10 },
            { id: "i2", name: "Żurek", price: 12 },
            { id: "i3", name: "Bez ceny", price: null },
          ],
        },
      ],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.unitPrice.toNumber()).toBe(22);
    expect(result.source).toBe("ITEMS");
  });

  it("wariant 3b: CHOOSE_X_FROM_Y bierze X najdroższych pozycji (pesymistycznie)", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Mięsa",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Mięsa",
          price: 0,
          selectionMode: "CHOOSE_X_FROM_Y",
          selectionCount: 2,
          items: [
            { id: "i1", name: "Kurczak", price: 10 },
            { id: "i2", name: "Wołowina", price: 30 },
            { id: "i3", name: "Wieprzowina", price: 20 },
          ],
        },
      ],
    };
    const result = calculatePackagePrice(pkg);
    // 2 najdroższe: 30 + 20 = 50, NIE 10+30=40
    expect(result.unitPrice.toNumber()).toBe(50);
    expect(result.sections[0].includedItems.map((i) => i.name).sort()).toEqual(
      ["Wieprzowina", "Wołowina"]
    );
  });

  it("CHOOSE_X_FROM_Y z selectionCount null/0 domyślnie bierze 1 pozycję", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Deser",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Desery",
          price: 0,
          selectionMode: "CHOOSE_X_FROM_Y",
          selectionCount: null,
          items: [
            { id: "i1", name: "Sernik", price: 15 },
            { id: "i2", name: "Szarlotka", price: 25 },
          ],
        },
      ],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.unitPrice.toNumber()).toBe(25); // tylko najdroższa
  });

  it("pusty pakiet (wszystko 0/brak cen) → source EMPTY, cena 0", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Pusty",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Sekcja",
          price: 0,
          selectionMode: "ALL_INCLUDED",
          selectionCount: null,
          items: [{ id: "i1", name: "Bez ceny", price: null }],
        },
      ],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.unitPrice.toNumber()).toBe(0);
    expect(result.source).toBe("EMPTY");
  });

  it("brak vatRate → fallback 8%", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Test",
      price: 100,
      sections: [],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.vatRate).toBe(8);
  });

  it("obsługuje wartości string z bazy (Prisma Decimal jako string)", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Test",
      price: "199.99",
      sections: [],
    };
    const result = calculatePackagePrice(pkg);
    expect(result.unitPrice.toFixed(2)).toBe("199.99");
  });

  it("niepoprawna wartość ceny nie wywala wyjątku, traktowana jako 0", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Test",
      price: "nie-liczba" as unknown as number,
      sections: [],
    };
    expect(() => calculatePackagePrice(pkg)).not.toThrow();
    expect(calculatePackagePrice(pkg).unitPrice.toNumber()).toBe(0);
  });
});

describe("calculatePackagePriceFromClientSelection", () => {
  it("cena pakietu > 0 jest niezmienna niezależnie od wyboru klienta", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Test",
      price: 100,
      sections: [
        {
          id: "s1",
          name: "Zupy",
          price: 0,
          selectionMode: "CHOOSE_X_FROM_Y",
          selectionCount: 1,
          items: [{ id: "i1", name: "Rosół", price: 10 }],
        },
      ],
    };
    const result = calculatePackagePriceFromClientSelection(pkg, new Set());
    expect(result.toNumber()).toBe(100);
  });

  it("ALL_INCLUDED liczy wszystkie pozycje niezależnie od zaznaczenia klienta", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Test",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Zupy",
          price: 0,
          selectionMode: "ALL_INCLUDED",
          selectionCount: null,
          items: [
            { id: "i1", name: "Rosół", price: 10 },
            { id: "i2", name: "Żurek", price: 12 },
          ],
        },
      ],
    };
    // klient nic nie zaznaczył, ale ALL_INCLUDED i tak sumuje wszystko
    const result = calculatePackagePriceFromClientSelection(pkg, new Set());
    expect(result.toNumber()).toBe(22);
  });

  it("CHOOSE_X_FROM_Y liczy tylko realnie zaznaczone przez klienta pozycje", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Mięsa",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Mięsa",
          price: 0,
          selectionMode: "CHOOSE_X_FROM_Y",
          selectionCount: 2,
          items: [
            { id: "i1", name: "Kurczak", price: 10 },
            { id: "i2", name: "Wołowina", price: 30 },
            { id: "i3", name: "Wieprzowina", price: 20 },
          ],
        },
      ],
    };
    // klient wybrał tylko najtańszą pozycję, mimo że oferta pesymistycznie liczyła 2 najdroższe (50)
    const result = calculatePackagePriceFromClientSelection(pkg, new Set(["i1"]));
    expect(result.toNumber()).toBe(10);
  });

  it("cena sekcji > 0 liczy się niezależnie od wyboru pozycji", () => {
    const pkg: PricedPackage = {
      id: "p1",
      name: "Test",
      price: 0,
      sections: [
        {
          id: "s1",
          name: "Zupy",
          price: 25,
          selectionMode: "CHOOSE_X_FROM_Y",
          selectionCount: 1,
          items: [{ id: "i1", name: "Rosół", price: 999 }],
        },
      ],
    };
    const result = calculatePackagePriceFromClientSelection(pkg, new Set());
    expect(result.toNumber()).toBe(25);
  });
});
