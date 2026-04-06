import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: { marginBottom: 20 },
  hotelName: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  hotelInfo: { fontSize: 9, color: "#666", marginBottom: 2 },
  title: { fontSize: 14, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f3f4f6",
    padding: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  label: { color: "#666" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#1a56db",
  },
  totalLabel: { fontSize: 14, fontWeight: "bold" },
  totalValue: { fontSize: 14, fontWeight: "bold" },
  note: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f9fafb",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  colNr: { width: 20 },
  colName: { flex: 1 },
  colQty: { width: 30, textAlign: "right" },
  colPersons: { width: 40, textAlign: "right" },
  colPrice: { width: 60, textAlign: "right" },
  colVat: { width: 30, textAlign: "right" },
  colBrutto: { width: 65, textAlign: "right" },
  thText: { fontSize: 8, fontWeight: "bold", color: "#6b7280", textTransform: "uppercase" },
});

interface OfferItemPdf {
  name: string;
  quantity: number;
  unitPrice: string;
  vatRate: number;
  sourceType: string | null;
  day: number;
  date: string | null;
  timeFrom: string | null;
  timeTo: string | null;
}

interface OfferPdfProps {
  hotel: {
    hotelName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    nip: string | null;
    footerText: string | null;
  };
  offer: {
    clientName: string;
    clientEmail: string | null;
    clientPhone: string | null;
    clientCompany: string | null;
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
    adultsCount: number;
    childrenCount: number;
    totalPrice: string;
    notes: string | null;
    createdAt: string;
  };
  items: OfferItemPdf[];
}

