import { gql } from "@apollo/client";

export const AUDIT_TRAIL = gql`
  query AuditBydestIdByUser($destId: String!, $table: String!, $user: String!) {
    auditBydestIdByUser(dest_id: $destId, table: $table, user: $user) {
      id
      tableName
      userName
      changeType
      oldValues
      newValues
      createdAt
    }
  }
`;
