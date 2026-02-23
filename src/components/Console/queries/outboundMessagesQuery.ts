/**
 * Builds the Elasticsearch query for Outbound message metrics
 * @param selectedConnection - The destination FIPS code to filter by
 * @param principalNames - Optional array of principal names to filter by
 * @returns The Elasticsearch query object
 */
export const buildOutboundMetricsQuery = (
  selectedConnection: string,
  principalNames?: string[]
): Record<string, unknown> => {
  const now = new Date()

  const filters: Record<string, unknown>[] = [
    {
      bool: {
        should: [
          {
            term: {
              'transactionData.destination.fips.keyword': {
                value: selectedConnection.toUpperCase(),
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    {
      match_phrase: {
        'tags.keyword': process.env.NEXT_PUBLIC_ELASTIC_ENV_TAG || 'dev',
      },
    },
    {
      range: {
        '@timestamp': {
          gt: 'now-24h',
          lte: now,
        },
      },
    },
  ]

  // Add principal names filter if specified
  if (principalNames && principalNames.length > 0) {
    filters.push({
      terms: {
        'transactionData.source.commonName.keyword': principalNames,
      },
    })
  }

  return {
    query: {
      bool: {
        must: [],
        filter: filters,
        should: [],
        must_not: [],
      },
    },
    aggs: {
      '0': {
        filters: {
          filters: {
            'Last 24h': {
              bool: {
                must: [],
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            '@timestamp': {
                              gte: 'now-24h',
                            },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          },
        },
        aggs: {
          '1-bucket': {
            filter: {
              bool: {
                must: [],
                filter: [
                  {
                    bool: {
                      filter: [
                        {
                          bool: {
                            should: [
                              {
                                term: {
                                  'transactionData.messageType.keyword': {
                                    value: 'submitSingleMessage',
                                  },
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [
                              {
                                match: {
                                  'transactionData.hasProcessError': false,
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          },
          '2-bucket': {
            filter: {
              bool: {
                must: [],
                filter: [
                  {
                    bool: {
                      filter: [
                        {
                          bool: {
                            should: [
                              {
                                term: {
                                  'transactionData.messageType.keyword': {
                                    value: 'submitSingleMessage',
                                  },
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                        {
                          bool: {
                            should: [
                              {
                                match: {
                                  'transactionData.hasProcessError': true,
                                },
                              },
                            ],
                            minimum_should_match: 1,
                          },
                        },
                      ],
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          },
          '3-bucket': {
            filter: {
              bool: {
                must: [],
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          term: {
                            'transactionData.messageType.keyword': {
                              value: 'submitSingleMessage',
                            },
                          },
                        },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
            aggs: {
              '3-metric': {
                percentiles: {
                  field: 'transactionData.elapsedTimeIIS',
                  percents: [50],
                },
              },
            },
          },
        },
      },
    },
    size: 0,
  }
}

/**
 * Builds the Elasticsearch query for Outbound message errors/failures
 * @param selectedConnection - The destination FIPS code to filter by
 * @param principalNames - Optional array of principal names to filter by
 * @returns The Elasticsearch query object
 */
export const buildOutboundErrorsQuery = (
  selectedConnection: string,
  principalNames?: string[]
): Record<string, unknown> => {
  const now = new Date()

  const filters: Record<string, unknown>[] = [
    {
      bool: {
        should: [
          {
            term: {
              'transactionData.destination.fips.keyword': {
                value: selectedConnection.toUpperCase(),
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    {
      match_phrase: {
        'tags.keyword': process.env.NEXT_PUBLIC_ELASTIC_ENV_TAG || 'dev',
      },
    },
    {
      term: {
        'transactionData.messageType.keyword': {
          value: 'submitSingleMessage',
        },
      },
    },
    {
      match: {
        'transactionData.hasProcessError': true,
      },
    },
    {
      range: {
        '@timestamp': {
          gt: 'now-24h',
          lte: now,
        },
      },
    },
  ]

  // Add principal names filter if specified
  if (principalNames && principalNames.length > 0) {
    filters.push({
      terms: {
        'transactionData.source.commonName.keyword': principalNames,
      },
    })
  }

  return {
    query: {
      bool: {
        must: [],
        filter: filters,
        should: [],
        must_not: [],
      },
    },
    aggs: {
      '0': {
        terms: {
          field: 'transactionData.source.organization.keyword',
          order: {
            _count: 'desc',
          },
          size: 1000,
        },
        aggs: {
          '1': {
            filters: {
              filters: {
                'HTTP Errors (All)': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError': 'HTTP Response',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 400': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '400',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 403': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '403',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 404': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '404',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 408': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '408',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 500': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '500',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 502': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '502',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 503': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '503',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'HTTP 504': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          filter: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError':
                                        'HTTP Response',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              bool: {
                                should: [
                                  {
                                    match: {
                                      'transactionData.processError': '504',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                          ],
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'TLS Connection Error': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'SSL peer shut down incorrectly',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'TLS Certificate Unknown': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'certificate_unknown',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Read Timeout': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'read timed out',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Connect Timeout': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'connect timed out',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Connection Refused': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match: {
                                'transactionData.processError':
                                  'Connection refused',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Connection Reset': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Connection reset',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Hub Client Faults': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                processError:
                                  'Unable to invoke IIS destination web service',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'End of File/EOF': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              bool: {
                                should: [
                                  {
                                    match_phrase: {
                                      'transactionData.processError': 'EOF',
                                    },
                                  },
                                ],
                                minimum_should_match: 1,
                              },
                            },
                            {
                              multi_match: {
                                type: 'phrase',
                                query: 'end of file',
                                lenient: true,
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Authentication Failed': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Authentication Error',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Control Characters': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Illegal character',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'No Running Communication Point': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match: {
                                'transactionData.processError':
                                  'No running communication point',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'General Failure': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError': 'General',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Circuit Breaker Thrown': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match: {
                                'transactionData.processError':
                                  'Circuit Breaker Thrown',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Under Maintenance': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Under Maintenance',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Source Attack Exception': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Source Attack Exception',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Invalid Response': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Invalid Response',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
                'Response Message Too Large': {
                  bool: {
                    must: [],
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'transactionData.processError':
                                  'Response Message Too Large',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
              },
            },
          },
        },
      },
    },
    size: 0,
  }
}

/**
 * Builds the combined Elasticsearch query for Outbound message metrics and errors
 * @param selectedConnection - The destination FIPS code to filter by
 * @param principalNames - Optional array of principal names to filter by
 * @returns The Elasticsearch query object with both metrics and error aggregations
 */
export const buildOutboundCombinedQuery = (
  selectedConnection: string,
  principalNames?: string[]
): Record<string, unknown> => {
  const now = new Date()

  const filters: Record<string, unknown>[] = [
    {
      bool: {
        should: [
          {
            term: {
              'transactionData.destination.fips.keyword': {
                value: selectedConnection.toUpperCase(),
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    {
      match_phrase: {
        'tags.keyword': process.env.NEXT_PUBLIC_ELASTIC_ENV_TAG || 'dev',
      },
    },
    {
      term: {
        'transactionData.messageType.keyword': {
          value: 'submitSingleMessage',
        },
      },
    },
    {
      range: {
        '@timestamp': {
          gt: 'now-24h',
          lte: now,
        },
      },
    },
  ]

  // Add principal names filter if specified
  if (principalNames && principalNames.length > 0) {
    filters.push({
      terms: {
        'transactionData.source.commonName.keyword': principalNames,
      },
    })
  }

  return {
    query: {
      bool: {
        must: [],
        filter: filters,
        should: [],
        must_not: [],
      },
    },
    aggs: {
      // Metrics aggregations (time-based) - extract the '0' aggregation
      metrics: buildOutboundMetricsQuery(selectedConnection, principalNames)
        .aggs['0'],
      // Error aggregations (organization-based) - wrapped in filter for hasProcessError
      errors: {
        filter: {
          match: {
            'transactionData.hasProcessError': true,
          },
        },
        aggs: {
          organizations: buildOutboundErrorsQuery(
            selectedConnection,
            principalNames
          ).aggs['0'],
        },
      },
    },
    size: 0,
  }
}

export const ELASTICSEARCH_INDEX =
  process.env.NEXT_PUBLIC_ELASTIC_INDEX || 'izgw-dev-logstash'

export const ELASTICSEARCH_API_ENDPOINT = '/api/elasticsearch/query'
