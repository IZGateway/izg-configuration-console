FROM node:22-alpine3.20 AS deps
#RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN  npm ci --force

FROM node:22-alpine3.20 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
ARG BUILD_ID=0.0.0
#Strategy for using NEXT_PUBLIC variables found at https://phase.dev/blog/nextjs-public-runtime-variables/
ARG NEXT_PUBLIC_OKTA_ISSUER=BAKED_NEXT_PUBLIC_OKTA_ISSUER
ARG NEXT_PUBLIC_GA_ID=BAKED_NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_BUILD_ID=${BUILD_ID}
RUN npx prisma generate
RUN npm run build

FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN apk add bash

COPY prisma ./prisma/
COPY package.json package-lock.json ./
RUN  npm ci --omit=dev --force && find . -type f -name 'yarn.lock' -delete
RUN npx prisma generate
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/filebeat.yml ./filebeat.yml
COPY --from=builder /app/metricbeat.yml ./metricbeat.yml
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/start-app.sh ./start-app.sh
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

#USER nextjs
RUN chmod a+x replace-variable.sh
RUN chmod a+x start-app.sh
EXPOSE 3000

ENV PORT 3000

ENTRYPOINT ["bash", "start-app.sh"]
