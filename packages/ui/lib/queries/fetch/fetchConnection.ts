import { gql } from "@apollo/client";

export const FETCH_DESTINATION = gql`
  query DestinationById($destId: String!) {
    destinationById(dest_id: $destId) {
      dest_id
      dest_type {
        type
      }
      dest_uri
      dest_version
      username
      password
      jurisdiction {
        description
      }
      facility_id
      MSH3
      MSH4
      MSH5
      MSH6
      MSH22
      RXA11
      status {
        status
      }
    }
  }
`;
