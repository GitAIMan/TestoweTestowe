import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { calculatePackagePriceFromClientSelection } from "@/lib/package-pricing";

/**
 * Po zmianie wyborów klienta — policz faktyczną cenę i gdy różni się od
 * offer.totalPrice o > 0.01 zł, oznacz umowę jako wymagającą aneksu.
 * Bezpieczna: błąd nie rzuca, tylko zwraca false.
 */
export async function detectAmendmentFromSelections(
  agendaId: string
): Promise<boolean> {
  try {
    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      select: { offerId: true },
    });
    if (!agenda) return false;

    const fullOffer = await prisma.offer.findUnique({
      where: { id: agenda.offerId },
      select: {
        id: true,
        totalPrice: true,
        adultsCount: true,
        childrenCount: true,
        offerItems: {
          where: { sourceType: "PACKAGE" },
          select: {
            id: true,
            sourceId: true,
            quantity: true,
            vatRate: true,
          },
        },
      },
    });
    if (!fullOffer) return false;

    const personCount = fullOffer.adultsCount + fullOffer.childrenCount;

    const allSelections = await prisma.agendaSectionSelection.findMany({
      where: { agendaId },
      include: { items: { select: { menuItemId: true } } },
    });
    const selectionMap = new Map<string, Set<string>>();
    for (const s of allSelections) {
      if (!s.offerItemId) continue;
      selectionMap.set(
        `${s.offerItemId}:${s.sectionId}`,
        new Set(s.items.map((i) => i.menuItemId))
      );
    }

    const packageIds = fullOffer.offerItems
      .map((i) => i.sourceId)
      .filter((id): id is string => Boolean(id));

    const freshPackages = packageIds.length
      ? await prisma.package.findMany({
          where: { id: { in: packageIds } },
          include: { sections: { include: { items: true } } },
        })
      : [];
    const freshMap = new Map(freshPackages.map((p) => [p.id, p]));

    let actualTotal = new Decimal(0);

    const nonPackageItems = await prisma.offerItem.findMany({
      where: { offerId: fullOffer.id, sourceType: { not: "PACKAGE" } },
    });
    for (const it of nonPackageItems) {
      const netto = new Decimal(it.unitPrice.toString()).mul(it.quantity);
      const brutto = netto.mul(new Decimal(1).add(new Decimal(it.vatRate).div(100)));
      actualTotal = actualTotal.add(brutto);
    }

    for (const item of fullOffer.offerItems) {
      if (!item.sourceId) continue;
      const pkg = freshMap.get(item.sourceId);
      if (!pkg) continue;

      const clientSelectedIds = new Set<string>();
      for (const sec of pkg.sections) {
        const chosen = selectionMap.get(`${item.id}:${sec.id}`);
        if (chosen) {
          for (const id of chosen) clientSelectedIds.add(id);
        }
      }

      const unitNetto = calculatePackagePriceFromClientSelection(
        {
          id: pkg.id,
          name: pkg.name,
          price: pkg.price,
          vatRate: pkg.vatRate ?? 8,
          sections: pkg.sections.map((s) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            selectionMode: s.selectionMode,
            selectionCount: s.selectionCount,
            items: s.items.map((it) => ({
              id: it.id,
              name: it.name,
              price: it.price,
            })),
          })),
        },
        clientSelectedIds
      );

      const netto = unitNetto.mul(item.quantity).mul(personCount);
      const brutto = netto.mul(new Decimal(1).add(new Decimal(item.vatRate).div(100)));
      actualTotal = actualTotal.add(brutto);
    }

    const offerTotal = new Decimal(fullOffer.totalPrice.toString());
    const diff = actualTotal.minus(offerTotal).abs();

    if (diff.gt(new Decimal("0.01"))) {
      await prisma.contract.updateMany({
        where: {
          offerId: fullOffer.id,
          signedAt: { not: null },
        },
        data: { needsAmendment: true },
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
