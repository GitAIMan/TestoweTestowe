import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Path,
  Rect,
  Line,
} from "@react-pdf/renderer";
import path from "path";

// ————————————————————————————————————————————————
// Fonty — Fraunces + Manrope (zgodnie z offer-pdf)
// ————————————————————————————————————————————————
const fontDir = path.join(process.cwd(), "node_modules", "@expo-google-fonts");

Font.register({
  family: "Fraunces",
  fonts: [
    { src: path.join(fontDir, "fraunces", "400Regular", "Fraunces_400Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "fraunces", "500Medium", "Fraunces_500Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontDir, "fraunces", "600SemiBold", "Fraunces_600SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "fraunces", "700Bold", "Fraunces_700Bold.ttf"), fontWeight: 700 },
    {
      src: path.join(fontDir, "fraunces", "400Regular_Italic", "Fraunces_400Regular_Italic.ttf"),
      fontWeight: 400,
      fontStyle: "italic",
    },
    {
      src: path.join(fontDir, "fraunces", "600SemiBold_Italic", "Fraunces_600SemiBold_Italic.ttf"),
      fontWeight: 600,
      fontStyle: "italic",
    },
  ],
});

Font.register({
  family: "Manrope",
  fonts: [
    { src: path.join(fontDir, "manrope", "400Regular", "Manrope_400Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "manrope", "500Medium", "Manrope_500Medium.ttf"), fontWeight: 500 },
    { src: path.join(fontDir, "manrope", "600SemiBold", "Manrope_600SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "manrope", "700Bold", "Manrope_700Bold.ttf"), fontWeight: 700 },
    { src: path.join(fontDir, "manrope", "800ExtraBold", "Manrope_800ExtraBold.ttf"), fontWeight: 800 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

// ————————————————————————————————————————————————
// Paleta
// ————————————————————————————————————————————————
const INK = "#1a1210";
const BODY = "#3f2e2a";
const MUTE = "#8f7872";
const RULE = "#ecd9d4";
const CREAM = "#fbf4f1";
const SOFT = "#f5e0dc";
const BRAND_DEFAULT = "#d16470";

// ————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————
function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function toHex(r: number, g: number, b: number): string {
  const cl = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
  return "#" + [cl(r), cl(g), cl(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
function lerpHexMulti(stops: string[], t: number): string {
  if (t <= 0) return stops[0];
  if (t >= 1) return stops[stops.length - 1];
  const scaled = t * (stops.length - 1);
  const i = Math.floor(scaled);
  const localT = scaled - i;
  return lerpHex(stops[i], stops[i + 1], localT);
}
function adjustHex(hex: string, delta: number): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + delta));
  const g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + delta));
  const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + delta));
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "H";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function formatPLN(n: number): string {
  return n
    .toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/\u00a0/g, " ");
}
function contractCode(createdAt: string, clientName: string): string {
  const d = new Date(createdAt);
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = clientName.replace(/\s+/g, "").slice(0, 3).toUpperCase() || "UMW";
  return `${y}${m}${day}-${suffix}`;
}

// ————————————————————————————————————————————————
// Style
// ————————————————————————————————————————————————
const makeStyles = (accent: string) =>
  StyleSheet.create({
    page: {
      paddingTop: 0,
      paddingBottom: 56,
      paddingHorizontal: 0,
      fontSize: 9.5,
      fontFamily: "Manrope",
      color: BODY,
      backgroundColor: "#ffffff",
    },

    // ---------- COVER BAND ----------
    coverBand: { height: 200, position: "relative" },
    coverBandBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    coverBandContent: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      paddingHorizontal: 48,
      paddingTop: 42,
      paddingBottom: 28,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    coverLeft: { flex: 1 },
    coverEyebrow: {
      fontFamily: "Manrope",
      fontSize: 8,
      letterSpacing: 3,
      color: "#ffffff",
      opacity: 0.75,
      textTransform: "uppercase",
      marginBottom: 14,
    },
    coverHotel: {
      fontFamily: "Fraunces",
      fontSize: 26,
      fontWeight: 600,
      color: "#ffffff",
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    coverTagline: {
      fontFamily: "Fraunces",
      fontSize: 11,
      fontStyle: "italic",
      color: "#ffffff",
      opacity: 0.85,
    },
    monogram: {
      width: 64, height: 64,
      borderWidth: 1,
      borderColor: "#ffffff",
      borderStyle: "solid",
      justifyContent: "center",
      alignItems: "center",
    },
    monogramText: {
      fontFamily: "Fraunces",
      fontSize: 22,
      fontWeight: 700,
      color: "#ffffff",
      letterSpacing: 1,
    },

    // ---------- TITLE BLOCK ----------
    titleBlock: { paddingHorizontal: 48, paddingTop: 36, paddingBottom: 24 },
    titleEyebrowRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    titleEyebrowDash: { width: 28, height: 1, backgroundColor: accent, marginRight: 10 },
    titleEyebrow: {
      fontFamily: "Manrope",
      fontSize: 8.5,
      letterSpacing: 3,
      color: MUTE,
      textTransform: "uppercase",
      fontWeight: 600,
    },
    titleMain: {
      fontFamily: "Fraunces",
      fontSize: 42,
      fontWeight: 600,
      color: INK,
      letterSpacing: -1,
      lineHeight: 1.05,
      marginBottom: 6,
    },
    titleSub: {
      fontFamily: "Fraunces",
      fontSize: 18,
      fontWeight: 400,
      fontStyle: "italic",
      color: accent,
      marginBottom: 16,
    },
    titleMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 12,
      borderTopWidth: 0.75,
      borderTopColor: RULE,
      borderTopStyle: "solid",
    },
    metaCol: { flex: 1 },
    metaLabel: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 2,
      color: MUTE,
      textTransform: "uppercase",
      marginBottom: 3,
      fontWeight: 600,
    },
    metaValue: {
      fontFamily: "Fraunces",
      fontSize: 11,
      color: INK,
      fontWeight: 500,
    },

    // ---------- SECTION HEADER ----------
    section: { paddingHorizontal: 48, marginTop: 22 },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    sectionNumber: {
      fontFamily: "Fraunces",
      fontSize: 11,
      fontStyle: "italic",
      color: accent,
      marginRight: 10,
      fontWeight: 500,
    },
    sectionTitle: {
      fontFamily: "Fraunces",
      fontSize: 15,
      fontWeight: 600,
      color: INK,
      letterSpacing: -0.2,
      marginRight: 14,
    },
    sectionRule: { flex: 1, height: 0.75, backgroundColor: RULE },

    // ---------- CARDS ----------
    twoCol: { flexDirection: "row", gap: 14 },
    card: {
      flex: 1,
      backgroundColor: CREAM,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderLeftWidth: 2,
      borderLeftColor: accent,
      borderLeftStyle: "solid",
    },
    cardEyebrow: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 2,
      color: MUTE,
      textTransform: "uppercase",
      marginBottom: 8,
      fontWeight: 700,
    },
    kvRow: { flexDirection: "row", marginBottom: 4 },
    kvLabel: {
      width: 72,
      fontFamily: "Manrope",
      fontSize: 8,
      color: MUTE,
      paddingTop: 1,
    },
    kvValue: {
      flex: 1,
      fontFamily: "Fraunces",
      fontSize: 10.5,
      color: INK,
      fontWeight: 500,
    },

    // ---------- HIGHLIGHTS (value + date + advance) ----------
    highlights: {
      marginTop: 22,
      marginHorizontal: 48,
      paddingVertical: 18,
      paddingHorizontal: 20,
      backgroundColor: "#ffffff",
      borderTopWidth: 1,
      borderTopColor: accent,
      borderTopStyle: "solid",
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      borderBottomStyle: "solid",
      flexDirection: "row",
      alignItems: "center",
    },
    hlItem: { flex: 1, alignItems: "center" },
    hlDivider: { width: 0.5, height: 50, backgroundColor: RULE },
    hlLabel: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 2,
      color: MUTE,
      textTransform: "uppercase",
      fontWeight: 700,
      marginTop: 6,
      marginBottom: 2,
    },
    hlValue: {
      fontFamily: "Fraunces",
      fontSize: 22,
      color: INK,
      fontWeight: 700,
      letterSpacing: -0.5,
    },
    hlSub: {
      fontFamily: "Fraunces",
      fontSize: 9,
      fontStyle: "italic",
      color: MUTE,
      marginTop: 2,
      textAlign: "center",
    },

    // ---------- PARAGRAPH / CLAUSE ----------
    clauseWrap: { marginTop: 4 },
    clauseIntro: {
      fontFamily: "Fraunces",
      fontSize: 10,
      color: BODY,
      lineHeight: 1.55,
      marginBottom: 6,
    },
    clauseList: { marginTop: 4 },
    clauseItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 6,
    },
    clauseBullet: {
      width: 18,
      fontFamily: "Fraunces",
      fontSize: 9,
      fontStyle: "italic",
      color: accent,
      fontWeight: 500,
      paddingTop: 1,
    },
    clauseText: {
      flex: 1,
      fontFamily: "Manrope",
      fontSize: 9.5,
      color: BODY,
      lineHeight: 1.5,
    },

    // ---------- TABLE (sale / pokoje / pakiety) ----------
    tbl: {
      borderTopWidth: 1,
      borderTopColor: INK,
      borderTopStyle: "solid",
    },
    tblRow: {
      flexDirection: "row",
      paddingVertical: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      borderBottomStyle: "solid",
      alignItems: "center",
    },
    tblName: {
      flex: 1,
      fontFamily: "Fraunces",
      fontSize: 10.5,
      color: INK,
      fontWeight: 500,
    },
    tblSub: {
      fontFamily: "Manrope",
      fontSize: 8,
      color: MUTE,
      marginTop: 2,
    },
    tblAmount: {
      fontFamily: "Fraunces",
      fontSize: 11,
      color: INK,
      fontWeight: 600,
      textAlign: "right",
      width: 100,
    },
    dayHeader: {
      marginTop: 14,
      marginBottom: 4,
      flexDirection: "row",
      alignItems: "baseline",
      gap: 10,
    },
    dayNumber: {
      fontFamily: "Fraunces",
      fontSize: 22,
      fontWeight: 700,
      color: accent,
      letterSpacing: -0.5,
    },
    dayLabel: {
      fontFamily: "Manrope",
      fontSize: 9,
      color: MUTE,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    dayDate: {
      fontFamily: "Fraunces",
      fontSize: 11,
      fontStyle: "italic",
      color: INK,
    },

    // ---------- TOTAL ----------
    totalWrap: { marginTop: 22, paddingHorizontal: 48 },
    totalBox: { position: "relative", height: 84 },
    totalBoxBg: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
    },
    totalBoxContent: {
      position: "absolute",
      top: 0, left: 0, right: 0, bottom: 0,
      paddingVertical: 20,
      paddingHorizontal: 28,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalEyebrow: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 3,
      color: "#ffffff",
      opacity: 0.65,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    totalLabel: {
      fontFamily: "Fraunces",
      fontSize: 14,
      color: "#ffffff",
      fontWeight: 500,
      fontStyle: "italic",
      marginTop: 3,
    },
    totalRight: { flexDirection: "row", alignItems: "baseline" },
    totalAmount: {
      fontFamily: "Fraunces",
      fontSize: 14,
      color: "#ffffff",
      fontWeight: 600,
    },
    totalCurrency: {
      fontFamily: "Manrope",
      fontSize: 9,
      color: "#ffffff",
      opacity: 0.75,
      marginLeft: 5,
      letterSpacing: 1,
    },

    // ---------- SIGNATURES ----------
    signatureBlock: {
      marginTop: 32,
      marginHorizontal: 48,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    signatureBox: { width: "45%" },
    signatureLine: {
      borderTopWidth: 0.75,
      borderTopColor: INK,
      borderTopStyle: "solid",
      marginTop: 48,
      paddingTop: 6,
    },
    signatureEyebrow: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 2,
      color: MUTE,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: 3,
    },
    signatureName: {
      fontFamily: "Fraunces",
      fontSize: 10.5,
      fontStyle: "italic",
      color: INK,
      fontWeight: 500,
    },

    // ---------- VALIDITY STRIP ----------
    validStrip: {
      marginTop: 22,
      marginHorizontal: 48,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: SOFT,
      flexDirection: "row",
      alignItems: "center",
    },
    validStripIcon: { marginRight: 10 },
    validStripText: {
      fontFamily: "Fraunces",
      fontSize: 9.5,
      fontStyle: "italic",
      color: BODY,
      flex: 1,
    },

    // ---------- FOOTER ----------
    footer: {
      position: "absolute",
      bottom: 20,
      left: 48,
      right: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 10,
      borderTopWidth: 0.5,
      borderTopColor: RULE,
      borderTopStyle: "solid",
    },
    footerLeft: {
      fontFamily: "Fraunces",
      fontSize: 8,
      color: MUTE,
      fontStyle: "italic",
    },
    footerRight: {
      fontFamily: "Manrope",
      fontSize: 7,
      color: MUTE,
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
  });

// ————————————————————————————————————————————————
// Types
// ————————————————————————————————————————————————
interface ContractPdfProps {
  hotel: {
    hotelName: string;
    primaryColor?: string;
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
  };
  items: Array<{
    day: number;
    date: string | null;
    sortOrder: number;
    name: string;
    timeFrom: string | null;
    timeTo: string | null;
    hallName: string | null;
    quantity: number;
    unitPrice: string;
    vatRate: number;
    sourceType: string | null;
  }>;
}

// ————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————
export function ContractPdf({ hotel, contract, offer, items }: ContractPdfProps) {
  const accent = hotel.primaryColor && /^#?[0-9a-fA-F]{6}$/.test(hotel.primaryColor.replace("#", ""))
    ? (hotel.primaryColor.startsWith("#") ? hotel.primaryColor : `#${hotel.primaryColor}`)
    : BRAND_DEFAULT;
  const accentLight = adjustHex(accent, 40);
  const accentDark = adjustHex(accent, -55);
  const s = makeStyles(accent);

  const dateFrom = new Date(offer.eventDateFrom);
  const dateTo = new Date(offer.eventDateTo);
  const sameDay = dateFrom.toDateString() === dateTo.toDateString();
  const dateFromStr = dateFrom.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const dateToStr = dateTo.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const createdDate = new Date(contract.createdAt).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const personCount = offer.adultsCount + offer.childrenCount;
  const code = contractCode(contract.createdAt, contract.clientFullName);
  const totalBrutto = Number(offer.totalPrice);

  const advanceAmount = contract.advanceAmount ? Number(contract.advanceAmount) : 0;
  const advanceDate = contract.advanceDueDate
    ? new Date(contract.advanceDueDate).toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const addressLine = [hotel.address, [hotel.postalCode, hotel.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ============ COVER BAND ============ */}
        <View style={s.coverBand}>
          <Svg style={s.coverBandBg} viewBox="0 0 595 200" preserveAspectRatio="none">
            {Array.from({ length: 80 }).map((_, i) => {
              const t = i / 79;
              const c = lerpHexMulti([accentDark, accent, accentLight], t);
              const skew = 180;
              const totalW = 595 + skew;
              const w = (totalW / 79) + 6;
              const x1 = -skew + (totalW / 79) * i - w / 2;
              return (
                <Path
                  key={i}
                  d={`M ${x1} 0 L ${x1 + w} 0 L ${x1 + w + skew} 200 L ${x1 + skew} 200 Z`}
                  fill={c}
                />
              );
            })}
            <Rect x={0} y={160} width={595} height={40} fill={accentDark} fillOpacity={0.35} />
            <Path
              d="M 460 -40 m -180 0 a 180 180 0 1 0 360 0 a 180 180 0 1 0 -360 0"
              fill="#ffffff"
              fillOpacity={0.06}
            />
            <Path
              d="M 520 160 m -90 0 a 90 90 0 1 0 180 0 a 90 90 0 1 0 -180 0"
              fill="#ffffff"
              fillOpacity={0.08}
            />
            <Path
              d="M -40 180 m -120 0 a 120 120 0 1 0 240 0 a 120 120 0 1 0 -240 0"
              fill="#ffffff"
              fillOpacity={0.05}
            />
            <Rect x={0} y={197} width={595} height={3} fill={accentLight} />
          </Svg>
          <View style={s.coverBandContent}>
            <View style={s.coverLeft}>
              <Text style={s.coverEyebrow}>Umowa · {code}</Text>
              <Text style={s.coverHotel}>{hotel.hotelName}</Text>
              <Text style={s.coverTagline}>
                zawarta z {contract.clientFullName}
              </Text>
            </View>
            <View style={s.monogram}>
              <Text style={s.monogramText}>{monogram(hotel.hotelName)}</Text>
            </View>
          </View>
        </View>

        {/* ============ TITLE ============ */}
        <View style={s.titleBlock}>
          <View style={s.titleEyebrowRow}>
            <View style={s.titleEyebrowDash} />
            <Text style={s.titleEyebrow}>Umowa na wydarzenie</Text>
          </View>
          <Text style={s.titleMain}>
            {offer.eventName || "Wydarzenie"}
          </Text>
          <Text style={s.titleSub}>
            {sameDay ? dateFromStr : `${dateFromStr} — ${dateToStr}`}
          </Text>

          <View style={s.titleMeta}>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Numer</Text>
              <Text style={s.metaValue}>{code}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Zawarta</Text>
              <Text style={s.metaValue}>{createdDate}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Osoby</Text>
              <Text style={s.metaValue}>
                {offer.adultsCount}
                {offer.childrenCount > 0 ? ` + ${offer.childrenCount}` : ""} os.
              </Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Wartość</Text>
              <Text style={s.metaValue}>{formatPLN(totalBrutto)} zł</Text>
            </View>
          </View>
        </View>

        {/* ============ STRONY UMOWY ============ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionNumber}>i.</Text>
            <Text style={s.sectionTitle}>Strony umowy</Text>
            <View style={s.sectionRule} />
          </View>

          <View style={s.twoCol}>
            <View style={s.card}>
              <Text style={s.cardEyebrow}>Zleceniobiorca</Text>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Nazwa</Text>
                <Text style={s.kvValue}>{hotel.hotelName}</Text>
              </View>
              {hotel.address ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Adres</Text>
                  <Text style={s.kvValue}>
                    {hotel.address}
                    {hotel.postalCode || hotel.city
                      ? `, ${[hotel.postalCode, hotel.city].filter(Boolean).join(" ")}`
                      : ""}
                  </Text>
                </View>
              ) : null}
              {hotel.nip ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>NIP</Text>
                  <Text style={s.kvValue}>{hotel.nip}</Text>
                </View>
              ) : null}
              {hotel.contactPhone ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Telefon</Text>
                  <Text style={s.kvValue}>{hotel.contactPhone}</Text>
                </View>
              ) : null}
              {hotel.contactEmail ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>E-mail</Text>
                  <Text style={s.kvValue}>{hotel.contactEmail}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.card}>
              <Text style={s.cardEyebrow}>Zleceniodawca</Text>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Nazwa</Text>
                <Text style={s.kvValue}>{contract.clientFullName}</Text>
              </View>
              {contract.clientAddress ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Adres</Text>
                  <Text style={s.kvValue}>{contract.clientAddress}</Text>
                </View>
              ) : null}
              {contract.clientNip ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>NIP</Text>
                  <Text style={s.kvValue}>{contract.clientNip}</Text>
                </View>
              ) : null}
              {contract.clientPesel ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>PESEL</Text>
                  <Text style={s.kvValue}>{contract.clientPesel}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ============ HIGHLIGHTS ============ */}
        <View style={s.highlights}>
          <View style={s.hlItem}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path
                d="M16 7 a 4 4 0 1 1 -8 0 a 4 4 0 1 1 8 0 M4 21 v-2 a 6 6 0 0 1 6 -6 h4 a 6 6 0 0 1 6 6 v2"
                stroke={accent}
                strokeWidth={1.3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={s.hlLabel}>Osoby</Text>
            <Text style={s.hlValue}>{personCount}</Text>
            <Text style={s.hlSub}>
              {offer.adultsCount} dorośli
              {offer.childrenCount > 0 ? ` · ${offer.childrenCount} dzieci` : ""}
            </Text>
          </View>
          <View style={s.hlDivider} />
          <View style={s.hlItem}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path
                d="M5 5 h14 a 1 1 0 0 1 1 1 v14 a 1 1 0 0 1 -1 1 h-14 a 1 1 0 0 1 -1 -1 v-14 a 1 1 0 0 1 1 -1 z M4 10 h16 M8 3 v4 M16 3 v4"
                stroke={accent}
                strokeWidth={1.3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={s.hlLabel}>Termin</Text>
            <Text style={s.hlValue}>
              {dateFrom.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
            </Text>
            <Text style={s.hlSub}>
              {sameDay ? dateFromStr : `do ${dateToStr}`}
            </Text>
          </View>
          <View style={s.hlDivider} />
          <View style={s.hlItem}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path
                d="M12 2 v20 M17 6 H9.5 a 3.5 3.5 0 1 0 0 7 h5 a 3.5 3.5 0 1 1 0 7 H6"
                stroke={accent}
                strokeWidth={1.3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={s.hlLabel}>Wartość</Text>
            <Text style={s.hlValue}>{formatPLN(totalBrutto)}</Text>
            <Text style={s.hlSub}>PLN brutto</Text>
          </View>
        </View>

        {/* ============ PRZEDMIOT UMOWY ============ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionNumber}>ii.</Text>
            <Text style={s.sectionTitle}>Przedmiot umowy</Text>
            <View style={s.sectionRule} />
          </View>

          <Text style={s.clauseIntro}>
            Zleceniobiorca zobowiązuje się zrealizować wydarzenie
            {offer.eventName ? ` „${offer.eventName}"` : ""} w terminie
            {" "}{sameDay ? dateFromStr : `${dateFromStr} — ${dateToStr}`}
            {" "}dla {personCount} {personCount === 1 ? "gościa" : "gości"}
            {offer.childrenCount > 0
              ? ` (${offer.adultsCount} dorośli, ${offer.childrenCount} dzieci)`
              : ""}
            , w zakresie wskazanym poniżej.
          </Text>

          {(() => {
            const pc = offer.adultsCount + offer.childrenCount;
            const byDay = new Map<number, typeof items>();
            for (const it of items) {
              if (!byDay.has(it.day)) byDay.set(it.day, []);
              byDay.get(it.day)!.push(it);
            }
            const days = Array.from(byDay.keys()).sort((a, b) => a - b);
            return days.map((dayNum) => {
              const dayItems = byDay.get(dayNum)!.sort((a, b) => a.sortOrder - b.sortOrder);
              const firstDate = dayItems.find((i) => i.date)?.date;
              const dateStr = firstDate
                ? new Date(firstDate).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : null;
              return (
                <View key={dayNum} wrap={false}>
                  <View style={s.dayHeader}>
                    <Text style={s.dayNumber}>{String(dayNum).padStart(2, "0")}</Text>
                    <Text style={s.dayLabel}>Dzień</Text>
                    {dateStr && <Text style={s.dayDate}>{dateStr}</Text>}
                  </View>
                  <View style={s.tbl}>
                    {dayItems.map((it, i) => {
                      const mul = it.sourceType === "PACKAGE" ? pc : 1;
                      const netto = Number(it.unitPrice) * it.quantity * mul;
                      const brutto = netto * (1 + it.vatRate / 100);
                      const subParts: string[] = [];
                      if (it.timeFrom || it.timeTo) {
                        subParts.push(`${it.timeFrom || "—"}${it.timeTo ? ` – ${it.timeTo}` : ""}`);
                      }
                      if (it.hallName) subParts.push(it.hallName);
                      if (it.sourceType === "PACKAGE") {
                        subParts.push(`${it.quantity} × ${pc} os. × ${formatPLN(Number(it.unitPrice))} zł`);
                      } else if (it.quantity > 1) {
                        subParts.push(`${it.quantity} × ${formatPLN(Number(it.unitPrice))} zł`);
                      }
                      return (
                        <View key={i} style={s.tblRow}>
                          <View style={s.tblName}>
                            <Text>{it.name}</Text>
                            {subParts.length > 0 && (
                              <Text style={s.tblSub}>{subParts.join(" · ")}</Text>
                            )}
                          </View>
                          <Text style={s.tblAmount}>{formatPLN(brutto)} zł</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            });
          })()}
        </View>

        {/* ============ WARTOŚĆ UMOWY — Total Box ============ */}
        <View style={s.totalWrap}>
          <View style={s.totalBox}>
            <Svg style={s.totalBoxBg} viewBox="0 0 500 84" preserveAspectRatio="none">
              {Array.from({ length: 40 }).map((_, i) => {
                const t = i / 39;
                const c = lerpHexMulti([INK, accentDark, accent], t);
                return (
                  <Rect
                    key={i}
                    x={(500 / 40) * i}
                    y={0}
                    width={500 / 40 + 1}
                    height={84}
                    fill={c}
                  />
                );
              })}
              <Path
                d="M 420 -20 m -80 0 a 80 80 0 1 0 160 0 a 80 80 0 1 0 -160 0"
                fill="#ffffff"
                fillOpacity={0.08}
              />
              <Path
                d="M 470 100 m -50 0 a 50 50 0 1 0 100 0 a 50 50 0 1 0 -100 0"
                fill="#ffffff"
                fillOpacity={0.06}
              />
            </Svg>
            <View style={s.totalBoxContent}>
              <View>
                <Text style={s.totalEyebrow}>Wartość umowy</Text>
                <Text style={s.totalLabel}>Do zapłaty łącznie</Text>
              </View>
              <View style={s.totalRight}>
                <Text style={s.totalAmount}>{formatPLN(totalBrutto)}</Text>
                <Text style={s.totalCurrency}>PLN brutto</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ============ WARUNKI PŁATNOŚCI ============ */}
        {(advanceAmount > 0 || contract.paymentTerms) && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>iii.</Text>
              <Text style={s.sectionTitle}>Warunki płatności</Text>
              <View style={s.sectionRule} />
            </View>

            <View style={s.clauseList}>
              {advanceAmount > 0 && (
                <View style={s.clauseItem}>
                  <Text style={s.clauseBullet}>§ 1</Text>
                  <Text style={s.clauseText}>
                    Zleceniodawca zobowiązuje się do wpłaty zaliczki w wysokości{" "}
                    <Text style={{ fontWeight: 700, color: INK }}>
                      {formatPLN(advanceAmount)} zł
                    </Text>
                    {advanceDate ? ` w terminie do ${advanceDate}` : ""}.
                  </Text>
                </View>
              )}
              <View style={s.clauseItem}>
                <Text style={s.clauseBullet}>§ {advanceAmount > 0 ? "2" : "1"}</Text>
                <Text style={s.clauseText}>
                  Pozostała kwota{" "}
                  <Text style={{ fontWeight: 700, color: INK }}>
                    {formatPLN(totalBrutto - advanceAmount)} zł
                  </Text>{" "}
                  płatna w terminie zgodnym z fakturą końcową, po realizacji wydarzenia.
                </Text>
              </View>
              {contract.paymentTerms && (
                <View style={s.clauseItem}>
                  <Text style={s.clauseBullet}>§ {advanceAmount > 0 ? "3" : "2"}</Text>
                  <Text style={s.clauseText}>{contract.paymentTerms}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ============ WARUNKI SPECJALNE ============ */}
        {contract.specialConditions && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>iv.</Text>
              <Text style={s.sectionTitle}>Warunki specjalne</Text>
              <View style={s.sectionRule} />
            </View>
            <Text style={s.clauseIntro}>{contract.specialConditions}</Text>
          </View>
        )}

        {/* ============ REGULAMIN ============ */}
        {hotel.regulamin && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionNumber}>v.</Text>
              <Text style={s.sectionTitle}>Postanowienia końcowe</Text>
              <View style={s.sectionRule} />
            </View>
            {hotel.regulamin
              .normalize("NFC")
              .split("\n")
              .filter((l) => l.trim().length > 0)
              .map((line, i) => (
                <Text key={i} style={s.clauseIntro}>
                  {line}
                </Text>
              ))}
          </View>
        )}

        {/* ============ VALIDITY STRIP ============ */}
        <View style={s.validStrip}>
          <Svg width={14} height={14} viewBox="0 0 24 24" style={s.validStripIcon}>
            <Path
              d="M12 2 L22 7 L22 13 C22 18 17 22 12 22 C7 22 2 18 2 13 L2 7 Z"
              stroke={accent}
              strokeWidth={1.5}
              fill="none"
            />
            <Path
              d="M8 12 L11 15 L16 9"
              stroke={accent}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={s.validStripText}>
            Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.
          </Text>
        </View>

        {/* ============ SIGNATURES ============ */}
        <View style={s.signatureBlock}>
          <View style={s.signatureBox}>
            <View style={s.signatureLine}>
              <Text style={s.signatureEyebrow}>Zleceniobiorca</Text>
              <Text style={s.signatureName}>{hotel.hotelName}</Text>
            </View>
          </View>
          <View style={s.signatureBox}>
            <View style={s.signatureLine}>
              <Text style={s.signatureEyebrow}>Zleceniodawca</Text>
              <Text style={s.signatureName}>{contract.clientFullName}</Text>
            </View>
          </View>
        </View>

        {/* ============ FOOTER ============ */}
        <View style={s.footer} fixed>
          <Text style={s.footerLeft}>
            {hotel.footerText || hotel.hotelName}
            {addressLine ? `  ·  ${addressLine}` : ""}
            {hotel.contactPhone ? `  ·  ${hotel.contactPhone}` : ""}
            {hotel.nip ? `  ·  NIP ${hotel.nip}` : ""}
          </Text>
          <Text
            style={s.footerRight}
            render={({ pageNumber, totalPages }) =>
              `${String(pageNumber).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`
            }
          />
        </View>

        {/* ============ Decorative arrow ============ */}
        <View
          style={{
            position: "absolute",
            top: 200,
            right: 48,
            flexDirection: "row",
            alignItems: "center",
          }}
          fixed={false}
        >
          <Svg width={60} height={10} viewBox="0 0 60 10">
            <Line x1={0} y1={5} x2={50} y2={5} stroke={accent} strokeWidth={1} />
            <Path d="M50 5 L58 1 L58 9 Z" fill={accent} />
          </Svg>
        </View>
      </Page>
    </Document>
  );
}
