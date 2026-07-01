const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Formats a numeric amount (reais) as a pt-BR BRL currency string
 * (Constitution X). Exported for reuse where JSX isn't wanted.
 */
export function formatBRL(value: number): string {
  return BRL_FORMATTER.format(value);
}

/**
 * Parses a pt-BR price entry ("45,00", "1.234,50" or "45.00") into reais, or
 * `null` when invalid (empty, non-numeric, negative, or > 2 decimals).
 */
export function parseBRLPrice(raw: string): number | null {
  const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
  if (normalized === "") return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  if (Number(value.toFixed(2)) !== value) return null;
  return value;
}

/**
 * Presentational R$ price. Money always arrives as a plain `number` (reais)
 * from the API boundary (research §1).
 */
export function ServicePrice({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return <span className={className}>{formatBRL(value)}</span>;
}
