# izg-configuration-console

This project contains the api and ui for the IZ Gateway Configurtion Console. This was written using node v18.10.0.
## Usage

```
yarn install
```
Add .env.local file under Ui and  add .env file api directories

in the /packages/api folder run the following to generate the Prisma client

```
yarn prisma generate
```
at the root of the project run

```
yarn dev
```

open `http://localhost:3000`

Running in development mode uses the concurrently package to start both the /api graphql server and the /ui nextjs server in development mode

```
"dev": "concurrently \"yarn api-dev\" \"yarn ui-dev\""
```

This monorepo is based off the project at https://github.com/givehug/devto-monorepo
