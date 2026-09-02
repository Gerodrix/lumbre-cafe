CREATE TABLE `demo_orders` (
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
	`status` text DEFAULT 'demo_confirmed' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_orders_order_number_unique` ON `demo_orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `newsletter_subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'landing_footer' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `newsletter_subscribers_email_unique` ON `newsletter_subscribers` (`email`);