export function OfferPdf({ hotel, offer, items }: OfferPdfProps) {
  const dateFrom = new Date(offer.eventDateFrom).toLocaleDateString("pl-PL");
  const dateTo = new Date(offer.eventDateTo).toLocaleDateString("pl-PL");
  const createdDate = new Date(offer.createdAt).toLocaleDateString("pl-PL");
  const personCount = offer.adultsCount + offer.childrenCount;

  // Group items by day
  const dayMap = new Map<number, { date: string | null; items: OfferItemPdf[] }>();
  for (const item of items) {
    if (!dayMap.has(item.day)) {
      dayMap.set(item.day, { date: item.date, items: [] });
    }
    dayMap.get(item.day)!.items.push(item);
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a - b);

  // Totals
  let totalNetto = 0;
  let totalVat = 0;
  for (const item of items) {
    const mul = item.sourceType === "PACKAGE" ? personCount : 1;
    const netto = Number(item.unitPrice) * item.quantity * mul;
    totalNetto += netto;
    totalVat += netto * (item.vatRate / 100);
  }
  const totalBrutto = totalNetto + totalVat;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Nagłówek hotelu */}
        <View style={styles.header}>
          <Text style={styles.hotelName}>{hotel.hotelName}</Text>
          {hotel.address && (
            <Text style={styles.hotelInfo}>
              {hotel.address}, {hotel.postalCode} {hotel.city}
            </Text>
          )}
          {hotel.contactPhone && (
            <Text style={styles.hotelInfo}>Tel: {hotel.contactPhone}</Text>
          )}
          {hotel.contactEmail && (
            <Text style={styles.hotelInfo}>Email: {hotel.contactEmail}</Text>
          )}
          {hotel.nip && (
            <Text style={styles.hotelInfo}>NIP: {hotel.nip}</Text>
          )}
        </View>

        {/* Tytuł */}
        <Text style={styles.title}>
          OFERTA {offer.eventName ? `— ${offer.eventName}` : ""}
        </Text>
        <Text style={{ fontSize: 8, color: "#999", marginBottom: 12 }}>
          Data wystawienia: {createdDate}
        </Text>

        {/* Dane klienta */}
        <View style={styles.sectionTitle}>
          <Text>DANE KLIENTA</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Imie i nazwisko</Text>
          <Text>{offer.clientName}</Text>
        </View>
        {offer.clientCompany && (
          <View style={styles.row}>
            <Text style={styles.label}>Firma</Text>
            <Text>{offer.clientCompany}</Text>
          </View>
        )}
        {offer.clientEmail && (
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text>{offer.clientEmail}</Text>
          </View>
        )}
        {offer.clientPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Telefon</Text>
            <Text>{offer.clientPhone}</Text>
          </View>
        )}

        {/* Wydarzenie */}
        <View style={styles.sectionTitle}>
          <Text>WYDARZENIE</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data</Text>
          <Text>{dateFrom} — {dateTo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Osoby</Text>
          <Text>
            {offer.adultsCount} doroslych
            {offer.childrenCount > 0 ? `, ${offer.childrenCount} dzieci` : ""}
          </Text>
        </View>

        {/* Pozycje per dzień */}
        {days.map(([dayNum, dayData]) => {
          const dayLabel = dayData.date
            ? new Date(dayData.date).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })
            : `Dzien ${dayNum}`;

          return (
            <View key={dayNum} style={{ marginTop: 10 }}>
              <View style={styles.sectionTitle}>
                <Text>DZIEN {dayNum} — {dayLabel}</Text>
              </View>

              {/* Nagłówek tabeli */}
              <View style={styles.tableHeader}>
                <Text style={[styles.colNr, styles.thText]}>NR</Text>
                <Text style={[styles.colName, styles.thText]}>NAZWA</Text>
                <Text style={[styles.colQty, styles.thText]}>IL.</Text>
                <Text style={[styles.colPersons, styles.thText]}>OSOBY</Text>
                <Text style={[styles.colPrice, styles.thText]}>CENA/JM</Text>
                <Text style={[styles.colVat, styles.thText]}>VAT</Text>
                <Text style={[styles.colBrutto, styles.thText]}>BRUTTO</Text>
              </View>

              {/* Wiersze */}
              {dayData.items.map((item, idx) => {
                const isPackage = item.sourceType === "PACKAGE";
                const mul = isPackage ? personCount : 1;
                const netto = Number(item.unitPrice) * item.quantity * mul;
                const brutto = netto * (1 + item.vatRate / 100);
                const timeStr = item.timeFrom ? `${item.timeFrom}${item.timeTo ? `-${item.timeTo}` : ""}` : "";
                const nameStr = timeStr ? `${item.name} (${timeStr})` : item.name;

                return (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.colNr}>{idx + 1}</Text>
                    <Text style={styles.colName}>
                      {nameStr}
                      {isPackage ? " [/os]" : ""}
                    </Text>
                    <Text style={styles.colQty}>{item.quantity}</Text>
                    <Text style={styles.colPersons}>{isPackage ? personCount : "—"}</Text>
                    <Text style={styles.colPrice}>{Number(item.unitPrice).toFixed(2)}</Text>
                    <Text style={styles.colVat}>{item.vatRate}%</Text>
                    <Text style={styles.colBrutto}>{brutto.toFixed(2)}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* Podsumowanie */}
        <View style={{ marginTop: 12 }}>
          <View style={styles.row}>
            <Text style={styles.label}>Suma netto</Text>
            <Text>{totalNetto.toFixed(2)} zl</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VAT</Text>
            <Text>{totalVat.toFixed(2)} zl</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>RAZEM BRUTTO</Text>
            <Text style={styles.totalValue}>{totalBrutto.toFixed(2)} zl</Text>
          </View>
        </View>

        {/* Notatki */}
        {offer.notes && (
          <View style={styles.note}>
            <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
              Uwagi:
            </Text>
            <Text>{offer.notes}</Text>
          </View>
        )}

        {/* Stopka */}
        <View style={styles.footer}>
          <Text>{hotel.footerText || hotel.hotelName}</Text>
        </View>
      </Page>
    </Document>
  );
}
