import { gql } from "@apollo/client";

export const STATUS_HISTORY = gql`
  query EndpointStatusHistoryByDestId($destId: String!) {
    endpointStatusHistoryByDestId(dest_id: $destId) {
      status
      ran_at
      id
    }
    statusHistoryInterval {
      historyInterval
    }
  }
`;
