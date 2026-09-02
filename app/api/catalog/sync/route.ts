import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { ensureDatabase } from '@/db/ensure';
import {
  cents,
  extendedValue,
  getTcgCsvGroup,
  getTcgCsvGroups,
} from '@/lib/tcgcsv';

const GROUPS_PER_REQUEST = 3;

async function authorized() {
  const user = await getChatGPTUser();
  return Boolean(user || process.env.NODE_ENV !== 'production');
}

async function importGroups(resetSynced: boolean) {
  const groups = await getTcgCsvGroups();
  for (let offset = 0; offset < groups.length; offset += 50) {
    await env.DB.batch(
      groups.slice(offset, offset + 50).map((group) =>
        env.DB.prepare(
          `INSERT INTO catalog_groups (group_id, name, abbreviation, published_on, source_modified_on, synced_at)
           VALUES (?, ?, ?, ?, ?, NULL)
           ON CONFLICT(group_id) DO UPDATE SET name = excluded.name, abbreviation = excluded.abbreviation,
             published_on = excluded.published_on, source_modified_on = excluded.source_modified_on,
             synced_at = CASE WHEN ? THEN NULL ELSE catalog_groups.synced_at END`,
        ).bind(
          group.groupId,
          group.name,
          group.abbreviation ?? null,
          group.publishedOn ?? null,
          group.modifiedOn ?? null,
          resetSynced ? 1 : 0,
        ),
      ),
    );
  }
}

async function initializeGroups() {
  const count = await env.DB.prepare(
    'SELECT count(*) AS count FROM catalog_groups',
  ).first<{ count: number }>();
  if (Number(count?.count)) return;
  await importGroups(false);
}

async function syncGroup(groupId: number) {
  const { products, prices } = await getTcgCsvGroup(groupId);
  const cards = products.flatMap((product) => {
    const number = extendedValue(product, 'Number');
    return number ? [{ ...product, number }] : [];
  });
  const cardIds = new Set(cards.map((card) => card.productId));
  const cardPrices = prices.filter((price) => cardIds.has(price.productId));

  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM catalog_prices WHERE product_id IN (SELECT product_id FROM catalog_cards WHERE group_id = ?)',
    ).bind(groupId),
    env.DB.prepare('DELETE FROM catalog_cards WHERE group_id = ?').bind(
      groupId,
    ),
  ]);

  for (let offset = 0; offset < cards.length; offset += 50) {
    await env.DB.batch(
      cards.slice(offset, offset + 50).map((card) =>
        env.DB.prepare(
          `INSERT INTO catalog_cards (product_id, group_id, name, search_name, collector_number, image_url, tcgplayer_url, source_modified_on)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          card.productId,
          groupId,
          card.name,
          card.name.toLocaleLowerCase(),
          card.number,
          card.imageUrl?.replace('_200w.', '_in_1000x1000.') ?? null,
          card.url ?? null,
          card.modifiedOn ?? null,
        ),
      ),
    );
  }
  for (let offset = 0; offset < cardPrices.length; offset += 50) {
    await env.DB.batch(
      cardPrices.slice(offset, offset + 50).map((price) =>
        env.DB.prepare(
          `INSERT INTO catalog_prices (product_id, finish, market_price_cents, low_price_cents)
           VALUES (?, ?, ?, ?)`,
        ).bind(
          price.productId,
          price.subTypeName,
          cents(price.marketPrice),
          cents(price.lowPrice),
        ),
      ),
    );
  }
  await env.DB.prepare(
    'UPDATE catalog_groups SET synced_at = ? WHERE group_id = ?',
  )
    .bind(new Date().toISOString(), groupId)
    .run();
}

async function refreshCollectionValues() {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE inventory
     SET market_price_cents = (
       SELECT p.market_price_cents FROM catalog_prices p
       WHERE p.product_id = CAST(substr(inventory.external_id, 11) AS INTEGER)
         AND lower(replace(p.finish, ' ', '')) = lower(replace(inventory.finish, ' ', ''))
     ), price_updated_at = ?
     WHERE language = 'en' AND external_id LIKE 'tcgplayer:%'
       AND EXISTS (
         SELECT 1 FROM catalog_prices p
         WHERE p.product_id = CAST(substr(inventory.external_id, 11) AS INTEGER)
           AND lower(replace(p.finish, ' ', '')) = lower(replace(inventory.finish, ' ', ''))
           AND p.market_price_cents IS NOT NULL
       )`,
  )
    .bind(now)
    .run();
  await env.DB.prepare(
    `INSERT INTO price_history (id, inventory_id, value_cents, captured_on)
     SELECT lower(hex(randomblob(16))), id,
       coalesce(manual_value_cents, market_price_cents), date('now')
     FROM inventory
     WHERE coalesce(manual_value_cents, market_price_cents) IS NOT NULL
     ON CONFLICT(inventory_id, captured_on)
     DO UPDATE SET value_cents = excluded.value_cents`,
  ).run();
}

export async function POST() {
  if (!(await authorized()))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureDatabase();
    await initializeGroups();
    let pending = await env.DB.prepare(
      `SELECT group_id FROM catalog_groups WHERE synced_at IS NULL
       ORDER BY published_on DESC, group_id DESC LIMIT ?`,
    )
      .bind(GROUPS_PER_REQUEST)
      .all<{ group_id: number }>();
    if (!pending.results.length) {
      const age = await env.DB.prepare(
        `SELECT min(synced_at) AS oldest FROM catalog_groups`,
      ).first<{ oldest: string | null }>();
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (!age?.oldest || new Date(age.oldest).getTime() < weekAgo) {
        await importGroups(true);
        pending = await env.DB.prepare(
          `SELECT group_id FROM catalog_groups WHERE synced_at IS NULL
           ORDER BY published_on DESC, group_id DESC LIMIT ?`,
        )
          .bind(GROUPS_PER_REQUEST)
          .all<{ group_id: number }>();
      }
    }
    for (const group of pending.results) await syncGroup(group.group_id);

    const status = await env.DB.prepare(
      `SELECT count(*) AS total,
       sum(CASE WHEN synced_at IS NOT NULL THEN 1 ELSE 0 END) AS completed
       FROM catalog_groups`,
    ).first<{ total: number; completed: number }>();
    const total = Number(status?.total ?? 0);
    const completed = Number(status?.completed ?? 0);
    if (total > 0 && completed === total) await refreshCollectionValues();
    return NextResponse.json({
      total,
      completed,
      remaining: total - completed,
    });
  } catch (error) {
    console.error('TCGCSV catalog sync failed', error);
    return NextResponse.json(
      { error: 'Could not download the TCGplayer catalog.' },
      { status: 502 },
    );
  }
}
