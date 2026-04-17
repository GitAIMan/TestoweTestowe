"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

function formatPL(raw: string): string {
  if (raw === "" || raw === "-") return raw;
  const negative = raw.startsWith("-");
  const body = negative ? raw.slice(1) : raw;
  const [intPart, fracPart] = body.split(".");
  const intClean = intPart.replace(/^0+(?=\d)/, "") || "0";
  const withSpaces = intClean.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  const formatted = fracPart !== undefined ? `${withSpaces},${fracPart}` : withSpaces;
  return negative ? `-${formatted}` : formatted;
}

function toNumericString(display: string): string {
  const cleaned = display
    .replace(/\s|\u00A0/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  if (cleaned === "" || cleaned === "-") return cleaned;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return "";
  return cleaned;
}

export interface PriceInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onChange: (next: string) => void;
}

export function PriceInput({ value, onChange, onFocus, onBlur, className, ...rest }: PriceInputProps) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string>("");

  const display = focused ? draft : formatPL(value || "");

  return (
    <Input
      inputMode="decimal"
      className={className}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        setDraft(value || "");
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const numeric = toNumericString(e.target.value);
        if (focused) setDraft(numeric);
        onChange(numeric);
      }}
      {...rest}
    />
  );
}
