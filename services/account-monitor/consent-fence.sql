-- Fail-closed database fencing shared by Cloudflare Worker and GitHub collector.
-- These triggers are additive and idempotent. A /disable erasure may still DELETE.
-- Write statements started before opt-out cannot recreate rows after enabled=0.
-- They intentionally DO NOT trigger on credentials: explicit /enroll can re-consent.

CREATE TRIGGER IF NOT EXISTS gp_monitor_trades_insert_consent
BEFORE INSERT ON gp_monitor_trades
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_trades_update_consent
BEFORE UPDATE ON gp_monitor_trades
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_orders_insert_consent
BEFORE INSERT ON gp_monitor_orders
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_orders_update_consent
BEFORE UPDATE ON gp_monitor_orders
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_events_insert_consent
BEFORE INSERT ON gp_monitor_events
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_events_update_consent
BEFORE UPDATE ON gp_monitor_events
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_polls_insert_consent
BEFORE INSERT ON gp_monitor_polls
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_polls_update_consent
BEFORE UPDATE ON gp_monitor_polls
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_nights_insert_consent
BEFORE INSERT ON gp_monitor_nights
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;

CREATE TRIGGER IF NOT EXISTS gp_monitor_nights_update_consent
BEFORE UPDATE ON gp_monitor_nights
WHEN NOT EXISTS (
 SELECT 1 FROM gp_monitor_credentials WHERE account_id=NEW.account_id AND enabled=1
)
BEGIN
 SELECT RAISE(ABORT,'private_monitor_disabled');
END;
