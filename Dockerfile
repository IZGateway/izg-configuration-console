# The base image uses the :latest tag on purpose. The base image rebuilds every day
# with security patches, and :latest gives each build of this image those patches.
# GHCR has no version tags for the base image. A digest pin stops the patches.
# hadolint ignore=DL3007
FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# The GitHub Packages token comes from a BuildKit secret, not an ARG, so it is not
# kept in the image history. Build with: --secret id=npm_token,env=NPM_TOKEN
# Do not pass the token as an npm command-line flag: npm writes its argv to
# /root/.npm/_logs. The npmrc goes on a tmpfs mount (never saved in a layer) and
# holds the literal text ${NPM_TOKEN}, which npm reads from the environment.
RUN --mount=type=secret,id=npm_token \
    --mount=type=tmpfs,target=/run/npm-auth \
    printf '%s\n' \
        '@izgateway:registry=https://npm.pkg.github.com/' \
        "//npm.pkg.github.com/:_authToken=\${NPM_TOKEN}" > /run/npm-auth/.npmrc \
    && NPM_TOKEN="$(cat /run/secrets/npm_token)" \
    && export NPM_TOKEN \
    && npm ci --userconfig=/run/npm-auth/.npmrc \
    && rm -rf /root/.npm/_logs

# hadolint ignore=DL3007
FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ARG BUILD_ID=0.0.0
#Strategy for using NEXT_PUBLIC variables found at https://phase.dev/blog/nextjs-public-runtime-variables/
ARG NEXT_PUBLIC_OKTA_ISSUER=BAKED_NEXT_PUBLIC_OKTA_ISSUER
ARG NEXT_PUBLIC_GA_ID=BAKED_NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_BUILD_ID=${BUILD_ID}
ARG NEXT_PUBLIC_APP_ENV=BAKED_NEXT_PUBLIC_APP_ENV
ARG NEXT_PUBLIC_ELASTIC_INDEX=BAKED_NEXT_PUBLIC_ELASTIC_INDEX
RUN npm run build

# hadolint ignore=DL3007
FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_MANUAL_SIG_HANDLE=true

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY package.json package-lock.json ./

# nginx is no longer installed here (IGDD-3010) — it is provided by the base image.
# Fail the build fast if a future base image stops shipping the nginx binary or the
# 'nginx' user that nginx.conf.template's `user nginx;` directive requires, rather than
# discovering it at container runtime when run_and_monitor.sh tries to start nginx.
RUN set -e; \
    command -v nginx >/dev/null 2>&1 || { echo "ERROR: nginx binary not found; must be provided by the base image." >&2; exit 1; }; \
    id -u nginx >/dev/null 2>&1 || { echo "ERROR: 'nginx' user not found; required by 'user nginx;' in nginx.conf.template." >&2; exit 1; }

# Install Dependencies and cleanup yarn.lock if present
# The token is handled as in the deps stage. This stage is the final image, so the
# token must not stay in a layer, in /root/.npmrc, or in an npm log.
# The base image supplies bash, curl, and libc6-compat (through gcompat).
# This stage adds gettext (for envsubst in run_and_monitor.sh) and tini.
RUN --mount=type=secret,id=npm_token \
    --mount=type=tmpfs,target=/run/npm-auth \
    apk add --no-cache "gettext>=0.24" "tini>=0.19" \
    && printf '%s\n' \
        '@izgateway:registry=https://npm.pkg.github.com/' \
        "//npm.pkg.github.com/:_authToken=\${NPM_TOKEN}" > /run/npm-auth/.npmrc \
    && NPM_TOKEN="$(cat /run/secrets/npm_token)" \
    && export NPM_TOKEN \
    && npm ci --omit=dev --userconfig=/run/npm-auth/.npmrc \
    && rm -rf /root/.npm/_logs \
    && find . -type f -name 'yarn.lock' -delete

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
# The API spec, built by `prebuild` from src/pages/api/**, which this stage does
# not ship. /api/swaggerjson serves this file (IGDD-3550).
COPY --from=builder /app/generated/api-doc-spec.json ./generated/api-doc-spec.json
COPY --from=builder /app/filebeat.yml ./filebeat.yml
COPY --from=builder /app/metricbeat.yml ./metricbeat.yml
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/run_and_monitor.sh ./run_and_monitor.sh
COPY --from=builder --chown=nextjs:nodejs /app/replace-variable.sh ./replace-variable.sh


# Replace the default filebeat and metricbeat config files with the custom config files
RUN rm -rf /filebeat.yml /metricbeat.yml \
    && cp /app/filebeat.yml /filebeat/filebeat.yml \
    && cp /app/metricbeat.yml /metricbeat/metricbeat.yml

# Make scripts executable and copy Nginx Configuration Template
RUN chmod a+x replace-variable.sh \
	&& chmod a+x run_and_monitor.sh\
    && mkdir -p /etc/nginx/conf.d
COPY nginx.conf.template /app/nginx.conf.template

# Expose only 443 (to nginx)
EXPOSE 443

# This is only an environment variable telling NextJS which port to use.
# This DOES NOT expose port 3000
ENV PORT=3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/run_and_monitor.sh"]
