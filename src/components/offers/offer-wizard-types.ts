// Typy współdzielone przez wszystkie kroki wizarda

export interface OfferFormData {
  // Step 1: Klient
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompany: string;
  // Step 2: Wydarzenie
  eventName: string;
  eventDateFrom: string;
  eventDateTo: string;
  adultsCount: number;
  childrenCount: number;
  // Step 3: Sale
  halls: OfferHallItem[];
  // Step 4: Pokoje
  rooms: OfferRoomItem[];
  // Step 5: Pakiety
  packages: OfferPackageItem[];
  // Step 6: Notatki
  notes: string;
}

export interface OfferHallItem {
  hallId: string;
  hallName: string;
  capacity: number;
  date: string;
  pricePerDay: string;
}

export interface OfferRoomItem {
  roomId: string;
  roomName: string;
  roomType: string;
  quantity: number;
  nights: number;
  pricePerNight: string;
}

export interface OfferPackageItem {
  packageId: string;
  packageName: string;
  offerTypeName: string;
  priceSnapshot: string | null;
}

export const INITIAL_FORM_DATA: OfferFormData = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientCompany: "",
  eventName: "",
  eventDateFrom: "",
  eventDateTo: "",
  adultsCount: 1,
  childrenCount: 0,
  halls: [],
  rooms: [],
  packages: [],
  notes: "",
};

export const STEP_LABELS = [
  "Klient",
  "Wydarzenie",
  "Sale",
  "Pakiety",
  "Podsumowanie",
];
