//import { endpointstatus } from "@prisma/client";
import { gql } from "apollo-server";
import { DateTimeTypeDefinition, DateTimeResolver } from "graphql-scalars";
import GraphQLJSON, { GraphQLJSONObject } from "graphql-type-json";
import { Context } from "./context";
import { IZG_STATUS_UPDATE_POLL_RATE } from "./server";

const MAX_STATUS_HISTORY_RETURNED =
  parseInt(<string>process.env.IZG_MAX_STATUS_HISTORY_RETURNED) || 20;

export const typeDefs = [
  DateTimeTypeDefinition,
  gql`
    scalar JSON
    scalar JSONObject

    type Destination {
      dest_id: String
      dest_uri: String
      dest_type: DestinationType!
      dest_version: String
      username: String
      password: String
      signed_mou: Boolean
      jurisdiction: Jurisdiction
      status: EndpointStatus
      facility_id: String
      MSH3: String
      MSH4: String
      MSH5: String
      MSH6: String
      MSH22: String
      RXA11: String
    }

    type DestinationType {
      type_id: Int
      type: String
    }

    type EndpointStatus {
      id: Int
      status: String
      detail: String
      retry_strategy: String
      diagnostics: String
      dest_id: String
      ran_at: DateTime
    }

    type Jurisdiction {
      name: String
      description: String
      dest_id: String
    }

    type StatusHistoryInterval {
      historyInterval: String
    }

    type AuditHistory {
      id: Int
      tableName: String
      userName: String
      changeType: String
      oldValues: JSONObject
      newValues: JSONObject
      createdAt: DateTime
    }

    input DestinationUpdateInput {
      username: String
      password: String
      facility_id: String
    }

    type Query {
      allDestinations: [Destination]!
      allAudit: [AuditHistory]!
      destinationById(dest_id: String!): Destination!
      endpointStatusHistoryByDestId(dest_id: String!): [EndpointStatus]!
      statusHistoryInterval: StatusHistoryInterval!
      auditBydestIdByUser(
        dest_id: String!
        table: String!
        user: String!
      ): [AuditHistory]!
    }

    type Mutation {
      createJurisdiction(
        name: String!
        description: String
        dest_id: String
      ): Jurisdiction!
      updateDestination(
        data: DestinationUpdateInput!
        dest_id: String!
      ): Destination!
    }
  `,
];
///createJurisdiction is added only for an example of create mutation
export const resolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  DateTime: DateTimeResolver,
  Query: {
    allDestinations: (_parent: any, _args: any, context: Context) => {
      return context.prisma.destinations.findMany();
    },
    allAudit: (_parent: any, _args: any, context: Context) => {
      return context.prisma.audit_history.findMany();
    },
    destinationById: (
      _parent: any,
      _args: { dest_id: string },
      context: Context
    ) => {
      return context.prisma.destinations.findUnique({
        where: { dest_id: _args.dest_id },
      });
    },
    auditBydestIdByUser: (
      _parent: any,
      _args: { dest_id: string; table: string; user: string },
      context: Context
    ) => {
      return context.prisma.audit_history.findMany({
        where: {
          tableName: _args.table,
          userName: _args.user,
          oldValues: {
            path: "$.dest_id",
            equals: _args.dest_id,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    endpointStatusHistoryByDestId: (
      _parent: any,
      _args: any,
      context: Context
    ) => {
      return context.prisma.endpointstatus.findMany({
        take: MAX_STATUS_HISTORY_RETURNED,
        where: { dest_id: _args.dest_id },
        orderBy: { ran_at: "desc" },
      });
    },
    statusHistoryInterval: () => {
      return {};
    },
  },
  Destination: {
    dest_type: (_parent: any, _args: any, context: Context) => {
      return context.prisma.destination_type.findUnique({
        where: { type_id: _parent?.dest_type || undefined },
      });
    },
    jurisdiction: (_parent: any, _args: any, context: Context) => {
      return context.prisma.jurisdiction.findFirst({
        where: { dest_id: _parent?.dest_id },
      });
    },
    status: async (_parent: any, _args: any, context: Context) => {
      const thisStauts = await context.prisma.$queryRaw<
        any[]
      >`SELECT n.id, n.status, n.detail, n.retry_strategy, n.diagnostics, n.dest_id, n.ran_at 
        FROM endpointstatus n 
          INNER JOIN (
            SELECT dest_id, MAX(ran_at) as ran_at
            FROM endpointstatus 
            WHERE dest_id = ${_parent?.dest_id}
            GROUP BY dest_id
          ) AS max USING (dest_id, ran_at);`;
      return thisStauts[0];
    },
  },
  StatusHistoryInterval: {
    historyInterval: () => {
      return IZG_STATUS_UPDATE_POLL_RATE;
    },
  },
  Mutation: {
    createJurisdiction: async (_parent: any, _args: any, context: Context) => {
      const jurisdiction = await context.prisma.jurisdiction.create({
        data: {
          name: _args.name,
          description: _args.description,
          dest_id: _args.dest_id,
        },
      });
      return jurisdiction;
    },
    updateDestination: async (_parent: any, _args: any, context: Context) => {
      const destination = await context.prisma.destinations.update({
        where: { dest_id: _args.dest_id },
        data: _args.data,
      });
      return destination;
    },
  },
};
