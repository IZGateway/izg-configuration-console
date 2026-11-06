/** How many documented operations use the given HTTP method (e.g. 'get'). */
export function countOperations(
  spec: Record<string, any>,
  method: string
): number {
  return Object.values(spec.paths ?? {}).filter(
    (pathItem) => (pathItem as Record<string, any>)[method]
  ).length
}
