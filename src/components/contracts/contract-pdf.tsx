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
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 14,
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
  paragraph: { marginTop: 6, lineHeight: 1.5 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#1a56db",
  },
  totalLabel: { fontSize: 12, fontWeight: "bold" },
  totalValue: { fontSize: 12, fontWeight: "bold" },
  signatureLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 60,
  },
  signatureBox: { width: "40%", textAlign: "center" },
  signatureDot: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginTop: 40,
    paddingTop: 4,
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
});

interface ContractPdfProps {
  hotel: {
    hotelName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    nip: string | null;
    footerText: string | null;
    regulamin: string | null;
  };
  contract: {
    clientFullName: string;
    clientAddress: string | null;
    clientNip: string | null;
    clientPesel: string | null;
    advanceAmount: string | null;
    advanceDueDate: string | null;
    paymentTerms: string | null;
    specialConditions: string | null;
    createdAt: string;
  };
  offer: {
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
    adultsCount: number;
    childrenCount: number;
    totalPrice: string;
    offerHalls: Array<{
      date: string;
      pricePerDay: string;
      hall: { name: string };
    }>;
    offerRooms: Array<{
      quantity: number;
      nights: number;
      pricePerNight: string;
      room: { name: string };
    }>;
    offerPackages: Array<{
      priceSnapshot: string | null;
      package: { name: string; offerType: { name: string } };
    }>;
  };
}

export function ContractPdf({ hotel, contract, offer }: ContractPdfProps) {
  const createdDate = new Date(contract.createdAt).toLocaleDateString("pl-PL");
  const dateFrom = new Date(offer.eventDateFrom).toLocaleDateString("pl-PL");
  const dateTo = new Date(offer.eventDateTo).toLocaleDateString("pl-PL");

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
          {hotel.nip && (
            <Text style={styles.hotelInfo}>NIP: {hotel.nip}</Text>
          )}
          {hotel.contactPhone && (
            <Text style={styles.hotelInfo}>Tel: {hotel.contactPhone}</Text>
          )}
        </View>

        <Text style={styles.title}>UMOWA</Text>
        <Text style={{ fontSize: 9, color: "#666", textAlign: "center", marginBottom: 16 }}>
          z dnia {createdDate}
        </Text>

        {/* Strony umowy */}
        <View style={styles.sectionTitle}>
          <Text>STRONY UMOWY</Text>
        </View>
        <View style={styles.paragraph}>
          <Text style={{ fontWeight: "bold" }}>Zleceniobiorca:</Text>
          <Text>{hotel.hotelName}</Text>
          {hotel.address && (
            <Text>
              {hotel.address}, {hotel.postalCode} {hotel.city}
            </Text>
          )}
          {hotel.nip && <Text>NIP: {hotel.nip}</Text>}
        </View>
        <View style={styles.paragraph}>
          <Text style={{ fontWeight: "bold" }}>Zleceniodawca:</Text>
          <Text>{contract.clientFullName}</Text>
          {contract.clientAddress && <Text>{contract.clientAddress}</Text>}
          {contract.clientNip && <Text>NIP: {contract.clientNip}</Text>}
          {contract.clientPesel && <Text>PESEL: {contract.clientPesel}</Text>}
        </View>

        {/* Przedmiot umowy */}
        <View style={styles.sectionTitle}>
          <Text>PRZEDMIOT UMOWY</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Wydarzenie</Text>
          <Text>{offer.eventName || "—"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data</Text>
          <Text>
            {dateFrom} — {dateTo}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Liczba osob</Text>
          <Text>
            {offer.adultsCount} doroslych
            {offer.childrenCount > 0 ? `, ${offer.childrenCount} dzieci` : ""}
          </Text>
        </View>

        {/* Sale */}
        {offer.offerHalls.length > 0 &&
          offer.offerHalls.map((h, i) => (
            <View key={i} style={styles.row}>
              <Text>
                Sala: {h.hall.name} ({new Date(h.date).toLocaleDateString("pl-PL")})
              </Text>
              <Text>{Number(h.pricePerDay).toFixed(2)} zl</Text>
            </View>
          ))}

        {/* Pokoje */}
        {offer.offerRooms.length > 0 &&
          offer.offerRooms.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text>
                {r.room.name}: {r.quantity} szt. x {r.nights} nocy
              </Text>
              <Text>
                {(Number(r.pricePerNight) * r.quantity * r.nights).toFixed(2)} zl
              </Text>
            </View>
          ))}

        {/* Pakiety */}
        {offer.offerPackages.length > 0 &&
          offer.offerPackages.map((p, i) => (
            <View key={i} style={styles.row}>
              <Text>
                {p.package.name} ({p.package.offerType.name})
              </Text>
              <Text>{p.priceSnapshot ? `${Number(p.priceSnapshot).toFixed(2)} zl` : "w cenie"}</Text>
            </View>
          ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>WARTOSC UMOWY</Text>
          <Text style={styles.totalValue}>
            {Number(offer.totalPrice).toFixed(2)} zl
          </Text>
        </View>

        {/* Warunki płatności */}
        {(contract.advanceAmount || contract.paymentTerms) && (
          <>
            <View style={styles.sectionTitle}>
              <Text>WARUNKI PLATNOSCI</Text>
            </View>
            {contract.advanceAmount && (
              <View style={styles.row}>
                <Text style={styles.label}>Zaliczka</Text>
                <Text>
                  {Number(contract.advanceAmount).toFixed(2)} zl
                  {contract.advanceDueDate &&
                    ` (do ${new Date(contract.advanceDueDate).toLocaleDateString("pl-PL")})`}
                </Text>
              </View>
            )}
            {contract.paymentTerms && (
              <View style={styles.paragraph}>
                <Text>{contract.paymentTerms}</Text>
              </View>
            )}
          </>
        )}

        {/* Warunki specjalne */}
        {contract.specialConditions && (
          <>
            <View style={styles.sectionTitle}>
              <Text>WARUNKI SPECJALNE</Text>
            </View>
            <View style={styles.paragraph}>
              <Text>{contract.specialConditions}</Text>
            </View>
          </>
        )}

        {/* Podpisy */}
        <View style={styles.signatureLine}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureDot}>
              <Text>Zleceniobiorca</Text>
            </View>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureDot}>
              <Text>Zleceniodawca</Text>
            </View>
          </View>
        </View>

        {/* Stopka */}
        <View style={styles.footer}>
          <Text>{hotel.footerText || hotel.hotelName}</Text>
        </View>
      </Page>
    </Document>
  );
}
