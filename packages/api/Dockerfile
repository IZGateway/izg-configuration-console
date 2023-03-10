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

RUN yarn install
RUN yarn run prisma generate
RUN rm -rf .yarn/cache
RUN yarn build

FROM node:18-alpine  
WORKDIR /usr/src/app
COPY package.json ./
COPY prisma ./
RUN yarn install --production && rm -rf "$(yarn cache clean)"
RUN yarn run prisma generate
COPY --from=builder /usr/src/app/build ./build

##
## Expose our port and run the production app, assumes `backend-api/package.json` has a script named `start:prod`
##
EXPOSE 4000
CMD ["yarn", "start"]