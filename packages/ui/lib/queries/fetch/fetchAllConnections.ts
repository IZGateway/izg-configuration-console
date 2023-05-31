import { gql } from '@apollo/client'

export const FETCH_ALL_DESTINATIONS = gql`
  query {
    allDestinations {
      dest_id
      dest_uri
      dest_version
      signed_mou
      dest_type {
        type
      }
      jurisdiction {
        description
        name
      }
      status {
        status
        detail
        diagnostics
        retry_strategy
        ran_at
      }
    }
  }
`
