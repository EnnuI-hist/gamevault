export interface CheapSharkDeal {
  internalName: string;
  title: string;
  metacriticLink?: string | null;
  dealID: string;
  storeID: string;
  gameID: string;
  salePrice: string;
  normalPrice: string;
  isOnSale: string;
  savings: string;
  metacriticScore: string;
  steamRatingText?: string | null;
  steamRatingPercent?: string | null;
  steamRatingCount?: string | null;
  steamAppID: string;
  releaseDate?: number;
  lastChange?: number;
  dealRating: string;
  thumb: string;
}

export type DealSort = 'Deal Rating' | 'Savings' | 'Price';

export async function fetchSteamDeals(params: {
  sortBy?: DealSort;
  pageSize?: number;
  pageNumber?: number;
  title?: string;
}): Promise<CheapSharkDeal[]> {
  const url = new URL('https://www.cheapshark.com/api/1.0/deals');
  url.searchParams.set('storeID', '1'); // Steam
  url.searchParams.set('pageSize', String(params.pageSize ?? 48));
  url.searchParams.set('pageNumber', String(params.pageNumber ?? 0));

  if (params.title && params.title.trim()) {
    url.searchParams.set('title', params.title.trim());
    url.searchParams.set('exact', '0');
  } else {
    url.searchParams.set('sortBy', params.sortBy ?? 'Deal Rating');
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`CheapShark API error: ${res.statusText}`);
  }
  const data: CheapSharkDeal[] = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function searchSteamDealForGame(title: string): Promise<CheapSharkDeal | null> {
  const cleanTitle = title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .trim();
  if (!cleanTitle) return null;

  try {
    const url = `https://www.cheapshark.com/api/1.0/deals?storeID=1&title=${encodeURIComponent(cleanTitle)}&exact=0`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const deals: CheapSharkDeal[] = await res.json();
    if (!Array.isArray(deals) || deals.length === 0) return null;

    // Ищем акцию со скидкой (savings > 0)
    const onSaleDeal = deals.find(
      (d) => parseFloat(d.savings) > 0 && d.isOnSale === '1'
    );
    return onSaleDeal || null;
  } catch (err) {
    console.warn('CheapShark lookup error for title:', title, err);
    return null;
  }
}
