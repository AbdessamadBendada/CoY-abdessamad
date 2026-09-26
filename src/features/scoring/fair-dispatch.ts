export type TenantWork<T> = { tenantId: string; items: T[] };

/**
 * Interleave one item per tenant at a time. This is intentionally small and
 * deterministic: a large tenant cannot fill the front of the worker queue.
 */
export function roundRobin<T>(work: TenantWork<T>[], limit: number): T[] {
  const output: T[] = [];
  const longest = Math.max(0, ...work.map(({ items }) => items.length));

  for (let index = 0; index < longest && output.length < limit; index++) {
    for (const { items } of work) {
      const item = items[index];
      if (item !== undefined) output.push(item);
      if (output.length === limit) break;
    }
  }

  return output;
}

export function rotateAfter<T extends { id: string }>(
  sorted: T[],
  afterId: string | null,
  limit: number,
): T[] {
  if (sorted.length === 0 || limit <= 0) return [];
  const start = afterId ? Math.max(0, sorted.findIndex(({ id }) => id > afterId)) : 0;
  const rotated = [...sorted.slice(start), ...sorted.slice(0, start)];
  return rotated.slice(0, limit);
}
