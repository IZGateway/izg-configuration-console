---
schema_version: '1.0'
created:
  date: '2026-07-23T17:58:14.924Z'
  user: boonek
  agent:
    name: GitHub Copilot CLI
    version: 1.0.73
  llm:
    name: claude-sonnet-4.6
    version: '4.6'
  prompt_uri: >-
    prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7ce8eeed-a5b8-4b57-a370-39b43a2db446
  source: 'src/lib/db/dynamo.ts, src/lib/type/*.ts'
  summary: DynamoDB entity ER diagram for izg-configuration-console
updated:
  - date: '2026-07-24T03:50:33.636Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~1fd82463-6919-435f-afd1-99125510681c
    summary: >-
      Multi-environment credential decision: environments list, sortKey
      primaryEnvId, JWT env claim
  - date: '2026-07-24T03:50:14.329Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~1fd82463-6919-435f-afd1-99125510681c
    summary: Update entity table note for environments list field
  - date: '2026-07-24T03:50:06.628Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~1fd82463-6919-435f-afd1-99125510681c
    summary: >-
      ApiKeyCredential.env -> environments (List) for multi-env admin
      credentials
  - date: '2026-07-24T02:57:47.294Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~44c547b5-a70e-45d5-bf8c-2a820919005f
    summary: >-
      Remove empty-allowedUseTypes safe-default framing — jurisdictions without
      use types wouldn't exist
  - date: '2026-07-24T02:53:51.327Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~12182fd1-6289-400c-b105-51a4443e80ce
    summary: Clear open questions — all resolved
  - date: '2026-07-24T02:53:42.573Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~12182fd1-6289-400c-b105-51a4443e80ce
    summary: >-
      Promote four resolved open questions to decisions:
      senderId=jurisdictionId, useTypes enum, 10-business-day grace period, DNS
      TXT domain verification
  - date: '2026-07-24T02:46:19.972Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7818a82e-cb9c-4ad4-b644-f77e6444684d
    summary: >-
      Restructure as proper design.md: Context, Goals/Non-Goals, Decisions,
      Risks, Open Questions
  - date: '2026-07-24T02:40:48.841Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~9bcd5694-1ea6-4239-81a4-00932e68c929
    summary: Remove outdated Design Notes (IGDD-3140) section from conceptual schema
  - date: '2026-07-24T02:35:54.586Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cac499e6-3866-427c-a78e-0bd20cfd1dff
    summary: Add use-type policy enforcement domain note
  - date: '2026-07-24T02:34:31.348Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~9b9e1c91-b008-414f-86fc-62abf494a11f
    summary: >-
      Add allowedUseTypes to Jurisdiction — jurisdictions control what
      credential purposes they permit
  - date: '2026-07-24T02:30:20.883Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8a6d2547-a881-43db-83e5-afefd243d9db
    summary: Add useTypes to ApiKeyCredential in conceptual schema
  - date: '2026-07-24T02:30:14.289Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8a6d2547-a881-43db-83e5-afefd243d9db
    summary: Add useTypes to Sender in conceptual schema
  - date: '2026-07-24T01:57:48.508Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~454e76bb-b62d-4122-9719-c740eae56e22
    summary: >-
      Rename Destination namespace to Destinations to avoid cycle with class
      name
  - date: '2026-07-24T01:57:10.601Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~454e76bb-b62d-4122-9719-c740eae56e22
    summary: Split Core namespace into Destination and Organizations namespaces
  - date: '2026-07-23T21:17:46.761Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~e69e0665-2774-44e1-a77d-c3f07c561973
    summary: Remove outdated Domain Notes; keep only AllowedUser entry
  - date: '2026-07-23T21:15:23.745Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~d6774672-051f-4993-bb72-37f009b542c6
    summary: Type destTypeId as Environment in EndpointStatus
  - date: '2026-07-23T21:14:33.655Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~a692ee4b-7e20-4a08-baba-0390eb1008d8
    summary: Remove legacy AccessControl entity from Hub-Managed Entities diagram
  - date: '2026-07-23T20:55:15.540Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~ebc6ccdf-7af1-4dd5-8657-2239e4d88f97
    summary: Merge DbAudit section text into one paragraph before diagram
  - date: '2026-07-23T20:53:13.998Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3177b90d-171b-4e49-aef9-597cb7a9e456
    summary: Type destType as Environment in DestinationChangeRequest
  - date: '2026-07-23T20:53:09.269Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3177b90d-171b-4e49-aef9-597cb7a9e456
    summary: Type destType as Environment in DestinationAudit
  - date: '2026-07-23T20:53:04.612Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3177b90d-171b-4e49-aef9-597cb7a9e456
    summary: Type destTypeId as Environment in Destination
  - date: '2026-07-23T20:51:29.202Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f80c7385-d171-49fc-b4cf-e7714d28f10d
    summary: >-
      Add feature namespaces: AccessControl, Core, Destination Configuration,
      ApiKey
  - date: '2026-07-23T20:30:57.288Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Add Environment enumeration to DbAudit reference diagram
  - date: '2026-07-23T20:30:47.272Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Remove Environment relationship arrows from main diagram
  - date: '2026-07-23T20:30:47.094Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Remove Environment style from main diagram
  - date: '2026-07-23T20:30:37.787Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Remove Environment class from main diagram
  - date: '2026-07-23T20:30:30.895Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Type environment field as Environment in ApiKeyDomain
  - date: '2026-07-23T20:30:30.821Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Type environment field as Environment in ApiKeyCredential
  - date: '2026-07-23T20:30:30.759Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Type environment field as Environment in DenyListRecord
  - date: '2026-07-23T20:30:30.686Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Type environment field as Environment in AccessGroup
  - date: '2026-07-23T20:30:30.557Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Type environment field as Environment in AllowedUserAudit
  - date: '2026-07-23T20:30:17.398Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~83a30346-81e8-4129-b367-110e0491fcee
    summary: Type environment field as Environment in AllowedUser
  - date: '2026-07-23T20:27:54.910Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~ff65e28b-6fe5-4abb-9256-06a016d07f18
    summary: Fix DestinationAudit -> Destination label to show composite key
  - date: '2026-07-23T20:27:54.803Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~ff65e28b-6fe5-4abb-9256-06a016d07f18
    summary: Fix ApiKeyCredential -> ApiKeyDomain label to show composite key
  - date: '2026-07-23T20:27:54.603Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~ff65e28b-6fe5-4abb-9256-06a016d07f18
    summary: Add missing current composition on DestinationChangeRequest
  - date: '2026-07-23T20:25:47.433Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~378557f8-5cfe-477d-88f2-3c57811ed427
    summary: >-
      Fix AllowedUserAudit -> AllowedUser relationship label to show composite
      key
  - date: '2026-07-23T20:20:32.452Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~274313c9-1ed2-4d6a-a13a-45e4d2a3e24d
    summary: Rename env to environment in ApiKeyDomain
  - date: '2026-07-23T20:20:32.345Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~274313c9-1ed2-4d6a-a13a-45e4d2a3e24d
    summary: Update Environment relationship labels for ApiKey entities
  - date: '2026-07-23T20:20:31.221Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~274313c9-1ed2-4d6a-a13a-45e4d2a3e24d
    summary: Rename env to environment in ApiKeyCredential
  - date: '2026-07-23T20:19:22.072Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~0cc6f99c-438d-45a0-a2fb-4dad1dc31a12
    summary: Add per-class style coloring by stereotype
  - date: '2026-07-23T20:06:18.323Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~c5c3311c-5755-4dbd-ac7c-e4e6ea114f98
    summary: Add Environment relationship lines
  - date: '2026-07-23T20:06:11.160Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~c5c3311c-5755-4dbd-ac7c-e4e6ea114f98
    summary: Add Environment enumeration class
  - date: '2026-07-23T20:06:05.625Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~c5c3311c-5755-4dbd-ac7c-e4e6ea114f98
    summary: Test mcp_edit on known string
  - date: '2026-07-23T20:00:21.198Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~abb52c75-2b30-4604-beac-8bf1ac63c0c2
    summary: Add facade pattern design note for Jurisdiction API backward compatibility
  - date: '2026-07-23T19:58:42.112Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~500716f2-bc9d-476c-8124-380096e689d5
    summary: >-
      Add IGDD-3140 design note: Organization/Jurisdiction/Sender as single
      DynamoDB entity
  - date: '2026-07-23T19:57:04.895Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8779ad5e-9b60-486b-a9d4-cc30b9d4eb84
    summary: >-
      Update relationships: ApiKeyDomain/Credential point to Sender not
      Jurisdiction
  - date: '2026-07-23T19:56:55.640Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8779ad5e-9b60-486b-a9d4-cc30b9d4eb84
    summary: Rekey Sender on senderId = organizationId
  - date: '2026-07-23T19:56:55.551Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8779ad5e-9b60-486b-a9d4-cc30b9d4eb84
    summary: Rename jurisdictionId to senderId in ApiKeyDomain
  - date: '2026-07-23T19:56:55.251Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~8779ad5e-9b60-486b-a9d4-cc30b9d4eb84
    summary: Rename jurisdictionId to senderId in ApiKeyCredential
  - date: '2026-07-23T19:54:15.012Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~9602aed7-e88c-4a79-991d-bb3687f1869f
    summary: >-
      Update relationships: Jurisdiction -> OrganizationRecord via shared key,
      Sender via organizationId
  - date: '2026-07-23T19:54:04.159Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~9602aed7-e88c-4a79-991d-bb3687f1869f
    summary: >-
      Drop organizationId FK from Jurisdiction — jurisdictionId IS the
      organizationId
  - date: '2026-07-23T19:53:51.246Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7c547a1c-fa6a-46dc-a4b0-5a437fc5e87e
    summary: Simplify Sender to principal+organizationId+lastActive
  - date: '2026-07-23T19:53:45.462Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7c547a1c-fa6a-46dc-a4b0-5a437fc5e87e
    summary: 'Move name/description out of Jurisdiction, add organizationId FK'
  - date: '2026-07-23T19:53:40.007Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~7c547a1c-fa6a-46dc-a4b0-5a437fc5e87e
    summary: 'Rekey OrganizationRecord on organizationId, add name/description'
  - date: '2026-07-23T19:34:51.459Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~df6eeb7d-a44a-4636-b7da-c1c0c684afe4
    summary: Add Sender -> OrganizationRecord relationship
  - date: '2026-07-23T19:34:46.555Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~df6eeb7d-a44a-4636-b7da-c1c0c684afe4
    summary: 'Rename sender to principal in Sender, mark as key'
  - date: '2026-07-23T19:31:04.287Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~a35572ab-ec42-4ec6-932f-c2e0ddce1154
    summary: Add Hub-Managed Entities section with separate diagram
  - date: '2026-07-23T19:30:39.703Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~a35572ab-ec42-4ec6-932f-c2e0ddce1154
    summary: Add type field to OrganizationRecord
  - date: '2026-07-23T19:30:28.858Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~a35572ab-ec42-4ec6-932f-c2e0ddce1154
    summary: Add prefix and vendor fields to Jurisdiction
  - date: '2026-07-23T19:11:52.948Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~093e66df-a0e9-4d68-86df-71356e4521b9
    summary: Add DbAudit base class section with secondary diagram
  - date: '2026-07-23T19:11:37.952Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~093e66df-a0e9-4d68-86df-71356e4521b9
    summary: Remove DbAudit inheritance lines from main diagram
  - date: '2026-07-23T19:11:32.047Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~093e66df-a0e9-4d68-86df-71356e4521b9
    summary: Remove DbAudit class from main diagram
  - date: '2026-07-23T19:08:37.974Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~823e032d-f0a5-4772-90ac-13c33789c9be
    summary: Add AllowedUser -> OrganizationRecord relationship
  - date: '2026-07-23T19:08:33.401Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~823e032d-f0a5-4772-90ac-13c33789c9be
    summary: Mark AllowedUser as Join class
  - date: '2026-07-23T19:02:44.282Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~c3b88b3d-9d07-4df8-92de-8a7cdc82d13f
    summary: Add field marker legend to diagram prose
  - date: '2026-07-23T18:58:03.767Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~aab7ac19-ca9c-4b56-8316-cfa2d74dc496
    summary: 'Update Sender note: extends DbAudit confirmed, no UI page, not in hub/core'
  - date: '2026-07-23T18:57:52.021Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~aab7ac19-ca9c-4b56-8316-cfa2d74dc496
    summary: Add DbAudit <|-- Sender inheritance arrow
  - date: '2026-07-23T18:54:35.445Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f7efcfe1-6e5f-4c67-a583-3da47a0a345b
    summary: 'Correct Sender domain note: predates IGDD-2707, exists in develop'
  - date: '2026-07-23T18:54:25.477Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~f7efcfe1-6e5f-4c67-a583-3da47a0a345b
    summary: 'Correct Sender status: exists in develop unchanged, not IGDD-2707 specific'
  - date: '2026-07-23T18:53:17.746Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~bf72a051-c8c8-417f-8261-ad208db19f81
    summary: >-
      Add Domain Notes section: org model overlap, AllowedUser as join, Sender
      status
  - date: '2026-07-23T18:53:04.203Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~bf72a051-c8c8-417f-8261-ad208db19f81
    summary: >-
      Note Sender is in-progress IGDD-2707 work, sender field is same identity
      space as principal
  - date: '2026-07-23T18:31:58.319Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~6ca39652-ffff-4641-a329-00fc23975e84
    summary: Sort Entity Quick Reference table alphabetically
  - date: '2026-07-23T18:30:36.501Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3bbac910-0d13-44f7-a556-5db28710e4da
    summary: Update prose to reflect DbAudit as abstract base class
  - date: '2026-07-23T18:30:26.149Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~3bbac910-0d13-44f7-a556-5db28710e4da
    summary: >-
      DbAudit as Abstract base class with inheritance arrows; Sender has no
      DbAudit inheritance
  - date: '2026-07-23T18:25:31.875Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cbe61d20-0322-4c01-a6d5-be4776522e82
    source: 'C:\Users\boonek\AppData\Local\Temp\test-diagram.mmd'
    summary: >-
      Replace classDef/:::style with grammar-conformant <<Embedded>>/<<Entity>>
      stereotypes
  - date: '2026-07-23T18:23:34.378Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~cbe61d20-0322-4c01-a6d5-be4776522e82
    summary: Update prose to match stereotype-based diagram
  - date: '2026-07-23T18:21:19.620Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~81582c1e-3342-4633-b011-8614bc4c5225
    source: 'C:\Users\boonek\AppData\Local\Temp\test-diagram.mmd'
    summary: >-
      Fix Mermaid 10.8.0 classDiagram: inline :::style on class defs, classDef
      at bottom without semicolons
  - date: '2026-07-23T18:05:17.653Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~4b88a6c3-bd53-4320-a6b5-d3a71ba8c3ff
    summary: >-
      Fix Mermaid 10.8.0 syntax: remove inline style from class declarations,
      apply via ClassName:::style at end
  - date: '2026-07-23T18:01:09.158Z'
    user: boonek
    agent:
      name: GitHub Copilot CLI
      version: 1.0.73
    llm:
      name: claude-sonnet-4.6
      version: '4.6'
    prompt_uri: >-
      prompt:/github-copilot/0ee8a2ab-82ea-4cb0-95a2-3a9ce4f119f2/~b890e25d-964e-4f61-8ab0-35a7bbdf88dd
    summary: >-
      Fix Mermaid classDiagram syntax errors: move :::style inline, replace #
      with / in sortKey descriptions
