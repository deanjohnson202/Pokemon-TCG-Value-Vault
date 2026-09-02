export type CatalogPrice = {
  finish: string;
  marketPriceCents: number | null;
};

export type CatalogCard = {
  id: string;
  name: string;
  number: string;
  set: string;
  image: string | null;
  language: 'en' | 'ja';
  tcgplayerUrl?: string;
  prices: CatalogPrice[];
};

export type InventoryItem = {
  id: string;
  externalId: string;
  language: 'en' | 'ja';
  name: string;
  setName: string;
  collectorNumber: string;
  imageUrl: string | null;
  tcgplayerUrl: string | null;
  finish: string;
  condition: string;
  quantity: number;
  marketPriceCents: number | null;
  manualValueCents: number | null;
  purchasePriceCents: number | null;
  priceUpdatedAt: string | null;
};

export function displayValueCents(item: InventoryItem) {
  return item.manualValueCents ?? item.marketPriceCents;
}

export function formatMoney(cents: number | null) {
  if (cents == null) return 'Unpriced';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
