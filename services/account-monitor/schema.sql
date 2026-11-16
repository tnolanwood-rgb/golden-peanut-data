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

-- Additive protocol v2. Existing credentials, trades, learning and public data
-- remain intact. Both writers must use this protocol before resuming schedules.
CREATE TABLE IF NOT EXISTS gp_monitor_leases (
 account_id TEXT PRIMARY KEY,
 owner TEXT NOT NULL,
 expires_at INTEGER NOT NULL
);
-- Atomic trade/event and order/event pairs survive interruption between HTTP
-- requests. No historic rows are reinterpreted or backfilled by these triggers.
CREATE TRIGGER IF NOT EXISTS gp_monitor_trade_insert_event
AFTER INSERT ON gp_monitor_trades
BEGIN
 INSERT OR IGNORE INTO gp_monitor_events(account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at)
 VALUES(NEW.account_id,'trade:'||NEW.side||':'||NEW.trade_id||':'||NEW.quantity,'trade',NEW.side,NEW.trade_id,NEW.item_id,NEW.price,NEW.quantity,NEW.first_observed_at);
END;
CREATE TRIGGER IF NOT EXISTS gp_monitor_trade_update_event
AFTER UPDATE OF quantity ON gp_monitor_trades WHEN NEW.quantity>OLD.quantity
BEGIN
 INSERT OR IGNORE INTO gp_monitor_events(account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at)
 VALUES(NEW.account_id,'trade:'||NEW.side||':'||NEW.trade_id||':'||NEW.quantity,'trade',NEW.side,NEW.trade_id,NEW.item_id,NEW.price,NEW.quantity-OLD.quantity,CAST(strftime('%s','now') AS INTEGER)*1000);
END;
CREATE TRIGGER IF NOT EXISTS gp_monitor_order_update_event
AFTER UPDATE OF remaining,item_id,price ON gp_monitor_orders
WHEN NEW.remaining<>OLD.remaining OR NEW.item_id<>OLD.item_id OR NEW.price<>OLD.price
BEGIN
 INSERT OR IGNORE INTO gp_monitor_events(account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at,previous_remaining,new_remaining)
 VALUES(NEW.account_id,'order:'||NEW.side||':'||NEW.order_id||':'||OLD.last_changed_at||':'||OLD.remaining||':'||NEW.remaining||':'||NEW.item_id||':'||NEW.price,
 CASE WHEN NEW.item_id=OLD.item_id AND NEW.price=OLD.price AND NEW.remaining<OLD.remaining THEN 'partial' ELSE 'changed_unknown' END,
 NEW.side,NEW.order_id,NEW.item_id,NEW.price,CASE WHEN NEW.item_id=OLD.item_id AND NEW.price=OLD.price AND NEW.remaining<OLD.remaining THEN OLD.remaining-NEW.remaining ELSE 0 END,NEW.last_changed_at,OLD.remaining,NEW.remaining);
END;
CREATE TRIGGER IF NOT EXISTS gp_monitor_order_close_event
AFTER UPDATE OF closed_at ON gp_monitor_orders WHEN OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL
BEGIN
 INSERT OR IGNORE INTO gp_monitor_events(account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at,previous_remaining,new_remaining)
 VALUES(NEW.account_id,'closed:'||NEW.side||':'||NEW.order_id||':'||NEW.closed_at,'disappeared_unknown',NEW.side,NEW.order_id,NEW.item_id,NEW.price,0,NEW.closed_at,OLD.remaining,0);
END;
-- A disable request invalidates every already-in-flight enrolment. A global
-- generation is intentionally conservative: another account may need to retry,
-- but an earlier consent request can never undo a later opt-out.
CREATE TABLE IF NOT EXISTS gp_monitor_consent_epoch (
 id INTEGER PRIMARY KEY CHECK(id=1),
 generation INTEGER NOT NULL
);
INSERT OR IGNORE INTO gp_monitor_consent_epoch(id,generation) VALUES(1,0);
