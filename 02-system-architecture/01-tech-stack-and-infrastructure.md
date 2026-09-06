# System Architecture & Technology Stack (Full-Stack TypeScript)

## 1. Architectural Blueprint

```
+-------------------------------------------------------------------------------+
|                      SHARED MONOREPO TYPESCRIPT CORE                          |
|         (@local-os/types  •  @local-os/schema  •  @local-os/validation)       |
+-------------------------------------------------------------------------------+
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
+------------------------------------+                    +---------------------+
|    REACT NATIVE + EXPO (MOBILE)    |                    |   NEXT.JS (WEB)     |
|  - SQLite (On-Device Local DB)     |                    |  - App Router       |
|  - Offline Background Sync Queue   |                    |  - Owner Analytics  |
|  - Bluetooth Thermal Printer SDK   |                    |  - Multi-Branch     |
|  - Camera Barcode & Voice Engine   |                    |  - Subscriptions    |
+------------------------------------+                    +---------------------+
                   │                                                 │
                   └─────────────────────────┬───────────────────────┘
                                             │ (REST API / JWT Token)
                                             ▼
+-------------------------------------------------------------------------------+
|                       BACKEND API SERVICE (NODE.JS + TS)                      |
|  +--------------------------------------------------------------------------+ |
|  |                 Fastify / NestJS High-Throughput API Engine              | |
|  |  - Tenant Scoping & Logical Data Isolation Middleware                    | |
|  |  - Idempotent Sync Ingestion & Conflict Resolution Engine                | |
|  |  - Drizzle ORM (Type-Safe Query Builder)                                 | |
|  +--------------------------------------------------------------------------+ |
+-------------------------------------------------------------------------------+
                 │                                             │
                 ▼                                             ▼
+---------------------------------+          +----------------------------------+
|      REDIS + BULLMQ ENGINE      |          |       POSTGRESQL DATABASE        |
|  - Offline Sync Batch Workers   |          |  - Row-Level Tenant Isolation    |
|  - SMS / WhatsApp Notifications |          |  - Fast JSONB Category Schema    |
|  - Rate Limiting & Fast Cache   |          |  - ACID Financial Ledger Balance |
+---------------------------------+          +----------------------------------+
```

---

## 2. Core Stack Selection Rationale

| Layer | Selected Technology | Strategic Rationale |
|---|---|---|
| **Language** | **100% TypeScript (End-to-End)** | Shared types, Zod schemas, and data contracts between Mobile, Web, and Backend. Zero duplication bugs. |
| **Mobile App** | **React Native + Expo** | Single codebase for Android/iOS, native Bluetooth hardware integration (printers/scanners), powerful SQLite offline engine. |
| **Web Portal** | **Next.js (React 19)** | Instant dashboard load speeds, server-side data analytics for store owners, sleek responsive UI. |
| **Backend API** | **Fastify / NestJS (TypeScript)** | Extremely fast, non-blocking I/O handling tens of thousands of concurrent offline sync requests on minimal RAM. |
| **ORM** | **Drizzle ORM** | Maximum SQL performance, zero runtime overhead, 100% type-safe multi-tenant query building. |
| **Database** | **PostgreSQL 16** | Robust relational integrity, JSONB support for dynamic category attributes, and rock-solid ACID transactions. |
| **Offline Storage** | **SQLite (Mobile)** | Zero-latency local transactions, zero data loss during network dropouts. |
| **Job & Queue** | **Redis + BullMQ** | Non-blocking background sync ingestion, asynchronous SMS notifications, fast cache. |
| **Hosting & Infra** | **Docker on VPS (Hetzner / DigitalOcean)** | Cost-efficient scaling starting at $10/mo with automated daily offsite S3 backups. |
