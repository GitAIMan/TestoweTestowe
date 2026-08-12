import { describe, it, expect } from "vitest";
import { isValidEmail } from "./validation";

describe("isValidEmail", () => {
  it("pusty string jest dozwolony (pole opcjonalne)", () => {
    expect(isValidEmail("")).toBe(true);
    expect(isValidEmail("   ")).toBe(true);
  });

  it("akceptuje poprawny adres", () => {
    expect(isValidEmail("jan@hotel.pl")).toBe(true);
  });

  it("odrzuca adres bez @", () => {
    expect(isValidEmail("jan.hotel.pl")).toBe(false);
  });

  it("odrzuca adres bez domeny", () => {
    expect(isValidEmail("jan@")).toBe(false);
  });

  it("odrzuca adres ze spacją", () => {
    expect(isValidEmail("jan kowalski@hotel.pl")).toBe(false);
  });

  it("odrzuca zbyt krótką końcówkę domeny", () => {
    expect(isValidEmail("jan@hotel.p")).toBe(false);
  });
});
