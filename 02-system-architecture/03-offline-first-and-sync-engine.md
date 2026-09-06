# Offline-First & Data Sync Engine

## 1. The Offline-First Paradigm
In rural markets, internet connectivity drops frequently during power outages (লোডশেডিং). The mobile application **must never block a sale** due to lack of network.

```mermaid
sequenceDiagram
    autonumber
    actor Shopkeeper
    participant App as Mobile App (React Native)
    participant SQLite as Local SQLite DB
    participant Queue as Offline Sync Queue
    participant Server as TypeScript API Server (Fastify)
    participant Postgres as Central PostgreSQL

    Shopkeeper->>App: Completes Sale (Barcode / Cash / Due)
    App->>SQLite: Insert Sale & Line Items
    App->>SQLite: Deduct Local Stock & Update Customer Ledger
    App->>Queue: Push Sync Payload (UUID, Timestamp, Hash)
    App-->>Shopkeeper: Instant Receipt / Success (0 Milliseconds Latency)

    Note over Queue,Server: When Internet Connection is Active
    Queue->>Server: POST /api/v1/sync/push (Batch Transactions)
    Server->>Postgres: Process Idempotently & Update Central Ledger via Drizzle
    Server-->>Queue: Acknowledge Processed UUIDs
    Queue->>SQLite: Mark Sync Status = 'synced'
```

---

## 2. Conflict Resolution Strategy (LWW + Sequence Clocks)
* **Master Records (Products / Customers):** Last-Write-Wins (LWW) based on verified UTC millisecond timestamps.
* **Transactional Records (Sales / Payments / Stock Deductions):** Append-only event ledger. Every sale event has a client-generated UUID `client_transaction_id`. The server processes each sync event idempotently using unique constraint checks.