ticket: IGDD-3106, IGDD-3140
---
# API Key Management — Design

See [proposal.md](proposal.md) for motivation and capability definitions.

## Context

IZ Gateway uses a single DynamoDB table (`izgw-hub`) with a composite key:

- **Partition key:** `entityType` (String) — the entity class name
- **Sort key:** `sortKey` (String) — assembled from the `#`-marked key fields of each entity, in listed order

All entities the Configuration Console manages live in this table. A set of additional entities in the same table are written exclusively by `izgw-hub` (see [Hub-Managed Entities](#hub-managed-entities)).

Senders currently authenticate to IZ Gateway using mutual TLS certificates. There is no self-service mechanism for senders to obtain, renew, or revoke API credentials. This design introduces two new entity types (`ApiKeyDomain`, `ApiKeyCredential`) to support the full credential lifecycle, and extends three existing entities (`Jurisdiction`, `Sender`, `ApiKeyCredential`) with use-type fields that enforce a jurisdiction-level opt-in access policy.

## Goals / Non-Goals

**Goals:**
- Model the full API key credential lifecycle: domain authorization, credential issuance, grace-period renewal, and immediate revocation.
- Allow jurisdictions to declare which credential use-types they accept (`allowedUseTypes`), giving each jurisdiction opt-in control over who may access their IIS data via API key.
- Allow senders to declare what submitter categories they act on behalf of (`useTypes`), and scope individual credentials to a subset of those categories.
- Make no breaking changes to existing DynamoDB content. No data migration is required.

**Non-Goals:**
- Changes to the existing mTLS authentication path.
- Hub-side JWT validation logic (separate deliverable; listed as an impact dependency in the proposal).
- Modifications to existing `Jurisdiction`, `OrganizationRecord`, `Sender`, or `AllowedUser` data.

## Decisions

### Conceptual Data Model

The diagram below is the **conceptual schema** — it reflects the domain model as understood for design purposes, so that we can reason about entities in terms that make sense to users. It is explicitly **not** the physical DynamoDB layout.

Physically, `Organization`, `Jurisdiction`, and `Sender` are **not** separate tables. A single DynamoDB table (still named `Jurisdiction`) backs an `Organization` base class together with a `Jurisdiction` interface and a `Sender` interface. A single organization record MAY implement the `Jurisdiction` interface, the `Sender` interface, or both. This denormalized representation is chosen for efficiency and to avoid a DynamoDB schema migration (see [Sender Identity in the Physical Schema](#sender-identity-in-the-physical-schema) and [Migration & Seeding](#migration--seeding-ops-run)). The physical implementation may consolidate or alias entities this way, but must faithfully represent all relationships shown here.

**Field markers:** `#` (protected) = sort key component, listed in sort order. `+` (public) = non-key attribute. `entityType` and `sortKey` are DynamoDB infrastructure fields omitted from the diagram — the class name is the `entityType` and `sortKey` is assembled from the `#` fields.

The `Environment` type is a fixed in-memory enumeration — see [DbAudit Base Class](#dbaudit-base-class). All `environment`/`destType`/`destTypeId` fields hold the numeric environment ID (1–6).

```mermaid
classDiagram
    namespace AccessControl {
        class AllowedUser {
            <<Join>>
            #Environment environment
            #String destinationId
            #String principal
            +String organization
            +Boolean enabled
            +Date validatedOn
        }

        class AllowedUserAudit {
            <<Entity>>
            #Environment environment
            #String destinationId
            #String principal
            #Date createdAt
            +String tableName
            +String userName
            +String changeType
            +String oldValues
            +String newValues
        }

        class AccessGroup {
            <<Entity>>
            #Environment environment
            #String groupName
            +String description
            +List roles
            +List users
            +List groups
        }

        class DenyListRecord {
            <<Entity>>
            #Environment environment
            #String principal
            +String reason
            +Date dateDenied
            +String deniedBy
        }

        class FileType {
            <<Entity>>
            #String fileTypeName
            +String description
        }
    }

    namespace Destinations {
        class Destination {
            <<Entity>>
            #Environment destTypeId
            #String destId
            +String destVersion
            +Date passExpiry
            +String maintReason
            +Date maintStart
            +Date maintEnd
            +Number jurisdictionId
        }

        class DestinationConnectionSettings {
            <<Embedded>>
            +String destUri
            +String username
            +String password
            +String MSH3
            +String MSH4
            +String MSH5
            +String MSH6
            +String MSH11
            +String MSH22
            +String RXA11
            +String facilityId
        }
    }

    namespace Organizations {
        class Jurisdiction {
            <<Entity>>
            #Number jurisdictionId
            +String prefix
            +String vendor
            +Set allowedUseTypes
        }

        class Sender {
            <<Entity>>
            #Number senderId
            +Date lastActive
            +Set useTypes
        }

        class OrganizationRecord {
            <<Entity>>
            #Number organizationId
            +String name
            +String description
            +String type
            +List principalNames
        }
    }

    namespace Destination Configuration {
        class DestinationAudit {
            <<Entity>>
            #Environment destType
            #String destId
            #Date createdAt
            +String tableName
            +String userName
            +String changeType
            +Boolean isPasswordDifferent
            +String oldValues
            +String newValues
        }

        class DestinationChangeRequest {
            <<Entity>>
            #Number id
            +String destId
            +Environment destType
            +String jiraId
            +Date requestedAt
            +String requestedBy
            +Date scheduledAt
            +Boolean isAsap
            +Boolean isDraft
            +Boolean isPasswordDifferent
            +Number jurisdictionId
        }
    }

    namespace ApiKey {
        class ApiKeyDomain {
            <<Entity>>
            #Environment environment
            #Number senderId
            #String domain
            +String status
            +String challengeUuid
            +Date challengeExpiresAt
            +String requestedBy
            +Date validatedAt
            +Date authExpiresAt
        }

        class ApiKeyCredential {
            <<Entity>>
            +List environments
            #String jti
            +Number senderId
            +String status
            +Date expiresAt
            +Date revokedAt
            +String description
            +String domain
            +Date viewedAt
            +Date graceExpiresAt
            +String supersededBy
            +Set useTypes
        }
    }

    %% DestinationConnectionSettings is embedded (not a base class)
    Destination *-- DestinationConnectionSettings : connection
    DestinationChangeRequest *-- DestinationConnectionSettings : requested
    DestinationChangeRequest *-- DestinationConnectionSettings : current

    %% Entity relationships (logical foreign keys)
    Destination --> Jurisdiction : jurisdictionId
    DestinationChangeRequest --> Destination : destId
    DestinationChangeRequest --> Jurisdiction : jurisdictionId
    DestinationAudit --> Destination : destType+destId
    AllowedUser --> Destination : destinationId
    AllowedUser --> OrganizationRecord : principal
    AllowedUserAudit --> AllowedUser : environment+destinationId+principal
    DenyListRecord --> OrganizationRecord : principal
    Jurisdiction --> OrganizationRecord : jurisdictionId = organizationId
    Sender --> OrganizationRecord : senderId = organizationId
    ApiKeyDomain --> Sender : senderId
    ApiKeyCredential --> Sender : senderId
    ApiKeyCredential --> ApiKeyDomain : environment+senderId+domain

    %% Styles by stereotype
    %% <<Entity>> — green
    style Destination fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style DestinationAudit fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style DestinationChangeRequest fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style Jurisdiction fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style OrganizationRecord fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style AllowedUserAudit fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style AccessGroup fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style DenyListRecord fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style FileType fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style Sender fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style ApiKeyDomain fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    style ApiKeyCredential fill:#d4efdf,stroke:#1e8449,stroke-width:2px,color:#333
    %% <<Join>> — amber
    style AllowedUser fill:#fef9e7,stroke:#f39c12,stroke-width:2px,color:#333
    %% <<Embedded>> — lavender
    style DestinationConnectionSettings fill:#e8daef,stroke:#8e44ad,stroke-width:2px,color:#333
```

### DbAudit Base Class

All `<<Entity>>` and `<<Join>>` classes in the above diagram derive from `DbAudit`, which provides fields used to track changes in the database. `Environment` is a fixed in-memory enumeration defined in `src/lib/desttypehelper.ts` (CC) and the equivalent in `izgw-hub`; it is **not** stored in DynamoDB. Fields typed `Environment` in the main diagram hold the numeric ID (1–6).

```mermaid
classDiagram
    class DbAudit {
        <<Abstract>>
        +String createdBy
        +Date createdOn
        +String updatedBy
        +Date updatedOn
    }

    class AnyEntity {
        <<Entity>>
    }

    class Environment {
        <<Enumeration>>
        1 PRODUCTION
        2 TEST
        3 ONBOARD
        4 STAGE
        5 DEV
        6 UNKNOWN
    }

    DbAudit <|-- AnyEntity : all Entity and Join classes
    style Environment fill:#dae8fc,stroke:#2e6da4,stroke-width:2px,color:#333
```

### Use-Type Policy Enforcement

`Jurisdiction.allowedUseTypes` declares which credential purposes a jurisdiction permits access to its IIS data — the jurisdiction's opt-in policy. `Sender.useTypes` declares what submitter categories a sender acts on behalf of (patients, providers, public health agencies). `ApiKeyCredential.useTypes` scopes a specific credential to one or more of those categories.

A credential is valid for a given destination only when `credential.useTypes ∩ destination.jurisdiction.allowedUseTypes` is non-empty. Policy evolves by updating `allowedUseTypes` on the jurisdiction alone — no credential or sender records need to change.

**Examples:**
- Texas: `allowedUseTypes = [PROVIDER]` — accepts provider credentials only (current state law restricts patient and public health access)
- New Jersey / Utah: `allowedUseTypes = [PATIENT, PROVIDER, PUBLIC_HEALTH]` — fully open
- Massachusetts: `allowedUseTypes = [PROVIDER, PUBLIC_HEALTH]`

### AllowedUser as Relationship Class

`AllowedUser` is the authorization join between a sender principal and a `Destination`, scoped by environment. It is effectively `OrganizationRecord ↔ Destination` with env scope.

### Migration & Seeding (ops-run)

`ApiKeyDomain` and `ApiKeyCredential` are new entities with no existing production data, and the new fields on `Jurisdiction`/`Sender` are optional at the schema level, so no schema migration is needed to keep existing records readable. However, a one-time **data** migration IS required, and it will be run by operations — **not** by console startup code:

- **Seed sender organizations.** Non-jurisdiction senders (e.g., Docket, Mayo, VHA, DOW) are added to the `Jurisdiction` table as records that implement the `Sender` interface, each with `useTypes` set. See [Sender Identity in the Physical Schema](#sender-identity-in-the-physical-schema) for how IDs are allocated.
- **Backfill jurisdiction policy.** Existing `Jurisdiction` records are updated with correct `allowedUseTypes`. Until this runs, the Hub use-type intersection would deny all API-key traffic to those jurisdictions (empty `allowedUseTypes` denies everything), so the backfill is a prerequisite for enabling Hub enforcement.

**Why ops-run, not auto-startup:** a startup migration would need a cross-instance lock (two console instances start concurrently), which DynamoDB does not natively provide; a faulty auto-migration could take the whole system down; and it is hard to test safely. The one-time nature does not justify introducing a migration framework. Instead the change ships as a scripted set of AWS CLI commands executed with operations (the "seeding task" run with Emiline).

**Seeding is not authorization.** Adding a sender/jurisdiction row grants no access by itself. Jurisdiction-scoped RBAC is driven by Okta group membership (`session.user.jurisdictions`), provisioned out-of-band. Seed rows and Okta groups must be kept in sync.

### Sender Identity in the Physical Schema

`senderId` is a foreign key to the physical `Jurisdiction` entity. Conceptually, a `Sender` is distinct from a `Jurisdiction` (a sender may not be a public health agency), but in the physical implementation there is one `Jurisdiction` record per sending organization. Non-jurisdiction senders (Docket, Mayo, VHA, DOW) are represented as `Jurisdiction` entries with appropriate `useTypes`. The conceptual `Sender` entity is a logical view over the physical `Jurisdiction` table.

**ID allocation.** `senderId`, `organizationId`, and `jurisdictionId` are the same value drawn from a single namespace with a single uniqueness rule: every record in the table has a distinct ID, and a newly seeded sender is issued a new unique ID that does not already exist in the table (IDs are never reused). Because IDs are never reused, the shared `id → name` label-enrichment lookup used across the console (Destinations, the Connections "Organization" column, the API-key list) cannot resolve one entity's ID to another entity's name. `Jurisdiction` and `OrganizationRecord` are **one-to-one** in both the conceptual and physical models (an ERD would show this directly; a class diagram is used here only because the relationship did not render cleanly as an ERD).

**Distinguishing senders from jurisdictions.** No separate type-discriminator flag is stored. The distinction is implied by field presence: a record with `allowedUseTypes` acts as a **jurisdiction**; a record with `useTypes` acts as a **sender**; a single record MAY have both and thus act as both. Non-persisted transient helper methods `isSender()` / `isJurisdiction()` on the entity class (annotated so they are not serialized to DynamoDB) expose this test to callers and to the UI — e.g., labeling entries in the Organization dropdown, which is populated from the full `Jurisdiction` table and therefore intermixes states with commercial/federal senders.

### useTypes Enumeration

Three canonical values: `PATIENT`, `PROVIDER`, `PUBLIC_HEALTH`. These are sufficient for the initial implementation. The set may be extended in future iterations.

### Grace Period Computation

The grace period is **10 business days**, computed from the renewal date. Business days exclude weekends and federal holidays (and potentially other recognized holidays). The computation logic is simple now and expected to become more refined over time — it should be isolated in a single utility function to support future refinement without touching credential lifecycle code.

### Multi-Environment Credentials for Admin and Operational Staff

`ApiKeyCredential.env` (as-built: a single string) is replaced by `environments`, a
list of numeric environment IDs (`number[]`, values 1–6 per the `Environment`
enumeration). Standard sender credentials contain exactly one environment ID.
Credentials issued to users with IZG Operations or Jurisdiction Operations roles MAY
contain multiple environment IDs, allowing a single credential to authenticate across
development, test, staging, onboarding, and production without maintaining a separate
credential per environment.

`environments` is a **server-side access control property**, not a JWT claim — it is
**not** carried in the token. At routing time the Hub looks the credential up by `jti`
and validates that the incoming request's environment is contained in the credential's
`environments` list. Keeping the list out of the token lets the permitted environment
set change (subject to access-control review) without reissuing a credential — the same
rationale that keeps `useTypes` server-side (see [Use-Type Policy Enforcement](#use-type-policy-enforcement)).

Because the permitted environments are an editable list rather than part of the
credential's identity, the `sortKey` is simply `{jti}` — there is no environment prefix
and no `primaryEnvId`. The Hub reads a credential directly by `jti`; no secondary index
on `jti` is required.

### Domain Verification Protocol

Domain ownership is verified via a **DNS TXT record** challenge. The challenge UUID is stored in `ApiKeyDomain.challengeUuid` with an expiry in `challengeExpiresAt`. The console polls or the sender triggers verification; on success `validatedAt` is set and the domain moves to `authorized` status.

The TXT record is placed at the **domain apex** — the exact name being validated — not under a `_izg-verify` (or similar) subdomain. This deliberately mirrors the DigiCert DNS-TXT validation procedure that jurisdiction IT teams already follow for certificate issuance, so no retraining of IIS IT staff is required. (Domain validation itself was a firm requirement from Dave Bike; matching the familiar procedure minimizes the multi-day ticket/turnaround cost each jurisdiction incurs to publish a DNS record.)

The signed JWT is **not** persisted. It is generated on demand by re-signing the credential's stored claims (see the credential-lifecycle spec, "JWT is deterministically re-signed"), returned to the sender once, and never retained by IZ Gateway — we keep no copy and cannot reproduce a sender's token. Its authenticity comes from the HMAC signature, not from storage. The token is signed with HS256 using the secret at `/izg/<env>/jwt/signing-secret` from AWS Secrets Manager; the JWT header carries a `kid` equal to the Secrets Manager version ID of the secret used to sign, and the payload includes an `iss` claim matching the Hub's configured `jwt.issuer`, so the Hub can select the correct secret version and validate the issuer before trusting the token. There is therefore **no** encrypted credential-value storage for `ApiKeyCredential` (in contrast to `Destination.password`, which must be retained and is stored via `EncryptedRepository`).

## Entity Quick Reference

| entityType | sortKey pattern | Purpose |
|---|---|---|
| `AccessGroup` | `{environment}#{groupName}` | RBAC groups with roles, users, and group members |
| `AllowedUser` | `{environment}#{destinationId}#{principal}` | Authorized sender certificates per destination |
| `AllowedUserAudit` | `{environment}#{destinationId}#{principal}#{timestamp}` | Change history for allowed users |
| `ApiKeyCredential` | `{jti}` | Issued API key credentials and their lifecycle status. The Hub reads directly by `jti`; there is no environment prefix on the key. `environments` is a `number[]` of env IDs stored as an attribute (single-entry for standard credentials; multi-entry for admin/ops credentials valid across environments) |
| `ApiKeyDomain` | `{envId}#{senderId}#{domain}` | DNS domains authorized for API key issuance |
| `DenyListRecord` | `{environment}#{principal}` | Certificates blocked from connecting |
| `Destination` | `{destTypeId}#{destId}` | IZ Gateway routing endpoints |
| `DestinationAudit` | `{destTypeId}#{destId}#{timestamp}` | Change history for destinations |
| `DestinationChangeRequest` | `hash(destType+destId)` | Pending change requests for destinations |
| `FileType` | `{fileTypeId}` | ADS file type definitions |
| `Jurisdiction` | `{jurisdictionId}` | Jurisdiction (state/territory) master data |
| `OrganizationRecord` | `{organizationName}` (physical, as-built) | Maps principal certificates to organizations. **Note:** the conceptual diagram keys this on `organizationId` (= `jurisdictionId`); the as-built physical `OrganizationRecord` is keyed by organization name. The two views reconcile 1:1 via the shared organization identity. |
| `Sender` | `{senderId}` | Sender identity, last-active timestamp, and use-type classifications |

## Hub-Managed Entities

The following entities exist in the same DynamoDB table (`izgw-hub`) but are **written and managed exclusively by `izgw-hub`**. The Configuration Console has no write path for these — they appear here for completeness and for operators who query the table directly.

```mermaid
classDiagram
    class CertificateStatus {
        <<Entity>>
        #String certificateId
        +String commonName
        +String certSerialNumber
        +Date lastCheckedTimeStamp
        +Date nextCheckTimeStamp
        +String lastCheckStatus
    }

    class EndpointStatus {
        <<Entity>>
        #String destId
        #Date statusAt
        +Environment destTypeId
        +String destUri
        +String destVersion
        +String status
        +String statusBy
        +String detail
        +String diagnostics
        +String retryStrategy
        +Number jurisdictionId
    }

    class Event {
        <<Entity>>
        #String name
        #String target
        #Date started
        +Date completed
        +String reportedBy
        +String eventId
    }

    class MessageHeader {
        <<Entity>>
        #String msh
        +String destId
        +String iis
        +String sourceType
        +String username
        +String password
        +String facilityId
    }

    %% Hub-managed relationships
    EndpointStatus --> Destination : destId
    MessageHeader --> Destination : destId
```

| entityType | sortKey pattern | Purpose |
|---|---|---|
| `CertificateStatus` | `{certificateId}` | OCSP check cache: thumbprint → last/next check result |
| `EndpointStatus` | `{destId}#{statusAt}` | Point-in-time connection status snapshot per destination |
| `Event` | `{name}#{target}#{started}` | Hub lifecycle events (Migration, Startup, Shutdown, Created) |
| `MessageHeader` | `{msh}` | MSH-3/4 value → destination + jurisdiction routing |

## Risks / Trade-offs

- **Grace period enforcement** → Mitigation: `graceExpiresAt` is stored on the credential and checked server-side on every authentication; the hub must not rely on client-supplied expiry.
- **Revocation latency** → Mitigation: Revocation must be enforced at read time in `izgw-hub` against a live DynamoDB read (or short-TTL cache), not just at issuance time in the console. A compromised credential must be unusable within the cache TTL of revocation.
- **useTypes intersection enforcement** → Mitigation: The intersection check (`credential.useTypes ∩ jurisdiction.allowedUseTypes`) must be enforced in `izgw-hub` at authentication time, not at issuance time in the console. Issuing a credential for a use-type the destination jurisdiction does not permit must produce a clear error at authentication, not a silent failure.
- **Sender entity identity** → Resolved: `senderId` = `organizationId` = `jurisdictionId`, a single unique ID per record in the physical `Jurisdiction` table (see [Sender Identity in the Physical Schema](#sender-identity-in-the-physical-schema)).

## Open Questions

*(none — all questions resolved)*
