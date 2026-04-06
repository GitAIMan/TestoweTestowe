"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";
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
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedPkgs, setExpandedPkgs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/menu/offer-types")
      .then((res) => res.json())
      .then(setOfferTypes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleType(id: string) {
    setExpandedTypes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function togglePkg(id: string) {
    setExpandedPkgs((prev) => ({ ...prev, [id]: !prev[id] }));
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
        Zaznacz pakiety, które chcesz dodać do oferty. Rozwiń, żeby zobaczyć
        skład.
      </p>

      <div className="space-y-3">
        {offerTypes.map((ot) => (
          <div key={ot.id} className="rounded-lg border">
            <button
              onClick={() => toggleType(ot.id)}
              className="flex items-center gap-2 w-full p-3 text-left font-semibold bg-muted/50 rounded-t-lg"
            >
              {expandedTypes[ot.id] ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {ot.name}
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {ot.packages.length} pakietów
              </span>
            </button>

            {expandedTypes[ot.id] && (
              <div className="p-2 space-y-2">
                {ot.packages.map((pkg) => {
                  const selected = isSelected(pkg.id);
                  const pkgExpanded = expandedPkgs[pkg.id];

                  return (
                    <div
                      key={pkg.id}
                      className={`rounded border transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      {/* Wiersz pakietu: checkbox + nazwa + chevron */}
                      <div className="flex items-center gap-3 p-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => togglePackage(pkg, ot.name)}
                          className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selected
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/40 hover:border-primary"
                          }`}
                        >
                          {selected && (
                            <svg
                              viewBox="0 0 12 12"
                              className="h-3 w-3 text-primary-foreground"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </button>

                        {/* Nazwa + cena */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{pkg.name}</span>
                          {pkg.price && (
                            <span className="text-muted-foreground ml-2 text-sm">
                              ({Number(pkg.price).toFixed(2)} zł)
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {pkg.sections.length} sekcji ·{" "}
                            {pkg.sections.reduce(
                              (sum, s) => sum + s.items.length,
                              0
                            )}{" "}
                            pozycji
                          </div>
                        </div>

                        {/* Rozwiń/zwiń skład */}
                        <button
                          onClick={() => togglePkg(pkg.id)}
                          className="flex-shrink-0 p-1 rounded hover:bg-muted/70 text-muted-foreground transition-colors"
                          title={pkgExpanded ? "Zwiń skład" : "Rozwiń skład"}
                        >
                          {pkgExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Rozwinięty skład pakietu */}
                      {pkgExpanded && (
                        <div className="px-3 pb-3 pt-0 ml-8 border-t border-border/50">
                          <div className="pt-2 space-y-2">
                            {pkg.sections.map((sec, secIdx) => (
                              <div key={sec.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {secIdx < pkg.sections.length - 1
                                      ? "├──"
                                      : "└──"}
                                  </span>
                                  <span className="font-medium">
                                    {sec.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {sec.selectionMode === "ALL_INCLUDED"
                                      ? "Wszystko w cenie"
                                      : `Wybierz ${sec.selectionCount}`}
                                  </Badge>
                                </div>
                                <div className="ml-8 text-xs text-muted-foreground mt-0.5">
                                  {sec.items.map((item) => item.name).join(", ")}
                                </div>
                              </div>
                            ))}
                          </div>
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

      {/* Podsumowanie wybranych + suma */}
      {data.packages.length > 0 && (() => {
        const total = data.packages.reduce(
          (sum, pkg) => sum + (pkg.priceSnapshot ? Number(pkg.priceSnapshot) : 0),
          0
        );
        return (
          <div className="mt-4 rounded-lg border bg-card p-4">
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
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {pkg.priceSnapshot
                        ? `${Number(pkg.priceSnapshot).toFixed(2)} zł`
                        : "w cenie"}
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
                </div>
              ))}
            </div>

            {/* Suma */}
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <span className="font-semibold">Suma pakietów:</span>
              <span className="text-lg font-bold text-primary">
                {total.toFixed(2)} zł
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
