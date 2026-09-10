# api-key-management-ui

Complete the API Key Management dashboard (filters, revoke/cancel differentiation, DNS
verification hardening) so Hub integrations can use API keys instead of client
certificates. Scope grew substantially as the IGDD-3140 design landed: server-side
authorization + jurisdiction-ownership scoping, use-type policy end-to-end, credential
re-keying and multi-environment support, global domain exclusivity, an apex DNS
challenge, a duplicate-scope guardrail, and an expired-key re-issue flow.
