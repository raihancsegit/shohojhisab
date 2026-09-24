const Database = require('better-sqlite3');
const db = new Database('./local-business-os.db');

db.exec(`
  DROP TABLE IF EXISTS dealer_supply_items;
  DROP TABLE IF EXISTS dealer_supplies;

  CREATE TABLE dealer_supplies (
    id TEXT PRIMARY KEY,
    dealer_id TEXT NOT NULL,
    dealer_name TEXT NOT NULL,
    dealer_phone TEXT,
    tenant_id TEXT NOT NULL,
    shop_name TEXT,
    challan_no TEXT NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    due_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status TEXT NOT NULL DEFAULT 'delivered',
    note TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE dealer_supply_items (
    id TEXT PRIMARY KEY,
    supply_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    category TEXT,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'পিস',
    purchase_price REAL NOT NULL,
    selling_price REAL,
    total_price REAL NOT NULL,
    FOREIGN KEY (supply_id) REFERENCES dealer_supplies(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_dealer_supplies_tenant ON dealer_supplies(tenant_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_dealer_supplies_dealer ON dealer_supplies(dealer_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_dealer_supply_items_supply ON dealer_supply_items(supply_id);
`);

console.log('Dealer supply tables created fresh and clean!');
