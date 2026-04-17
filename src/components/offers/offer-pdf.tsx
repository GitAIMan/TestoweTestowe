import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Svg,
  Path,
  Line,
  Rect,
} from "@react-pdf/renderer";
import Decimal from "decimal.js";
import path from "path";

// ————————————————————————————————————————————————
// Typografia — Fraunces (display serif) + Manrope (body sans)
// Fonty TTF z @expo-google-fonts (zawierają latin-ext → polskie znaki)
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

// Wyłącz auto-hyphenation (psuje polskie słowa)
Font.registerHyphenationCallback((word) => [word]);

// ————————————————————————————————————————————————
// Paleta — ciepła, neutralna, jeden kolor akcentu z brandingu
// ————————————————————————————————————————————————
const INK = "#1a1210";
const BODY = "#3f2e2a";
const MUTE = "#8f7872";
const RULE = "#ecd9d4";
const CREAM = "#fbf4f1";
const SOFT = "#f5e0dc";
const BRAND_DEFAULT = "#d16470";
const BRAND_DARK = "#a73447";
const BRAND_LIGHT = "#f08d95";

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

    // ---------- COVER HEADER ----------
    coverBand: {
      height: 200,
      position: "relative",
    },
    coverBandBg: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    coverBandContent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
      width: 64,
      height: 64,
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
    titleBlock: {
      paddingHorizontal: 48,
      paddingTop: 36,
      paddingBottom: 24,
    },
    titleEyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    titleEyebrowDash: {
      width: 28,
      height: 1,
      backgroundColor: accent,
      marginRight: 10,
    },
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
    section: {
      paddingHorizontal: 48,
      marginTop: 22,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
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
    sectionRule: {
      flex: 1,
      height: 0.75,
      backgroundColor: RULE,
    },

    // ---------- CARDS (client/event) ----------
    twoCol: {
      flexDirection: "row",
      gap: 14,
    },
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
    kvRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    kvLabel: {
      width: 62,
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

    // ---------- HIGHLIGHTS ----------
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
    hlItem: {
      flex: 1,
      alignItems: "center",
    },
    hlDivider: {
      width: 0.5,
      height: 50,
      backgroundColor: RULE,
    },
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
    },

    // ---------- DAY BANNER ----------
    dayBanner: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: 14,
      marginBottom: 8,
    },
    dayNumber: {
      fontFamily: "Fraunces",
      fontSize: 38,
      fontWeight: 700,
      color: accent,
      letterSpacing: -1.5,
      marginRight: 12,
      lineHeight: 1,
    },
    dayLabel: {
      flex: 1,
    },
    dayLabelEyebrow: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 2,
      color: MUTE,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    dayLabelText: {
      fontFamily: "Fraunces",
      fontSize: 14,
      color: INK,
      fontWeight: 500,
      marginTop: 1,
    },

    // ---------- TABLE ----------
    tbl: {
      borderTopWidth: 1,
      borderTopColor: INK,
      borderTopStyle: "solid",
    },
    tblHead: {
      flexDirection: "row",
      paddingVertical: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      borderBottomStyle: "solid",
    },
    th: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 1.5,
      color: MUTE,
      textTransform: "uppercase",
      fontWeight: 700,
    },
    tblRow: {
      flexDirection: "row",
      paddingVertical: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      borderBottomStyle: "solid",
    },
    tblRowPackage: {
      backgroundColor: "#fffcf6",
    },

    colNr: { width: 18 },
    colName: { flex: 1, paddingRight: 8 },
    colTime: { width: 56 },
    colQty: { width: 26, textAlign: "right" },
    colPers: { width: 36, textAlign: "right" },
    colUnit: { width: 58, textAlign: "right" },
    colVat: { width: 28, textAlign: "right" },
    colBrutto: { width: 62, textAlign: "right" },

    rowNr: {
      fontFamily: "Fraunces",
      fontSize: 10,
      fontStyle: "italic",
      color: MUTE,
    },
    rowName: {
      fontFamily: "Fraunces",
      fontSize: 10.5,
      color: INK,
      fontWeight: 500,
    },
    rowNameTag: {
      fontFamily: "Manrope",
      fontSize: 6.5,
      letterSpacing: 1.2,
      color: accent,
      textTransform: "uppercase",
      marginTop: 2,
      fontWeight: 700,
    },
    rowCell: {
      fontFamily: "Manrope",
      fontSize: 9.5,
      color: BODY,
    },
    rowCellMute: {
      fontFamily: "Manrope",
      fontSize: 9,
      color: MUTE,
    },
    rowBrutto: {
      fontFamily: "Fraunces",
      fontSize: 11,
      color: INK,
      fontWeight: 600,
    },

    // ---------- PACKAGE COMPOSITION ----------
    pkgComp: {
      paddingLeft: 18,
      paddingRight: 8,
      paddingTop: 6,
      paddingBottom: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: RULE,
      borderBottomStyle: "solid",
      backgroundColor: "#fffcf6",
    },
    pkgSection: {
      marginBottom: 5,
    },
    pkgSectionHead: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
    },
    pkgSectionName: {
      fontFamily: "Fraunces",
      fontSize: 9,
      fontWeight: 600,
      fontStyle: "italic",
      color: INK,
      marginRight: 8,
    },
    pkgSectionBadge: {
      fontFamily: "Manrope",
      fontSize: 6.5,
      letterSpacing: 1,
      color: MUTE,
      textTransform: "uppercase",
      fontWeight: 600,
    },
    pkgItemList: {
      paddingLeft: 10,
    },
    pkgItem: {
      fontFamily: "Manrope",
      fontSize: 8.5,
      color: BODY,
      marginBottom: 1,
    },

    // ---------- TOTAL ----------
    totalWrap: {
      marginTop: 22,
      paddingHorizontal: 48,
    },
    subtotalRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    subtotalItem: {
      flexDirection: "row",
      marginLeft: 24,
      alignItems: "baseline",
    },
    subtotalLabel: {
      fontFamily: "Manrope",
      fontSize: 8,
      color: MUTE,
      marginRight: 6,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    subtotalValue: {
      fontFamily: "Fraunces",
      fontSize: 10,
      color: INK,
      fontWeight: 500,
    },
    totalBox: {
      position: "relative",
      height: 84,
    },
    totalBoxBg: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    totalBoxContent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
    subtotalValue_deprecated: {
      fontFamily: "Fraunces",
      fontSize: 10,
      color: INK,
      fontWeight: 500,
    },

    // ---------- NOTES ----------
    notesWrap: {
      marginTop: 22,
      marginHorizontal: 48,
      paddingTop: 14,
      borderTopWidth: 0.75,
      borderTopColor: RULE,
      borderTopStyle: "solid",
    },
    notesTitle: {
      fontFamily: "Fraunces",
      fontSize: 11,
      fontStyle: "italic",
      color: INK,
      marginBottom: 4,
      fontWeight: 600,
    },
    notesBody: {
      fontFamily: "Manrope",
      fontSize: 9,
      color: BODY,
      lineHeight: 1.5,
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

    // ---------- THANK-YOU BLOCK ----------
    thankWrap: {
      marginTop: 22,
      marginHorizontal: 48,
      height: 110,
      position: "relative",
    },
    thankBg: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    thankContent: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      paddingVertical: 22,
      paddingHorizontal: 28,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    thankEyebrow: {
      fontFamily: "Manrope",
      fontSize: 7,
      letterSpacing: 3,
      color: "#ffffff",
      opacity: 0.75,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: 6,
    },
    thankHeadline: {
      fontFamily: "Fraunces",
      fontSize: 20,
      color: "#ffffff",
      fontWeight: 600,
      fontStyle: "italic",
      letterSpacing: -0.3,
      marginBottom: 4,
    },
    thankSub: {
      fontFamily: "Fraunces",
      fontSize: 10,
      color: "#ffffff",
      opacity: 0.85,
      fontStyle: "italic",
    },
    thankCodeBox: {
      alignItems: "flex-end",
    },
    thankCodeLabel: {
      fontFamily: "Manrope",
      fontSize: 6.5,
      letterSpacing: 2,
      color: "#ffffff",
      opacity: 0.7,
      textTransform: "uppercase",
      fontWeight: 700,
      marginBottom: 3,
    },
    thankCodeValue: {
      fontFamily: "Fraunces",
      fontSize: 14,
      color: "#ffffff",
      fontWeight: 600,
      letterSpacing: 0.5,
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
  });

// ————————————————————————————————————————————————
// Typy
// ————————————————————————————————————————————————
interface OfferItemPdf {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: string;
  vatRate: number;
  sourceType: string | null;
  day: number;
  date: string | null;
  timeFrom: string | null;
  timeTo: string | null;
}

interface PackageComposition {
  packageName: string;
  offerTypeName: string;
  sections: { name: string; mode?: string; count?: number | null; items: string[] }[];
}

interface OfferPdfProps {
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
    offerExpiryDays?: number;
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

// ————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————
function parseComposition(desc: string | null): PackageComposition | null {
  if (!desc) return null;
  try {
    const p = JSON.parse(desc);
    if (p.packageName && p.sections) return p;
  } catch {}
  return null;
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

function offerCode(createdAt: string, clientName: string): string {
  const d = new Date(createdAt);
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const suffix = clientName.replace(/\s+/g, "").slice(0, 3).toUpperCase() || "OFR";
  return `${y}${m}${day}-${suffix}`;
}

// ————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————
export function OfferPdf({ hotel, offer, items }: OfferPdfProps) {
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
  const createdDate = new Date(offer.createdAt).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const expiryDays = hotel.offerExpiryDays ?? 14;
  const expiryDate = new Date(offer.createdAt);
  expiryDate.setDate(expiryDate.getDate() + expiryDays);
  const expiryStr = expiryDate.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const code = offerCode(offer.createdAt, offer.clientName);
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

  // Totals — Decimal
  let totalNettoD = new Decimal(0);
  let totalVatD = new Decimal(0);
  for (const item of items) {
    const mul = item.sourceType === "PACKAGE" ? personCount : 1;
    const netto = new Decimal(item.unitPrice).mul(item.quantity).mul(mul);
    totalNettoD = totalNettoD.add(netto);
    totalVatD = totalVatD.add(netto.mul(new Decimal(item.vatRate).div(100)));
  }
  const totalNetto = totalNettoD.toNumber();
  const totalVat = totalVatD.toNumber();
  const totalBrutto = totalNettoD.add(totalVatD).toNumber();

  const addressLine = [hotel.address, [hotel.postalCode, hotel.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* COVER BAND — diagonal gradient (fake, bez SVG) + dekoracyjne koła */}
        <View style={s.coverBand}>
          <Svg style={s.coverBandBg} viewBox="0 0 595 200" preserveAspectRatio="none">
            {/* Schodkowy gradient: wiele trapezów od ciemnego do jasnego */}
            {Array.from({ length: 80 }).map((_, i) => {
              const t = i / 79;
              const c = lerpHexMulti(
                [accentDark, accent, accentLight],
                t
              );
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
            {/* Lekka winieta na dole — coral-dark, nie czarna */}
            <Rect x={0} y={160} width={595} height={40} fill={accentDark} fillOpacity={0.35} />
            {/* Dekoracyjne koła */}
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
            {/* Cienka linia akcentowa pod nagłówkiem */}
            <Rect x={0} y={197} width={595} height={3} fill={accentLight} />
          </Svg>
          <View style={s.coverBandContent}>
            <View style={s.coverLeft}>
              <Text style={s.coverEyebrow}>Propozycja · {code}</Text>
              <Text style={s.coverHotel}>{hotel.hotelName}</Text>
              <Text style={s.coverTagline}>Przygotowane dla {offer.clientName}</Text>
            </View>
            <View style={s.monogram}>
              <Text style={s.monogramText}>{monogram(hotel.hotelName)}</Text>
            </View>
          </View>
        </View>

        {/* TITLE BLOCK */}
        <View style={s.titleBlock}>
          <View style={s.titleEyebrowRow}>
            <View style={s.titleEyebrowDash} />
            <Text style={s.titleEyebrow}>Oferta wydarzenia</Text>
          </View>
          <Text style={s.titleMain}>
            {offer.eventName || "Pobyt specjalny"}
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
              <Text style={s.metaLabel}>Wystawiono</Text>
              <Text style={s.metaValue}>{createdDate}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Ważna do</Text>
              <Text style={s.metaValue}>{expiryStr}</Text>
            </View>
            <View style={s.metaCol}>
              <Text style={s.metaLabel}>Goście</Text>
              <Text style={s.metaValue}>
                {offer.adultsCount}
                {offer.childrenCount > 0 ? ` + ${offer.childrenCount}` : ""} os.
              </Text>
            </View>
          </View>
        </View>

        {/* CLIENT & EVENT CARDS */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionNumber}>i.</Text>
            <Text style={s.sectionTitle}>Szczegóły</Text>
            <View style={s.sectionRule} />
          </View>

          <View style={s.twoCol}>
            <View style={s.card}>
              <Text style={s.cardEyebrow}>Klient</Text>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Imię</Text>
                <Text style={s.kvValue}>{offer.clientName}</Text>
              </View>
              {offer.clientCompany ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Firma</Text>
                  <Text style={s.kvValue}>{offer.clientCompany}</Text>
                </View>
              ) : null}
              {offer.clientEmail ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>E-mail</Text>
                  <Text style={s.kvValue}>{offer.clientEmail}</Text>
                </View>
              ) : null}
              {offer.clientPhone ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Telefon</Text>
                  <Text style={s.kvValue}>{offer.clientPhone}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.card}>
              <Text style={s.cardEyebrow}>Wydarzenie</Text>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Termin</Text>
                <Text style={s.kvValue}>
                  {sameDay ? dateFromStr : `${dateFromStr} — ${dateToStr}`}
                </Text>
              </View>
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Dorośli</Text>
                <Text style={s.kvValue}>{offer.adultsCount} os.</Text>
              </View>
              {offer.childrenCount > 0 ? (
                <View style={s.kvRow}>
                  <Text style={s.kvLabel}>Dzieci</Text>
                  <Text style={s.kvValue}>{offer.childrenCount} os.</Text>
                </View>
              ) : null}
              <View style={s.kvRow}>
                <Text style={s.kvLabel}>Razem</Text>
                <Text style={s.kvValue}>{personCount} gości</Text>
              </View>
            </View>
          </View>
        </View>

        {/* HIGHLIGHTS — 3 kluczowe fakty */}
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
            <Text style={s.hlLabel}>Goście</Text>
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
            <Text style={s.hlLabel}>Dni</Text>
            <Text style={s.hlValue}>{days.length}</Text>
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

        {/* PROGRAM — DAYS */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionNumber}>ii.</Text>
            <Text style={s.sectionTitle}>Program i pozycje</Text>
            <View style={s.sectionRule} />
          </View>

          {days.map(([dayNum, dayData], di) => {
            const dLabel = dayData.date
              ? new Date(dayData.date).toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : "";
            return (
              <View key={dayNum} wrap={false} break={di > 0 && dayData.items.length > 3}>
                <View style={s.dayBanner}>
                  <Text style={s.dayNumber}>
                    {String(dayNum).padStart(2, "0")}
                  </Text>
                  <View style={s.dayLabel}>
                    <Text style={s.dayLabelEyebrow}>Dzień</Text>
                    <Text style={s.dayLabelText}>{dLabel || `Dzień ${dayNum}`}</Text>
                  </View>
                </View>

                <View style={s.tbl}>
                  <View style={s.tblHead}>
                    <Text style={[s.th, s.colNr]}>#</Text>
                    <Text style={[s.th, s.colName]}>Pozycja</Text>
                    <Text style={[s.th, s.colTime]}>Godz.</Text>
                    <Text style={[s.th, s.colQty]}>Il.</Text>
                    <Text style={[s.th, s.colPers]}>Os.</Text>
                    <Text style={[s.th, s.colUnit]}>Cena</Text>
                    <Text style={[s.th, s.colVat]}>VAT</Text>
                    <Text style={[s.th, s.colBrutto]}>Brutto</Text>
                  </View>

                  {dayData.items.map((item, idx) => {
                    const isPackage = item.sourceType === "PACKAGE";
                    const mul = isPackage ? personCount : 1;
                    const nettoD = new Decimal(item.unitPrice).mul(item.quantity).mul(mul);
                    const bruttoD = nettoD.mul(
                      new Decimal(1).add(new Decimal(item.vatRate).div(100))
                    );
                    const brutto = bruttoD.toNumber();
                    const unit = Number(item.unitPrice);
                    const time = item.timeFrom
                      ? `${item.timeFrom}${item.timeTo ? `–${item.timeTo}` : ""}`
                      : "—";
                    const comp = isPackage ? parseComposition(item.description) : null;

                    return (
                      <View key={idx} wrap={false}>
                        <View style={[s.tblRow, isPackage ? s.tblRowPackage : {}]}>
                          <Text style={[s.colNr, s.rowNr]}>{idx + 1}.</Text>
                          <View style={s.colName}>
                            <Text style={s.rowName}>{item.name}</Text>
                            {isPackage ? (
                              <Text style={s.rowNameTag}>Pakiet · cena za osobę</Text>
                            ) : null}
                          </View>
                          <Text style={[s.colTime, s.rowCellMute]}>{time}</Text>
                          <Text style={[s.colQty, s.rowCell]}>{item.quantity}</Text>
                          <Text style={[s.colPers, s.rowCell]}>
                            {isPackage ? personCount : "—"}
                          </Text>
                          <Text style={[s.colUnit, s.rowCell]}>
                            {formatPLN(unit)}
                          </Text>
                          <Text style={[s.colVat, s.rowCellMute]}>{item.vatRate}%</Text>
                          <Text style={[s.colBrutto, s.rowBrutto]}>
                            {formatPLN(brutto)}
                          </Text>
                        </View>

                        {comp ? (
                          <View style={s.pkgComp}>
                            {comp.sections.map((sec, si) => (
                              <View key={si} style={s.pkgSection}>
                                <View style={s.pkgSectionHead}>
                                  <Text style={s.pkgSectionName}>{sec.name}</Text>
                                  <Text style={s.pkgSectionBadge}>
                                    {sec.mode === "CHOOSE_X_FROM_Y"
                                      ? `· Do wyboru ${sec.count || "?"} z ${sec.items.length}`
                                      : "· W cenie"}
                                  </Text>
                                </View>
                                <View style={s.pkgItemList}>
                                  {sec.items.map((it, ii) => (
                                    <Text key={ii} style={s.pkgItem}>
                                      — {it}
                                    </Text>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* SUBTOTALS + TOTAL — gradientowy blok, ale kwota normalną czcionką */}
        <View style={s.totalWrap}>
          <View style={s.subtotalRow}>
            <View style={s.subtotalItem}>
              <Text style={s.subtotalLabel}>Netto</Text>
              <Text style={s.subtotalValue}>{formatPLN(totalNetto)} zł</Text>
            </View>
            <View style={s.subtotalItem}>
              <Text style={s.subtotalLabel}>VAT</Text>
              <Text style={s.subtotalValue}>{formatPLN(totalVat)} zł</Text>
            </View>
          </View>

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
                <Text style={s.totalEyebrow}>Razem brutto</Text>
                <Text style={s.totalLabel}>Do zapłaty</Text>
              </View>
              <View style={s.totalRight}>
                <Text style={s.totalAmount}>{formatPLN(totalBrutto)}</Text>
                <Text style={s.totalCurrency}>PLN</Text>
              </View>
            </View>
          </View>
        </View>

        {/* VALIDITY STRIP */}
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
            Oferta ważna do {expiryStr}. Potwierdzenie rezerwacji następuje po podpisaniu
            umowy.
          </Text>
        </View>

        {/* FOOTER */}
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

        {/* Decorative bottom-right mark on cover page */}
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
            <Path
              d="M50 5 L58 1 L58 9 Z"
              fill={accent}
            />
          </Svg>
        </View>
      </Page>
    </Document>
  );
}
