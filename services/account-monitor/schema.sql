-- Golden Peanut private monitor schema. Do not expose these tables through the public price Worker.
-- Account API credentials are AES-256-GCM encrypted and scoped to user opt-in.
CREATE TABLE IF NOT EXISTS gp_monitor_credentials (
 account_id TEXT PRIMARY KEY,
 account_name TEXT NOT NULL,
 token_digest TEXT NOT NULL UNIQUE,
 iv TEXT,
 encrypted TEXT,
 enabled INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 last_polled_at INTEGER,
 last_success_at INTEGER,
 last_error TEXT,
 consecutive_failures INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gp_monitor_trades (
 account_id TEXT NOT NULL,
 side TEXT NOT NULL CHECK(side IN ('buys','sells')),
 trade_id INTEGER NOT NULL,
 item_id INTEGER NOT NULL,
 price INTEGER NOT NULL,
 quantity INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 purchased_at INTEGER NOT NULL,
 first_observed_at INTEGER NOT NULL,
 PRIMARY KEY(account_id,side,trade_id)
);
CREATE INDEX IF NOT EXISTS idx_gp_monitor_trades_recent ON gp_monitor_trades(account_id,purchased_at);
CREATE TABLE IF NOT EXISTS gp_monitor_orders (
 account_id TEXT NOT NULL,
 side TEXT NOT NULL CHECK(side IN ('buys','sells')),
 order_id INTEGER NOT NULL,
 item_id INTEGER NOT NULL,
 price INTEGER NOT NULL,
 remaining INTEGER NOT NULL,
 first_seen_at INTEGER NOT NULL,
 last_changed_at INTEGER NOT NULL,
 closed_at INTEGER,
 PRIMARY KEY(account_id,side,order_id)
);
CREATE INDEX IF NOT EXISTS idx_gp_monitor_orders_live ON gp_monitor_orders(account_id,closed_at);
CREATE TABLE IF NOT EXISTS gp_monitor_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 account_id TEXT NOT NULL,
 event_key TEXT NOT NULL,
 kind TEXT NOT NULL,
 side TEXT NOT NULL,
 order_id INTEGER NOT NULL,
 item_id INTEGER NOT NULL,
 price INTEGER NOT NULL,
 quantity INTEGER NOT NULL,
 observed_at INTEGER NOT NULL,
 previous_remaining INTEGER,
 new_remaining INTEGER,
 UNIQUE(account_id,event_key)
);
CREATE INDEX IF NOT EXISTS idx_gp_monitor_events_account ON gp_monitor_events(account_id,id);
CREATE INDEX IF NOT EXISTS idx_gp_monitor_events_order ON gp_monitor_events(account_id,side,order_id,observed_at);
CREATE TABLE IF NOT EXISTS gp_monitor_polls (
 account_id TEXT NOT NULL,
 polled_at INTEGER NOT NULL,
 buy_count INTEGER NOT NULL,
 sell_count INTEGER NOT NULL,
 PRIMARY KEY(account_id,polled_at)
);
CREATE TABLE IF NOT EXISTS gp_monitor_nights (
 account_id TEXT NOT NULL,
 night TEXT NOT NULL,
 side TEXT NOT NULL,
 order_id INTEGER NOT NULL,
 item_id INTEGER NOT NULL,
 filled INTEGER NOT NULL,
 observed_polls INTEGER NOT NULL,
 window_start INTEGER NOT NULL,
 window_end INTEGER NOT NULL,
 PRIMARY KEY(account_id,night,side,order_id)
);
CREATE INDEX IF NOT EXISTS idx_gp_monitor_nights_item ON gp_monitor_nights(account_id,item_id,night);

-- Additive CE-002 migration. One bounded JSON batch per poll, not one D1
-- write per unchanged order. Private and append-only; never public price data.
CREATE TABLE IF NOT EXISTS gp_monitor_exposure (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 account_id TEXT NOT NULL,
 observed_at INTEGER NOT NULL,
 payload TEXT NOT NULL,
 UNIQUE(account_id,observed_at)
);
CREATE INDEX IF NOT EXISTS idx_gp_monitor_exposure_account ON gp_monitor_exposure(account_id,id);
