FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN  npm install

FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate
RUN npm run build

FROM ghcr.io/izgateway/alpine-node-openssl-fips:latest AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/filebeat.yml ./filebeat.yml
COPY --from=builder /app/metricbeat.yml ./metricbeat.yml
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/start-app.sh ./start-app.sh

# Replace default filebeat config with custom config file
RUN cd ../filebeat && \
    rm -rf /filebeat/filebeat.yml && \
    cp ../app/filebeat.yml ./filebeat.yml

# Replace default metricbeat config with custom config file
RUN cd ../metricbeat && \
    rm -rf /metricbeat/metricbeat.yml && \
    cp ../app/metricbeat.yml ./metricbeat.yml

#USER nextjs
RUN chmod a+x start-app.sh
EXPOSE 3000

ENV PORT 3000

ENTRYPOINT ["bash", "start-app.sh"]
