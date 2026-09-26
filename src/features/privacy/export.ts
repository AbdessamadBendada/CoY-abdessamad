import type { PrismaClient } from "@prisma/client";

/** Tenant-scoped, expiring export. Never contains integration credentials. */
export async function createPrivacyExport(prisma: PrismaClient, tenantId: string, customerId: string, requestKey: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, include: { orders: true, actions: true, conversations: { include: { messages: true } } } });
  if (!customer) throw new Error("Customer not found in tenant");
  const payload = {
    exportedAt: new Date().toISOString(), customer: { id: customer.id, externalId: customer.externalId, email: customer.email, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone, optedOutAt: customer.optedOutAt, createdAt: customer.createdAt, updatedAt: customer.updatedAt, churnScore: customer.churnScore, churnRisk: customer.churnRisk, lastScoredAt: customer.lastScoredAt },
    orders: customer.orders.map(({ id, ...order }) => ({ id, ...order })),
    winbackActions: customer.actions.map((action) => ({ id: action.id, type: action.type, status: action.status, subject: action.subject, content: action.content, channel: action.channel, scheduledAt: action.scheduledAt, sentAt: action.sentAt, deliveredAt: action.deliveredAt, openedAt: action.openedAt, clickedAt: action.clickedAt, createdAt: action.createdAt })),
    conversations: customer.conversations.map((conversation) => ({ id: conversation.id, externalId: conversation.externalId, source: conversation.source, subject: conversation.subject, status: conversation.status, sentimentScore: conversation.sentimentScore, sentimentLabel: conversation.sentimentLabel, createdAt: conversation.createdAt, messages: conversation.messages })),
  };
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return prisma.privacyExport.upsert({ where: { requestKey }, create: { tenantId, customerId, requestKey, payload, expiresAt }, update: { payload, expiresAt, downloadedAt: null } });
}
