CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_key` text NOT NULL,
	`order_number` text NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`payment_id` text,
	`status` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_events_event_key_unique` ON `payment_events` (`event_key`);--> statement-breakpoint
CREATE INDEX `idx_payment_events_order_created_at` ON `payment_events` (`order_number`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_payment_events_created_at` ON `payment_events` (`created_at`);--> statement-breakpoint
PRAGMA optimize;
