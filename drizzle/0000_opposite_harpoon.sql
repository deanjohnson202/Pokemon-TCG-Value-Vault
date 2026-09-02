CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`external_id` text NOT NULL,
	`language` text NOT NULL,
	`name` text NOT NULL,
	`set_name` text NOT NULL,
	`collector_number` text NOT NULL,
	`image_url` text,
	`tcgplayer_url` text,
	`finish` text DEFAULT 'normal' NOT NULL,
	`condition` text DEFAULT 'near_mint' NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`market_price_cents` integer,
	`manual_value_cents` integer,
	`purchase_price_cents` integer,
	`price_updated_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_inventory_owner_card_variant` ON `inventory` (`user_id`,`external_id`,`language`,`finish`,`condition`);--> statement-breakpoint
CREATE INDEX `idx_inventory_owner_value` ON `inventory` (`user_id`,`market_price_cents`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_id` text NOT NULL,
	`value_cents` integer NOT NULL,
	`captured_on` text NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_price_history_item_day` ON `price_history` (`inventory_id`,`captured_on`);