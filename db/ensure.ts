import { env } from 'cloudflare:workers';

let ready: Promise<void> | null = null;

export function ensureDatabase() {
  ready ??= (async () => {
    await env.DB.batch([
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, external_id TEXT NOT NULL, language TEXT NOT NULL, name TEXT NOT NULL, set_name TEXT NOT NULL, collector_number TEXT NOT NULL, image_url TEXT, tcgplayer_url TEXT, finish TEXT DEFAULT 'normal' NOT NULL, condition TEXT DEFAULT 'near_mint' NOT NULL, quantity INTEGER DEFAULT 1 NOT NULL, market_price_cents INTEGER, manual_value_cents INTEGER, purchase_price_cents INTEGER, price_updated_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
      ),
      env.DB.prepare(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_owner_card_variant ON inventory (user_id, external_id, language, finish, condition)`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_inventory_owner_value ON inventory (user_id, market_price_cents)`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS price_history (id TEXT PRIMARY KEY NOT NULL, inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE, value_cents INTEGER NOT NULL, captured_on TEXT NOT NULL)`,
      ),
      env.DB.prepare(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_price_history_item_day ON price_history (inventory_id, captured_on)`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS catalog_groups (group_id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, abbreviation TEXT, published_on TEXT, source_modified_on TEXT, synced_at TEXT)`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS catalog_group_languages (group_id INTEGER PRIMARY KEY NOT NULL REFERENCES catalog_groups(group_id) ON DELETE CASCADE, language TEXT NOT NULL)`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_catalog_group_languages_language ON catalog_group_languages (language)`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS catalog_cards (product_id INTEGER PRIMARY KEY NOT NULL, group_id INTEGER NOT NULL REFERENCES catalog_groups(group_id) ON DELETE CASCADE, name TEXT NOT NULL, search_name TEXT NOT NULL, collector_number TEXT NOT NULL, image_url TEXT, tcgplayer_url TEXT, source_modified_on TEXT)`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_catalog_cards_search_name ON catalog_cards (search_name)`,
      ),
      env.DB.prepare(
        `CREATE INDEX IF NOT EXISTS idx_catalog_cards_group ON catalog_cards (group_id)`,
      ),
      env.DB.prepare(
        `CREATE TABLE IF NOT EXISTS catalog_prices (product_id INTEGER NOT NULL REFERENCES catalog_cards(product_id) ON DELETE CASCADE, finish TEXT NOT NULL, market_price_cents INTEGER, low_price_cents INTEGER)`,
      ),
      env.DB.prepare(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_prices_product_finish ON catalog_prices (product_id, finish)`,
      ),
    ]);
    await env.DB.prepare('PRAGMA optimize').run();
  })();
  return ready;
}
