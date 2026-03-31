"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OfferFormData, OfferPackageItem } from "./offer-wizard-types";

interface MenuItem {
  id: string;
  name: string;
  price: string | null;
}

interface Section {
  id: string;
  name: string;
  selectionMode: string;
  selectionCount: number | null;
  items: MenuItem[];
}

interface Package {
  id: string;
  name: string;
  price: string | null;
  sections: Section[];
}

interface OfferType {
  id: string;
  name: string;
  packages: Package[];
}

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepPackages({ data, onChange }: Props) {
  const [offerTypes, setOfferTypes] = useState<OfferType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/menu/offer-types")
      .then((res) => res.json())
      .then(setOfferTypes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isSelected(packageId: string): boolean {
    return data.packages.some((p) => p.packageId === packageId);
  }

  function togglePackage(pkg: Package, offerTypeName: string) {
    if (isSelected(pkg.id)) {
      onChange({
        packages: data.packages.filter((p) => p.packageId !== pkg.id),
      });
    } else {
      const item: OfferPackageItem = {
        packageId: pkg.id,
        packageName: pkg.name,
        offerTypeName,
        priceSnapshot: pkg.price,
      };
      onChange({ packages: [...data.packages, item] });
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pakiety cateringowe</h2>
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pakiety cateringowe</h2>
      <p className="text-sm text-muted-foreground">
        Wybierz pakiety z dowolnych typów ofert — możesz mieszać (LEGO). Kliknij
        pakiet, żeby go dodać lub usunąć.
      </p>

      <div className="space-y-3">
        {offerTypes.map((ot) => (
          <div key={ot.id} className="rounded-lg border">
            <button
              onClick={() => toggle(ot.id)}
              className="flex items-center gap-2 w-full p-3 text-left font-semibold bg-muted/50 rounded-t-lg"
            >
              {expanded[ot.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {ot.name}
            </button>

            {expanded[ot.id] && (
              <div className="p-2 space-y-2">
                {ot.packages.map((pkg) => {
                  const selected = isSelected(pkg.id);
                  return (
                    <div key={pkg.id}>
                      <button
                        onClick={() => togglePackage(pkg, ot.name)}
                        className={`w-full flex items-center justify-between rounded border p-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <span className="font-medium">{pkg.name}</span>
                          {pkg.price && (
                            <span className="text-muted-foreground ml-2 text-sm">
                              ({Number(pkg.price).toFixed(2)} zł)
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {pkg.sections.length} sekcji ·{" "}
                            {pkg.sections.reduce(
                              (sum, s) => sum + s.items.length,
                              0
                            )}{" "}
                            pozycji
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>

                      {/* Podgląd zawartości pakietu */}
                      {selected && (
                        <div className="ml-4 mt-1 mb-2 text-xs text-muted-foreground space-y-1">
                          {pkg.sections.map((sec) => (
                            <div key={sec.id}>
                              <span className="font-medium">{sec.name}</span>
                              <Badge
                                variant="outline"
                                className="ml-1 text-[10px]"
                              >
                                {sec.selectionMode === "ALL_INCLUDED"
                                  ? "Wszystko"
                                  : `Wybierz ${sec.selectionCount}`}
                              </Badge>
                              <span className="ml-1">
                                ({sec.items.map((i) => i.name).join(", ")})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Podsumowanie wybranych */}
      {data.packages.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">
            Wybrane pakiety ({data.packages.length}):
          </h3>
          <div className="space-y-1">
            {data.packages.map((pkg) => (
              <div
                key={pkg.packageId}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <span className="text-sm">
                  {pkg.packageName}
                  <span className="text-muted-foreground ml-1">
                    ({pkg.offerTypeName})
                  </span>
                  {pkg.priceSnapshot && (
                    <span className="text-muted-foreground ml-1">
                      — {Number(pkg.priceSnapshot).toFixed(2)} zł
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({
                      packages: data.packages.filter(
                        (p) => p.packageId !== pkg.packageId
                      ),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
