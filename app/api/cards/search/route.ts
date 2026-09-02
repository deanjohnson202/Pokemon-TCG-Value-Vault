import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase } from '@/db/ensure';

type CardRow = {
  productId: number;
  name: string;
  collectorNumber: string;
  imageUrl: string | null;
  tcgplayerUrl: string | null;
  setName: string;
};
type PriceRow = {
  productId: number;
  finish: string;
  marketPriceCents: number | null;
};

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user && process.env.NODE_ENV === 'production')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim();
  const language = url.searchParams.get('language') === 'ja' ? 'ja' : 'en';
  if (!q || q.length < 2) return NextResponse.json({ cards: [] });

  try {
    await ensureDatabase();
    const catalog = await env.DB.prepare(
      `SELECT
       (SELECT count(*) FROM catalog_cards c
        JOIN catalog_group_languages l ON l.group_id = c.group_id
        WHERE l.language = ?) AS cardCount,
       (SELECT count(*) FROM catalog_groups g
        JOIN catalog_group_languages l ON l.group_id = g.group_id
        WHERE l.language = ? AND
          (g.synced_at IS NULL OR julianday(g.synced_at) < julianday('now', '-7 days'))) AS pendingGroups`,
    )
      .bind(language, language)
      .first<{ cardCount: number; pendingGroups: number }>();
    if (!Number(catalog?.cardCount) || Number(catalog?.pendingGroups))
      return NextResponse.json(
        {
          error: `The ${language === 'ja' ? 'Japanese' : 'English'} catalog needs to be downloaded.`,
          needsSync: true,
        },
        { status: 409 },
      );

    const needle = q.toLocaleLowerCase();
    const rows = await env.DB.prepare(
      `SELECT c.product_id AS productId, c.name, c.collector_number AS collectorNumber,
       c.image_url AS imageUrl, c.tcgplayer_url AS tcgplayerUrl, g.name AS setName
       FROM catalog_cards c JOIN catalog_groups g ON g.group_id = c.group_id
       JOIN catalog_group_languages l ON l.group_id = g.group_id
       WHERE l.language = ? AND
         (c.search_name LIKE ? OR c.collector_number LIKE ? OR lower(g.name) LIKE ?)
       ORDER BY CASE WHEN c.search_name LIKE ? THEN 0 ELSE 1 END,
         length(c.name), g.published_on DESC
       LIMIT 24`,
    )
      .bind(language, `%${needle}%`, `%${q}%`, `%${needle}%`, `${needle}%`)
      .all<CardRow>();
    const ids = rows.results.map((card) => card.productId);
    const priceRows = ids.length
      ? await env.DB.prepare(
          `SELECT product_id AS productId, finish, market_price_cents AS marketPriceCents
           FROM catalog_prices WHERE product_id IN (${ids.map(() => '?').join(',')})
           ORDER BY CASE lower(finish)
             WHEN 'normal' THEN 0 WHEN 'holofoil' THEN 1
             WHEN 'reverse holofoil' THEN 2 ELSE 3 END,
             market_price_cents DESC`,
        )
          .bind(...ids)
          .all<PriceRow>()
      : { results: [] as PriceRow[] };
    const prices = new Map<number, PriceRow[]>();
    for (const price of priceRows.results) {
      const list = prices.get(price.productId) ?? [];
      list.push(price);
      prices.set(price.productId, list);
    }
    return NextResponse.json({
      cards: rows.results.map((card) => ({
        id: `tcgplayer:${card.productId}`,
        name: card.name,
        number: card.collectorNumber || 'Unnumbered',
        set: card.setName,
        image: card.imageUrl,
        language,
        tcgplayerUrl: card.tcgplayerUrl,
        prices: (prices.get(card.productId) ?? []).map((price) => ({
          finish: price.finish,
          marketPriceCents: price.marketPriceCents,
        })),
      })),
    });
  } catch (error) {
    console.error('Card catalog search failed', error);
    return NextResponse.json(
      {
        error: `${language === 'ja' ? 'Japanese' : 'English'} card search is temporarily unavailable.`,
      },
      { status: 502 },
    );
  }
}
