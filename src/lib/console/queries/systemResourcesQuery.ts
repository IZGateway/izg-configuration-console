/**
 * The Home "System Resources" (status report) query: hub-wide host metrics
 * over the last 24 hours. Built on the server so /api/elasticsearch/query runs
 * only this fixed query and never a caller-supplied one (IGDD-3474).
 *
 * `size: 0` returns aggregations only — no log documents — which is what makes
 * it safe to serve to every signed-in role.
 */
export const buildSystemResourcesQuery = (
  now: Date = new Date()
): Record<string, unknown> => {
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  return {
    size: 0,
    query: {
      range: {
        '@timestamp': {
          gte: start,
          lte: now.toISOString(),
        },
      },
    },
    aggs: {
      cpu: { avg: { field: 'system.cpu.total.pct' } },
      memory: { avg: { field: 'system.memory.actual.used.pct' } },
      disk: { avg: { field: 'system.filesystem.used.pct' } },
      connections: {
        max: {
          field: 'system.socket.summary.tcp.all.established',
          missing: 0,
        },
      },
    },
  }
}
