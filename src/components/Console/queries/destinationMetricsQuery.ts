/**
 * Builds the Elasticsearch query for destination metrics
 * @param selectedConnection - The destination FIPS code to filter by
 * @returns The Elasticsearch query object
 */
export const buildDestinationMetricsQuery = (selectedConnection: string) => {
  const now = new Date()

  return {
    query: {
      bool: {
        must: [],
        filter: [
          {
            match_phrase: {
              'tags.keyword': 'dev',
            },
          },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gte: 'now-48h',
                lte: now.toISOString(),
              },
            },
          },
          {
            term: {
              'transactionData.destination.fips.keyword':
                selectedConnection.toUpperCase(),
            },
          },
        ],
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
                              time_zone: 'America/New_York',
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
            'Previous 24h': {
              bool: {
                must: [],
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          range: {
                            '@timestamp': {
                              gte: 'now-48h',
                              lte: 'now-24h',
                              time_zone: 'America/New_York',
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
          // Connectivity Test - Errors
          '1-bucket': {
            filter: {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          term: {
                            'transactionData.messageType.keyword': {
                              value: 'connectivityTest',
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
          },
          // Connectivity Test - Success
          '2-bucket': {
            filter: {
              bool: {
                filter: [
                  {
                    bool: {
                      should: [
                        {
                          term: {
                            'transactionData.messageType.keyword': {
                              value: 'connectivityTest',
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
          },
          // HL7 Messages - Success
          '3-bucket': {
            filter: {
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
          },
          // HL7 Messages - Errors
          '4-bucket': {
            filter: {
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
          },
          // Response time percentiles
          'median-response-time': {
            percentiles: {
              field: 'transactionData.elapsedTimeIIS',
              percents: [50],
            },
          },
          '95-response-time': {
            percentiles: {
              field: 'transactionData.elapsedTimeIIS',
              percents: [95],
            },
          },
          // Hourly throughput for peak calculation
          'hourly-throughput': {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1h',
            },
            aggs: {
              'hl7-messages': {
                filter: {
                  term: {
                    'transactionData.messageType.keyword':
                      'submitSingleMessage',
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

export const ELASTICSEARCH_INDEX = 'izgw-dev-logstash'
export const ELASTICSEARCH_API_ENDPOINT = '/api/elasticsearch/query'
