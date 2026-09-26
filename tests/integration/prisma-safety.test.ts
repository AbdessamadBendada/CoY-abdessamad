import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url || !/(test|testing|coy_test)/i.test(url) || /(prod|production|staging)/i.test(url)) throw new Error("Integration tests require a positively identified test database");
const db = new PrismaClient({ datasourceUrl: url });
let sequence = 0;
const id = () => `test-${Date.now()}-${sequence++}`;
async function tenant() { const suffix = id(); return db.tenant.create({ data: { name: suffix, slug: suffix, email: `${suffix}@example.test` } }); }

beforeEach(async () => { await db.order.deleteMany(); await db.customer.deleteMany(); await db.user.deleteMany(); await db.integration.deleteMany(); await db.tenant.deleteMany(); });
afterAll(async () => { await db.$disconnect(); });

describe("real PostgreSQL tenant and idempotency constraints", () => {
  it("enforces tenant-scoped external order identity and cascades customer data", async () => {
    const a = await tenant(); const b = await tenant();
    const customerA = await db.customer.create({ data: { tenantId: a.id, email: "buyer@example.test", externalId: "customer-1" } });
    const customerB = await db.customer.create({ data: { tenantId: b.id, email: "buyer@example.test", externalId: "customer-1" } });
    await db.order.create({ data: { tenantId: a.id, customerId: customerA.id, externalId: "order-1", source: "SHOPIFY", amount: 10, orderedAt: new Date() } });
    await expect(db.order.create({ data: { tenantId: a.id, customerId: customerA.id, externalId: "order-1", source: "SHOPIFY", amount: 10, orderedAt: new Date() } })).rejects.toThrow();
    await db.order.create({ data: { tenantId: b.id, customerId: customerB.id, externalId: "order-1", source: "SHOPIFY", amount: 10, orderedAt: new Date() } });
    await db.customer.delete({ where: { id: customerA.id } });
    expect(await db.order.count({ where: { tenantId: a.id } })).toBe(0);
    expect(await db.order.count({ where: { tenantId: b.id } })).toBe(1);
  });

  it("atomically permits only one scoring claim", async () => {
    const t = await tenant(); const customer = await db.customer.create({ data: { tenantId: t.id, email: "claim@example.test", lastOrderAt: new Date() } });
    const now = new Date();
    const [one, two] = await Promise.all([db.customer.updateMany({ where: { id: customer.id, tenantId: t.id, scoringClaimedAt: null }, data: { scoringClaimedAt: now, scoringAttempts: { increment: 1 } } }), db.customer.updateMany({ where: { id: customer.id, tenantId: t.id, scoringClaimedAt: null }, data: { scoringClaimedAt: now, scoringAttempts: { increment: 1 } } })]);
    expect(one.count + two.count).toBe(1);
    expect((await db.customer.findUniqueOrThrow({ where: { id: customer.id } })).scoringAttempts).toBe(1);
  });
});
