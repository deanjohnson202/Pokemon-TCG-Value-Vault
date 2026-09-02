import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const inventory = sqliteTable(
  'inventory',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    externalId: text('external_id').notNull(),
    language: text('language', { enum: ['en', 'ja'] }).notNull(),
    name: text('name').notNull(),
    setName: text('set_name').notNull(),
    collectorNumber: text('collector_number').notNull(),
    imageUrl: text('image_url'),
    tcgplayerUrl: text('tcgplayer_url'),
    finish: text('finish').notNull().default('normal'),
    condition: text('condition').notNull().default('near_mint'),
    quantity: integer('quantity').notNull().default(1),
    marketPriceCents: integer('market_price_cents'),
    manualValueCents: integer('manual_value_cents'),
    purchasePriceCents: integer('purchase_price_cents'),
    priceUpdatedAt: text('price_updated_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_inventory_owner_card_variant').on(
      table.userId,
      table.externalId,
      table.language,
      table.finish,
      table.condition,
    ),
    index('idx_inventory_owner_value').on(table.userId, table.marketPriceCents),
  ],
);

export const priceHistory = sqliteTable(
  'price_history',
  {
    id: text('id').primaryKey(),
    inventoryId: text('inventory_id')
      .notNull()
      .references(() => inventory.id, { onDelete: 'cascade' }),
    valueCents: integer('value_cents').notNull(),
    capturedOn: text('captured_on').notNull(),
  },
  (table) => [
    uniqueIndex('idx_price_history_item_day').on(
      table.inventoryId,
      table.capturedOn,
    ),
  ],
);

export const catalogGroups = sqliteTable('catalog_groups', {
  groupId: integer('group_id').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation'),
  publishedOn: text('published_on'),
  sourceModifiedOn: text('source_modified_on'),
  syncedAt: text('synced_at'),
});

export const catalogCards = sqliteTable(
  'catalog_cards',
  {
    productId: integer('product_id').primaryKey(),
    groupId: integer('group_id')
      .notNull()
      .references(() => catalogGroups.groupId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    searchName: text('search_name').notNull(),
    collectorNumber: text('collector_number').notNull(),
    imageUrl: text('image_url'),
    tcgplayerUrl: text('tcgplayer_url'),
    sourceModifiedOn: text('source_modified_on'),
  },
  (table) => [
    index('idx_catalog_cards_search_name').on(table.searchName),
    index('idx_catalog_cards_group').on(table.groupId),
  ],
);

export const catalogPrices = sqliteTable(
  'catalog_prices',
  {
    productId: integer('product_id')
      .notNull()
      .references(() => catalogCards.productId, { onDelete: 'cascade' }),
    finish: text('finish').notNull(),
    marketPriceCents: integer('market_price_cents'),
    lowPriceCents: integer('low_price_cents'),
  },
  (table) => [
    uniqueIndex('idx_catalog_prices_product_finish').on(
      table.productId,
      table.finish,
    ),
  ],
);
