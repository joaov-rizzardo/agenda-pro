/**
 * Resolves the price that actually applies to a professional↔service association.
 *
 * The catalog's `defaultPrice` is never copied into the join row — only the
 * per-professional `customPrice` is stored, and only when `useCustomPrice` is
 * true. So default-price associations always reflect the current catalog price
 * (FR-018 / SC-004), while custom-price associations do not.
 *
 * The flag — not the value — decides: a `customPrice` equal to `defaultPrice`
 * is still treated as custom (research §4).
 */
export function resolveEffectivePrice({
  useCustomPrice,
  customPrice,
  defaultPrice,
}: {
  useCustomPrice: boolean;
  customPrice: number | null;
  defaultPrice: number;
}): number {
  return useCustomPrice && customPrice != null ? customPrice : defaultPrice;
}
