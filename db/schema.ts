import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const demoOrders = sqliteTable('demo_orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  customerName: text('customer_name').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  postalCode: text('postal_code').notNull(),
  region: text('region').notNull(),
  itemsJson: text('items_json').notNull(),
  subtotal: integer('subtotal').notNull(),
  shipping: integer('shipping').notNull(),
  total: integer('total').notNull(),
  status: text('status').notNull().default('awaiting_payment'),
  paymentProvider: text('payment_provider').notNull().default('sandbox'),
  paymentId: text('payment_id'),
  paymentStatus: text('payment_status').notNull().default('not_started'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('demo_orders_order_number_unique').on(table.orderNumber),
  uniqueIndex('demo_orders_payment_id_unique').on(table.paymentId),
  index('idx_demo_orders_created_at').on(table.createdAt),
  index('idx_demo_orders_status_created_at').on(table.status, table.createdAt),
])

export const newsletterSubscribers = sqliteTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  source: text('source').notNull().default('landing_footer'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('newsletter_subscribers_email_unique').on(table.email)])

export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(),
  eventKey: text('event_key').notNull(),
  orderNumber: text('order_number').notNull(),
  provider: text('provider').notNull(),
  eventType: text('event_type').notNull(),
  paymentId: text('payment_id'),
  status: text('status').notNull(),
  payloadJson: text('payload_json').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('payment_events_event_key_unique').on(table.eventKey),
  index('idx_payment_events_order_created_at').on(table.orderNumber, table.createdAt),
  index('idx_payment_events_created_at').on(table.createdAt),
])
