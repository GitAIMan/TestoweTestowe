"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { OfferFormData, OfferRoomItem } from "./offer-wizard-types";

interface Room {
  id: string;
  name: string;
  type: string;
  pricePerNight: string;
  isActive: boolean;
}

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepRooms({ data, onChange }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => setRooms(data.filter((r: Room) => r.isActive)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addRoom(room: Room) {
    const already = data.rooms.some((r) => r.roomId === room.id);
    if (already) return;

    // Oblicz liczbę nocy z dat wydarzenia
    let nights = 1;
    if (data.eventDateFrom && data.eventDateTo) {
      const from = new Date(data.eventDateFrom);
      const to = new Date(data.eventDateTo);
      const diff = Math.ceil(
        (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff > 0) nights = diff;
    }

    const item: OfferRoomItem = {
      roomId: room.id,
      roomName: room.name,
      roomType: room.type,
      quantity: 1,
      nights,
      pricePerNight: room.pricePerNight,
    };
    onChange({ rooms: [...data.rooms, item] });
  }

  function updateRoom(index: number, field: "quantity" | "nights", value: number) {
    const updated = data.rooms.map((r, i) =>
      i === index ? { ...r, [field]: Math.max(1, value) } : r
    );
    onChange({ rooms: updated });
  }

  function removeRoom(index: number) {
    onChange({ rooms: data.rooms.filter((_, i) => i !== index) });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Pokoje</h2>
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Pokoje</h2>
      <p className="text-sm text-muted-foreground">
        Wybierz typy pokoi, ilość i liczbę nocy.
      </p>

      {/* Dostępne pokoje */}
      <div className="space-y-2">
        {rooms.map((room) => {
          const isSelected = data.rooms.some((r) => r.roomId === room.id);
          return (
            <div
              key={room.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <div>
                <span className="font-medium">{room.name}</span>
                <span className="text-muted-foreground ml-2 text-sm">
                  ({room.type}) — {Number(room.pricePerNight).toFixed(2)} zł/noc
                </span>
              </div>
              {isSelected ? (
                <span className="text-sm text-muted-foreground">Dodany</span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => addRoom(room)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Dodaj
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Wybrane pokoje */}
      {data.rooms.length > 0 && (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-medium">Wybrane pokoje:</h3>
          {data.rooms.map((room, i) => (
            <div
              key={i}
              className="rounded border p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {room.roomName} ({room.roomType})
                </span>
                <Button variant="ghost" size="sm" onClick={() => removeRoom(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Ilość</Label>
                  <Input
                    type="number"
                    min="1"
                    value={room.quantity}
                    onChange={(e) =>
                      updateRoom(i, "quantity", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Noce</Label>
                  <Input
                    type="number"
                    min="1"
                    value={room.nights}
                    onChange={(e) =>
                      updateRoom(i, "nights", parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Cena/noc</Label>
                  <Input
                    value={`${Number(room.pricePerNight).toFixed(2)} zł`}
                    disabled
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-right">
                Suma: {(Number(room.pricePerNight) * room.quantity * room.nights).toFixed(2)} zł
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
