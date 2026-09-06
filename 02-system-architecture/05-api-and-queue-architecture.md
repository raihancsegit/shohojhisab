# API & Queue Architecture (TypeScript & BullMQ)

## 1. Core REST Endpoints Specification

### Authentication & Tenant
* `POST /api/v1/auth/register` — Register shop with business category & phone OTP.
* `POST /api/v1/auth/login` — Token issuance with user permissions & branch scoping.
* `GET /api/v1/tenant/profile` — Active plan, store category & settings.

### Offline Sync Engine
* `POST /api/v1/sync/push` — Batch sync offline sales, customer dues, stock movements.
* `GET /api/v1/sync/pull` — Incremental delta changes since `last_sync_timestamp`.

### Sales & POS
* `POST /api/v1/sales` — Create instant sale with automatic stock deduction & ledger entry.
* `GET /api/v1/products/search?q={barcode|name}` — Fast indexed product search.

---

## 2. Background Queue Processing (Redis + BullMQ)

```typescript
import { Queue, Worker } from 'bullmq';

// Queues configuration
export const syncQueue = new Queue('offline-sync-queue', { connection: redisConfig });
export const smsQueue = new Queue('sms-notification-queue', { connection: redisConfig });
export const ocrQueue = new Queue('invoice-ocr-queue', { connection: redisConfig });

// Worker processing offline batch sales
export const syncWorker = new Worker('offline-sync-queue', async (job) => {
  const { tenantId, batchEvents } = job.data;
  await processBatchSyncEvents(tenantId, batchEvents);
}, { connection: redisConfig });
```
