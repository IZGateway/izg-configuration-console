# Stage 1: Build Keycloak image
FROM quay.io/keycloak/keycloak:latest AS builder

# Copy the realm-export.json file to the Docker build context
COPY ./auth/realm-export.json /tmp/realm-export.json

# Stage 2: Create Keycloak image with realm-export.json
FROM quay.io/keycloak/keycloak:latest

# Copy the realm-export.json file from the builder stage
COPY --from=builder /tmp/realm-export.json /tmp/realm-export.json

# Import the realm-export.json during Keycloak image startup
CMD ["-Dkeycloak.import=/tmp/realm-export.json"]
