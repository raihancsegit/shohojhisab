# Multi-Tenant Architecture & Data Isolation (Drizzle ORM)

## 1. Multi-Tenancy Design Pattern: Logical Tenant Isolation (Shared Database, Isolated Schemas)

Every entity in the database is strictly partitioned by `tenant_id` (UUID). In our TypeScript backend with **Drizzle ORM**, tenant scoping is enforced at the repository and middleware layer:

```typescript
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { products, orders, customers } from '../db/schema';

// Multi-tenant scoped query helper
export function withTenant(tenantId: string) {
  return {
    getProducts: async () => {
      return await db.select().from(products).where(eq(products.tenantId, tenantId));
    },
    
    getCustomerById: async (customerId: string) => {
      return await db.query.customers.findFirst({
        where: and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
      });
    },

    createOrder: async (orderData: typeof orders.$inferInsert) => {
      // Guaranteed tenant isolation on write
      return await db.insert(orders).values({
        ...orderData,
        tenantId, // Injected from verified JWT context
      }).returning();
    }
  };
}
```

---

## 2. Role-Based Access Control (RBAC) per Tenant

```
Tenant (Business Owner)
├── Manager (Branch Level Access: Full Sales, Purchase, Stock Adjustments)
├── Cashier / Sales Staff (Limited: Create Sales, View Prices, Record Cash, No Edit Costs)
└── Delivery / Field Boy (Collect Dues, View Delivery Slips)
```
