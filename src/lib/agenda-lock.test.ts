import { describe, it, expect } from "vitest";
import { computeClientLockDate, isClientLocked, DEFAULT_LOCK_DAYS_BEFORE } from "./agenda-lock";

describe("computeClientLockDate", () => {
  it("domyślnie odejmuje 14 dni od daty wydarzenia", () => {
    const eventDate = new Date("2026-06-15T00:00:00Z");
    const lockDate = computeClientLockDate(eventDate);
    expect(lockDate.toISOString().slice(0, 10)).toBe("2026-06-01");
  });

  it("respektuje niestandardową liczbę dni blokady", () => {
    const eventDate = new Date("2026-06-15T00:00:00Z");
    const lockDate = computeClientLockDate(eventDate, 7);
    expect(lockDate.toISOString().slice(0, 10)).toBe("2026-06-08");
  });

  it("działa z datą jako string", () => {
    const lockDate = computeClientLockDate("2026-06-15");
    expect(lockDate.getUTCDate()).toBe(1);
  });
});

describe("isClientLocked", () => {
  it("NIE jest zablokowany dużo wcześniej przed wydarzeniem", () => {
    const eventDate = new Date("2026-12-31T00:00:00Z");
    const now = new Date("2026-01-01T00:00:00Z");
    expect(isClientLocked(eventDate, DEFAULT_LOCK_DAYS_BEFORE, now)).toBe(false);
  });

  it("jest zablokowany dokładnie w dniu granicznym (14 dni przed)", () => {
    const eventDate = new Date("2026-06-15T00:00:00Z");
    const now = new Date("2026-06-01T00:00:00Z");
    expect(isClientLocked(eventDate, 14, now)).toBe(true);
  });

  it("jest zablokowany po dacie wydarzenia", () => {
    const eventDate = new Date("2026-06-15T00:00:00Z");
    const now = new Date("2026-07-01T00:00:00Z");
    expect(isClientLocked(eventDate, 14, now)).toBe(true);
  });

  it("dzień przed granicą blokady — jeszcze odblokowany", () => {
    const eventDate = new Date("2026-06-15T00:00:00Z");
    const now = new Date("2026-05-31T00:00:00Z");
    expect(isClientLocked(eventDate, 14, now)).toBe(false);
  });
});
