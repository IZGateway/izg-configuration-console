# syntax = docker/dockerfile:experimental

##
## Base node image used to set up the production build
##
FROM node:18-alpine as builder
WORKDIR /usr/src/app
# Custom cache invalidation
ARG CACHEBUST=1
##
## Add all files from the current directory (if you need to ignore anything, you can use .dockerignore)
##
ADD . .

##
## This is needed as the install state will be invalid otherwise
##
RUN yarn install
RUN rm -rf .yarn/cache
##
## Change working directory to the workspace we want to build
##
#WORKDIR packages/api

##
## Optionally run a `build` script to compile (tsc, babel, etc) the source files to /packages/backend-api/dist
##
RUN yarn build

FROM node:18-alpine  
WORKDIR /usr/src/app
COPY package.json ./
RUN yarn install --production && rm -rf "$(yarn cache clean)"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --chown=nextjs:nodejs --from=builder /usr/src/app/.next ./.next

# Run container as non-root (unprivileged) user
# The node user is provided in the Node.js Alpine base image
USER nextjs

##
## Expose our port and run the production app, assumes `backend-api/package.json` has a script named `start:prod`
##
EXPOSE 3000
CMD ["yarn", "start"]