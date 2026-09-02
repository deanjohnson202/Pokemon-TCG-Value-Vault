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
    ]);
  })();
  return ready;
}
