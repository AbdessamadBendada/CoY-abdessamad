# Data retention

This is an operational policy proposal, not legal advice. Do not enable broader
deletion without owner/legal approval.

| Data type | Why it exists | Suggested retention | Treatment | Cleanup | Decision |
|---|---|---|---|---|---|
| Processed Stripe webhook IDs | Duplicate-event prevention | 90 days | Delete | `cleanup-processed-webhooks`, daily, 500 rows/run | Implemented operational rule |
| Unprocessed Stripe webhook IDs | Reliable billing processing | Until processed/investigated | Keep | None | Owner review if stuck |
| AuditLog and SecurityEvent | Security/accountability | 12–24 months | Keep or anonymize after policy | None | **OWNER / LEGAL DECISION REQUIRED** |
| Customers, orders, actions, messages | Product operation, commerce history, consent | Contract/legal basis dependent | Delete/anonymize through approved privacy workflow | Existing privacy paths only | **OWNER / LEGAL DECISION REQUIRED** |
| AI scoring details / Langfuse traces | Explainability and debugging | 90 days suggested | Delete/anonymize in provider policy | Configure Langfuse separately | **OWNER / LEGAL DECISION REQUIRED** |
| Integration sync errors / credentials metadata | Support and incident investigation | 90 days suggested | Keep error metadata; never retain decrypted credentials in logs | None | Owner decision |
| Background claims/retry metadata | Queue recovery | While active; clear on success | Keep active state | Cleared by workers | Implemented |

Before enabling any new deletion task, test it in staging, confirm a backup, and
record the owner/legal decision with a retention period.
