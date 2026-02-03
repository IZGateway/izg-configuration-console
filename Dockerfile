FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS deps
#RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN  npm ci

FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ARG BUILD_ID=0.0.0
#Strategy for using NEXT_PUBLIC variables found at https://phase.dev/blog/nextjs-public-runtime-variables/
ARG NEXT_PUBLIC_OKTA_ISSUER=BAKED_NEXT_PUBLIC_OKTA_ISSUER
ARG NEXT_PUBLIC_GA_ID=BAKED_NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_BUILD_ID=${BUILD_ID}
ARG NEXT_PUBLIC_APP_ENV=BAKED_NEXT_PUBLIC_APP_ENV
RUN npm run build

FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_MANUAL_SIG_HANDLE true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN apk add bash

# Install Nginx, gettext (for envsubst), and tini
RUN apk add --no-cache nginx gettext tini

COPY package.json package-lock.json ./
RUN  npm ci --omit=dev && find . -type f -name 'yarn.lock' -delete
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/filebeat.yml ./filebeat.yml
COPY --from=builder /app/metricbeat.yml ./metricbeat.yml
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/run_and_monitor.sh ./run_and_monitor.sh
COPY --from=builder --chown=nextjs:nodejs /app/replace-variable.sh ./replace-variable.sh


RUN apk add curl libc6-compat

# Replace default filebeat config with custom config file 
 RUN cd ../filebeat && \
     rm -rf /filebeat.yml && \
     cp ../app/filebeat.yml ./filebeat.yml

# Replace default metricbeat config with custom config file
 RUN cd ../metricbeat && \
     rm -rf /metricbeat.yml && \
     cp ../app/metricbeat.yml ./metricbeat.yml

# Copy Nginx Configuration Template
RUN mkdir -p /etc/nginx/conf.d
COPY nginx.conf.template /app/nginx.conf.template

#USER nextjs
RUN chmod a+x replace-variable.sh
RUN chmod a+x run_and_monitor.sh

# Expose only 443 (to nginx)
EXPOSE 443

# This is only an environment variable telling NextJS which port to use.
# This DOES NOT expose port 3000
ENV PORT 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/run_and_monitor.sh"]
