import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";
import type { AmendmentDiff } from "@/lib/amendment-diff";
import { contractCode } from "@/components/contracts/contract-pdf";

const fontDir = path.join(process.cwd(), "node_modules", "@expo-google-fonts");

Font.register({
  family: "Fraunces",
  fonts: [
    { src: path.join(fontDir, "fraunces", "400Regular", "Fraunces_400Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "fraunces", "600SemiBold", "Fraunces_600SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "fraunces", "700Bold", "Fraunces_700Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: "Manrope",
  fonts: [
    { src: path.join(fontDir, "manrope", "400Regular", "Manrope_400Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "manrope", "500Medium", "Manrope_500Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontDir, "manrope", "600SemiBold", "Manrope_600SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "manrope", "700Bold", "Manrope_700Bold.ttf"), fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((w) => [w]);

const INK = "#1a1210";
const BODY = "#3f2e2a";
const MUTE = "#8f7872";
const RULE = "#ecd9d4";
const CREAM = "#fbf4f1";
const BRAND_DEFAULT = "#d16470";
const RED = "#b91c1c";
const GREEN = "#15803d";

function formatPLN(n: number): string {
  return n
    .toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00a0/g, " ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface AmendmentPdfProps {
  hotel: {
    hotelName: string;
    primaryColor?: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    nip: string | null;
  };
  contract: {
    clientFullName: string;
    clientAddress: string | null;
    clientNip: string | null;
    clientPesel: string | null;
    signedAt: string | null;
    createdAt: string;
  };
  offer: {
    eventName: string | null;
    eventDateFrom: string;
    adultsCount: number;
    childrenCount: number;
  };
  amendment: {
    number: number;
    createdAt: string;
    totalBefore: string;
    totalAfter: string;
  };
  diff: AmendmentDiff;
  personCount: number;
}

export function AmendmentPdf({
  hotel,
  contract,
  offer,
  amendment,
  diff,
  personCount,
}: AmendmentPdfProps) {
  const accent =
    hotel.primaryColor && /^#?[0-9a-fA-F]{6}$/.test(hotel.primaryColor.replace("#", ""))
      ? hotel.primaryColor.startsWith("#")
        ? hotel.primaryColor
        : `#${hotel.primaryColor}`
      : BRAND_DEFAULT;

  const totalBefore = Number(amendment.totalBefore);
  const totalAfter = Number(amendment.totalAfter);
  const delta = totalAfter - totalBefore;
  const deltaColor = delta > 0 ? RED : delta < 0 ? GREEN : MUTE;
  const deltaSign = delta > 0 ? "+" : "";

  const s = StyleSheet.create({
    page: {
      padding: 48,
      fontFamily: "Manrope",
      fontSize: 10,
      color: BODY,
      backgroundColor: "#ffffff",
    },
    headerBar: {
      borderLeftWidth: 4,
      borderLeftColor: accent,
      borderLeftStyle: "solid",
      paddingLeft: 14,
      marginBottom: 18,
    },
    eyebrow: {
      fontSize: 9,
      color: accent,
      letterSpacing: 2,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: 4,
    },
    title: {
      fontFamily: "Fraunces",
      fontSize: 24,
      color: INK,
      fontWeight: 700,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 10,
      color: MUTE,
      marginTop: 4,
    },
    // Strony
    partiesRow: {
      flexDirection: "row",
      gap: 14,
      marginBottom: 18,
    },
    partyCard: {
      flex: 1,
      backgroundColor: CREAM,
      borderLeftWidth: 3,
      borderLeftColor: accent,
      borderLeftStyle: "solid",
      padding: 12,
    },
    partyLabel: {
      fontSize: 8,
      color: MUTE,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: 6,
    },
    partyName: {
      fontFamily: "Fraunces",
      fontSize: 13,
      color: INK,
      fontWeight: 600,
      marginBottom: 2,
    },
    partyMeta: {
      fontSize: 9,
      color: BODY,
      marginTop: 2,
    },
    // Sekcje
    sectionTitle: {
      fontFamily: "Fraunces",
      fontSize: 14,
      color: INK,
      fontWeight: 600,
      marginTop: 14,
      marginBottom: 8,
    },
    intro: {
      fontFamily: "Fraunces",
      fontSize: 10,
      color: BODY,
      lineHeight: 1.5,
      marginBottom: 12,
    },
    // Diff row
    diffGroup: {
      marginBottom: 10,
    },
    diffGroupLabel: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    diffRow: {
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      borderBottomStyle: "solid",
      paddingVertical: 6,
      flexDirection: "row",
      gap: 10,
    },
    diffName: { flex: 1 },
    diffMeta: { fontSize: 8.5, color: MUTE, marginTop: 2 },
    diffAmount: { width: 80, textAlign: "right", fontWeight: 600, color: INK },
    // Total
    totalBox: {
      marginTop: 18,
      backgroundColor: INK,
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    totalLeft: { flexDirection: "column" },
    totalBeforeLabel: { fontSize: 9, color: "#d3cbc7", letterSpacing: 1.5, textTransform: "uppercase" },
    totalBeforeValue: { fontFamily: "Fraunces", fontSize: 11, color: "#e8e0dc", textDecoration: "line-through" },
    totalDeltaLabel: { fontSize: 9, color: "#d3cbc7", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 },
    totalDeltaValue: { fontFamily: "Fraunces", fontSize: 11 },
    totalRight: { alignItems: "flex-end" },
    totalAfterLabel: { fontSize: 9, color: "#d3cbc7", letterSpacing: 1.5, textTransform: "uppercase" },
    totalAfterValue: { fontFamily: "Fraunces", fontSize: 15, color: "#ffffff", fontWeight: 700 },
    // Signatures
    signRow: {
      flexDirection: "row",
      gap: 40,
      marginTop: 36,
    },
    signBox: { flex: 1 },
    signLine: {
      borderTopWidth: 0.5,
      borderTopColor: INK,
      borderTopStyle: "solid",
      marginBottom: 4,
    },
    signLabel: { fontSize: 9, color: MUTE, textAlign: "center" },
    // Footer
    footer: {
      position: "absolute",
      left: 48,
      right: 48,
      bottom: 24,
      fontSize: 8,
      color: MUTE,
      textAlign: "center",
      borderTopWidth: 0.5,
      borderTopColor: RULE,
      borderTopStyle: "solid",
      paddingTop: 8,
    },
  });

  const renderItemLine = (
    it: {
      name: string;
      quantity: number;
      unitPrice: string;
      vatRate: number;
      sourceType: string | null;
      timeFrom?: string | null;
      timeTo?: string | null;
      hallName?: string | null;
      day?: number;
    },
    prefix: string,
    bruttoFn: () => number
  ) => {
    const meta: string[] = [];
    if (it.day) meta.push(`Dzień ${it.day}`);
    if (it.timeFrom || it.timeTo) {
      meta.push(`${it.timeFrom || "—"}${it.timeTo ? ` – ${it.timeTo}` : ""}`);
    }
    if (it.hallName) meta.push(it.hallName);
    if (it.sourceType === "PACKAGE") {
      meta.push(`${it.quantity} × ${personCount} os. × ${formatPLN(Number(it.unitPrice))} zł`);
    } else if (it.quantity > 1) {
      meta.push(`${it.quantity} × ${formatPLN(Number(it.unitPrice))} zł`);
    }
    const brutto = bruttoFn();
    return (
      <View style={s.diffRow}>
        <View style={s.diffName}>
          <Text>{prefix} {it.name}</Text>
          {meta.length > 0 && <Text style={s.diffMeta}>{meta.join(" · ")}</Text>}
        </View>
        <Text style={s.diffAmount}>
          {prefix === "−" ? "−" : prefix === "+" ? "+" : ""}
          {formatPLN(brutto)} zł
        </Text>
      </View>
    );
  };

  const itemBr = (it: { quantity: number; unitPrice: string; vatRate: number; sourceType: string | null }) => {
    const mul = it.sourceType === "PACKAGE" ? personCount : 1;
    return Number(it.unitPrice) * it.quantity * mul * (1 + it.vatRate / 100);
  };

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerBar}>
          <Text style={s.eyebrow}>Aneks nr {amendment.number}</Text>
          <Text style={s.title}>Aneks do umowy</Text>
          <Text style={s.subtitle}>
            Dotyczy umowy nr {contractCode(contract.createdAt, contract.clientFullName)}
            {contract.signedAt ? ` z dnia ${formatDate(contract.signedAt)}` : ""}. Wystawiony {formatDate(amendment.createdAt)}.
          </Text>
          {offer.eventName && (
            <Text style={s.subtitle}>Wydarzenie: {offer.eventName} · {formatDate(offer.eventDateFrom)}</Text>
          )}
        </View>

        <View style={s.partiesRow}>
          <View style={s.partyCard}>
            <Text style={s.partyLabel}>Zleceniobiorca</Text>
            <Text style={s.partyName}>{hotel.hotelName}</Text>
            {hotel.address && (
              <Text style={s.partyMeta}>
                {hotel.address}
                {hotel.postalCode || hotel.city ? `, ${hotel.postalCode || ""} ${hotel.city || ""}` : ""}
              </Text>
            )}
            {hotel.nip && <Text style={s.partyMeta}>NIP: {hotel.nip}</Text>}
          </View>
          <View style={s.partyCard}>
            <Text style={s.partyLabel}>Zleceniodawca</Text>
            <Text style={s.partyName}>{contract.clientFullName}</Text>
            {contract.clientAddress && <Text style={s.partyMeta}>{contract.clientAddress}</Text>}
            {contract.clientNip && <Text style={s.partyMeta}>NIP: {contract.clientNip}</Text>}
            {contract.clientPesel && <Text style={s.partyMeta}>PESEL: {contract.clientPesel}</Text>}
          </View>
        </View>

        <Text style={s.intro}>
          Strony postanawiają wprowadzić do umowy następujące zmiany w zakresie pozycji i wartości wydarzenia:
        </Text>

        {diff.added.length > 0 && (
          <View style={s.diffGroup}>
            <Text style={[s.diffGroupLabel, { color: RED }]}>Dodano</Text>
            {diff.added.map((it, i) => (
              <View key={`a-${i}`}>{renderItemLine(it, "+", () => itemBr(it))}</View>
            ))}
          </View>
        )}

        {diff.removed.length > 0 && (
          <View style={s.diffGroup}>
            <Text style={[s.diffGroupLabel, { color: GREEN }]}>Usunięto</Text>
            {diff.removed.map((it, i) => (
              <View key={`r-${i}`}>{renderItemLine(it, "−", () => itemBr(it))}</View>
            ))}
          </View>
        )}

        {diff.changed.length > 0 && (
          <View style={s.diffGroup}>
            <Text style={[s.diffGroupLabel, { color: accent }]}>Zmieniono</Text>
            {diff.changed.map((ch, i) => {
              const bBr = itemBr(ch.before);
              const aBr = itemBr(ch.after);
              const d = aBr - bBr;
              const dColor = d > 0 ? RED : d < 0 ? GREEN : MUTE;
              const dSign = d > 0 ? "+" : "";
              return (
                <View key={`c-${i}`} style={s.diffRow}>
                  <View style={s.diffName}>
                    <Text>{ch.after.name}</Text>
                    <Text style={s.diffMeta}>
                      Zmiana: {ch.fields.join(", ")} · z {formatPLN(bBr)} zł na {formatPLN(aBr)} zł
                    </Text>
                  </View>
                  <Text style={[s.diffAmount, { color: dColor }]}>
                    {dSign}{formatPLN(d)} zł
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0 && (
          <Text style={s.intro}>Brak zmian w pozycjach (aneks porządkowy).</Text>
        )}

        <View style={s.totalBox}>
          <View style={s.totalLeft}>
            <Text style={s.totalBeforeLabel}>Wartość przed aneksem</Text>
            <Text style={s.totalBeforeValue}>{formatPLN(totalBefore)} zł</Text>
            <Text style={s.totalDeltaLabel}>Różnica</Text>
            <Text style={[s.totalDeltaValue, { color: deltaColor === RED ? "#ff9a9a" : deltaColor === GREEN ? "#9be0b2" : "#e8e0dc" }]}>
              {deltaSign}{formatPLN(delta)} zł
            </Text>
          </View>
          <View style={s.totalRight}>
            <Text style={s.totalAfterLabel}>Nowa wartość umowy</Text>
            <Text style={s.totalAfterValue}>{formatPLN(totalAfter)} zł</Text>
          </View>
        </View>

        <Text style={s.intro}>
          Pozostałe postanowienia umowy pozostają bez zmian. Aneks wchodzi w życie z dniem podpisania przez obie strony.
        </Text>

        <View style={s.signRow}>
          <View style={s.signBox}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>Zleceniobiorca</Text>
          </View>
          <View style={s.signBox}>
            <View style={s.signLine} />
            <Text style={s.signLabel}>Zleceniodawca</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {hotel.hotelName}
          {hotel.address ? ` · ${hotel.address}` : ""}
          {hotel.contactPhone ? ` · tel. ${hotel.contactPhone}` : ""}
          {hotel.contactEmail ? ` · ${hotel.contactEmail}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
