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
  value: {},
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
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingLeft: 8,
  },
});

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
    offerRooms: Array<{
      quantity: number;
      nights: number;
      pricePerNight: string;
      room: { name: string; type: string };
    }>;
    offerHalls: Array<{
      date: string;
      pricePerDay: string;
      hall: { name: string; capacity: number };
    }>;
    offerPackages: Array<{
      priceSnapshot: string | null;
      package: {
        name: string;
        offerType: { name: string };
        sections: Array<{
          name: string;
          items: Array<{ name: string }>;
        }>;
      };
    }>;
  };
}

export function OfferPdf({ hotel, offer }: OfferPdfProps) {
  const dateFrom = new Date(offer.eventDateFrom).toLocaleDateString("pl-PL");
  const dateTo = new Date(offer.eventDateTo).toLocaleDateString("pl-PL");
  const createdDate = new Date(offer.createdAt).toLocaleDateString("pl-PL");

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
          <Text style={styles.label}>Imię i nazwisko</Text>
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
          <Text>
            {dateFrom} — {dateTo}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Osoby</Text>
          <Text>
            {offer.adultsCount} doroslych
            {offer.childrenCount > 0 ? `, ${offer.childrenCount} dzieci` : ""}
          </Text>
        </View>

        {/* Sale */}
        {offer.offerHalls.length > 0 && (
          <>
            <View style={styles.sectionTitle}>
              <Text>SALE</Text>
            </View>
            {offer.offerHalls.map((h, i) => (
              <View key={i} style={styles.row}>
                <Text>
                  {h.hall.name} ({h.hall.capacity} os.) —{" "}
                  {new Date(h.date).toLocaleDateString("pl-PL")}
                </Text>
                <Text>{Number(h.pricePerDay).toFixed(2)} zl</Text>
              </View>
            ))}
          </>
        )}

        {/* Pokoje */}
        {offer.offerRooms.length > 0 && (
          <>
            <View style={styles.sectionTitle}>
              <Text>POKOJE</Text>
            </View>
            {offer.offerRooms.map((r, i) => (
              <View key={i} style={styles.row}>
                <Text>
                  {r.room.name} ({r.room.type}) — {r.quantity} szt. x{" "}
                  {r.nights} nocy
                </Text>
                <Text>
                  {(Number(r.pricePerNight) * r.quantity * r.nights).toFixed(2)}{" "}
                  zl
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Pakiety */}
        {offer.offerPackages.length > 0 && (
          <>
            <View style={styles.sectionTitle}>
              <Text>PAKIETY CATERINGOWE</Text>
            </View>
            {offer.offerPackages.map((p, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <View style={styles.row}>
                  <Text style={{ fontWeight: "bold" }}>
                    {p.package.name} ({p.package.offerType.name})
                  </Text>
                  {p.priceSnapshot && (
                    <Text>{Number(p.priceSnapshot).toFixed(2)} zl</Text>
                  )}
                </View>
                {p.package.sections.map((sec, j) => (
                  <View key={j} style={styles.itemRow}>
                    <Text style={{ color: "#666" }}>
                      {sec.name}: {sec.items.map((it) => it.name).join(", ")}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {/* TOTAL */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>RAZEM</Text>
          <Text style={styles.totalValue}>
            {Number(offer.totalPrice).toFixed(2)} zl
          </Text>
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
