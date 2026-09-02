CREATE TABLE `catalog_cards` (
	`product_id` integer PRIMARY KEY NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`search_name` text NOT NULL,
	`collector_number` text NOT NULL,
	`image_url` text,
	`tcgplayer_url` text,
	`source_modified_on` text,
	FOREIGN KEY (`group_id`) REFERENCES `catalog_groups`(`group_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_catalog_cards_search_name` ON `catalog_cards` (`search_name`);--> statement-breakpoint
CREATE INDEX `idx_catalog_cards_group` ON `catalog_cards` (`group_id`);--> statement-breakpoint
CREATE TABLE `catalog_groups` (
	`group_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`abbreviation` text,
	`published_on` text,
	`source_modified_on` text,
	`synced_at` text
);
--> statement-breakpoint
CREATE TABLE `catalog_prices` (
	`product_id` integer NOT NULL,
	`finish` text NOT NULL,
	`market_price_cents` integer,
	`low_price_cents` integer,
	FOREIGN KEY (`product_id`) REFERENCES `catalog_cards`(`product_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_catalog_prices_product_finish` ON `catalog_prices` (`product_id`,`finish`);