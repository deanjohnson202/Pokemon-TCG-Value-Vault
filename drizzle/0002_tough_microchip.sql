CREATE TABLE `catalog_group_languages` (
	`group_id` integer PRIMARY KEY NOT NULL,
	`language` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `catalog_groups`(`group_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_catalog_group_languages_language` ON `catalog_group_languages` (`language`);