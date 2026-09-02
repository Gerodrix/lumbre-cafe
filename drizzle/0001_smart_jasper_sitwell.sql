PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_demo_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`email` text NOT NULL,
	`address` text NOT NULL,
	`postal_code` text NOT NULL,
	`region` text NOT NULL,
	`items_json` text NOT NULL,
	`subtotal` integer NOT NULL,
	`shipping` integer NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`payment_provider` text DEFAULT 'sandbox' NOT NULL,
	`payment_id` text,
	`payment_status` text DEFAULT 'not_started' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_demo_orders`("id", "order_number", "customer_name", "email", "address", "postal_code", "region", "items_json", "subtotal", "shipping", "total", "status", "payment_provider", "payment_id", "payment_status", "created_at", "updated_at") SELECT "id", "order_number", "customer_name", "email", "address", "postal_code", "region", "items_json", "subtotal", "shipping", "total", "status", 'sandbox', NULL, 'not_started', "created_at", "created_at" FROM `demo_orders`;--> statement-breakpoint
DROP TABLE `demo_orders`;--> statement-breakpoint
ALTER TABLE `__new_demo_orders` RENAME TO `demo_orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `demo_orders_order_number_unique` ON `demo_orders` (`order_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `demo_orders_payment_id_unique` ON `demo_orders` (`payment_id`);--> statement-breakpoint
CREATE INDEX `idx_demo_orders_created_at` ON `demo_orders` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_demo_orders_status_created_at` ON `demo_orders` (`status`,`created_at`);--> statement-breakpoint
PRAGMA optimize;
