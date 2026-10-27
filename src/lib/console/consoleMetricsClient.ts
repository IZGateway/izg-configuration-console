import type { ConsoleView } from './consoleMetrics'

export const CONSOLE_METRICS_ENDPOINT = '/api/console/metrics'

/** The literal the organization dropdowns use for "all organizations". */
export const ALL_ORGANIZATIONS = 'IZGateway'

export interface ConsoleMetricsParams {
  view: ConsoleView
  destId: string
  envTag?: string
  /** Dropdown value; `ALL_ORGANIZATIONS` is sent as "no organization filter". */
  organization?: string
}

/**
 * POST a console widget request. The server builds the Elasticsearch query and
 * applies the jurisdiction filter; this only names the view and selection.
 */
export const fetchConsoleMetrics = (
  { view, destId, envTag, organization }: ConsoleMetricsParams,
  signal?: AbortSignal
): Promise<Response> =>
  fetch(CONSOLE_METRICS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      view,
      destId,
      envTag,
      organization:
        organization && organization !== ALL_ORGANIZATIONS
          ? organization
          : undefined,
    }),
    signal,
  })
