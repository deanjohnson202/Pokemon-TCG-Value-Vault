const BASE_URL = 'https://tcgcsv.com/tcgplayer/3';
const REQUEST_HEADERS = {
  'User-Agent': 'Pokemon-TCG-Value-Vault/0.1.0',
  Accept: 'application/json',
};

export type TcgCsvGroup = {
  groupId: number;
  name: string;
  abbreviation?: string | null;
  publishedOn?: string | null;
  modifiedOn?: string | null;
};

export type TcgCsvProduct = {
  productId: number;
  name: string;
  imageUrl?: string | null;
  url?: string | null;
  modifiedOn?: string | null;
  extendedData?: Array<{ name: string; value: string }>;
};

export type TcgCsvPrice = {
  productId: number;
  subTypeName: string;
  marketPrice?: number | null;
  lowPrice?: number | null;
};

type TcgCsvResponse<T> = {
  success: boolean;
  errors?: string[];
  results: T[];
};

let nextRequestAt = 0;

async function waitForRequestSlot() {
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  nextRequestAt = Date.now() + 110;
}

async function getJson<T>(url: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitForRequestSlot();
    const response = await fetch(url, { headers: REQUEST_HEADERS });
    if (response.ok) {
      const payload = (await response.json()) as TcgCsvResponse<T>;
      if (!payload.success)
        throw new Error(payload.errors?.join(', ') || 'TCGCSV request failed');
      return payload.results;
    }
    if (response.status !== 429 && response.status < 500)
      throw new Error(`TCGCSV returned ${response.status}`);
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
  throw new Error('TCGCSV did not respond after three attempts');
}

export function getTcgCsvGroups() {
  return getJson<TcgCsvGroup>(`${BASE_URL}/groups`);
}

export async function getTcgCsvGroup(groupId: number) {
  const products = await getJson<TcgCsvProduct>(
    `${BASE_URL}/${groupId}/products`,
  );
  const prices = await getJson<TcgCsvPrice>(`${BASE_URL}/${groupId}/prices`);
  return { products, prices };
}

export function extendedValue(product: TcgCsvProduct, key: string) {
  return product.extendedData?.find((entry) => entry.name === key)?.value;
}

export function cents(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? null
    : Math.round(value * 100);
}
