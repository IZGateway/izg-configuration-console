# izg-configuration-console

This project contains source code for the IZ Gateway Configuration Console. This is written using the following technologies:

- NodeJS
- NextJS
- NextAuthJS
- Material UI
- Docker Compose
- MySQL image

## Usage for local development

The following prerequisites must be met for the first-time install and run the application on a local environment

- NodeJS installed and active
- Dokcer & Docker compose installed
- Okta account for the localhost client

NOTE: A certificate for connecting to an instance of IZ Gateway is not necessary, however the connection status feature will not function without a certificate. You will see errors in the console but they do not prevent the application from running.

### **Step 1: Create .env and .env.local text files in project root directory**

NextJS will use values found in the .env.local file. Below is an example of the keys that require values custom to your environment

```
NEXTAUTH_URL=http://localhost
NEXTAUTH_URL_INTERNAL=http://localhost
NEXTAUTH_SECRET=<enter generated secret>
OKTA_CLIENT_ID=<enter client id>
OKTA_ISSUER=<the URL for the Okta service>
OKTA_CLIENT_SECRET=<Okta secret>
SHOW_SQL_IN_CONSOLE=true
DATABASE_URL="mysql://<url to your database>"
IZG_MAX_STATUS_HISTORY_RETURNED=20
IZG_ENDPOINT_CRT_PATH=<path/to/your/certificate.crt>
IZG_ENDPOINT_KEY_PATH=<path/to/your/key.key>
IZG_ENDPOINT_PASSCODE=<your certificate passcode>
NEXTAUTH_DEBUG=true
IZG_STATUS_ENDPOINT_URL=<statushistory endpoint>
AUTOMATED_TEST_RUN_DURATION=900000
USERNAME_JIRA=<Jira username>
PASSWORD_JIRA=<Jira password>
JIRA_API_URL=<Jira url>
JIRA_API_AUTH_BASE64=<Jira auth>
JIRA_API_PROJECT_ID=<Jira project id>
JIRA_API_ISSUE_TYPE=<Jira issue type>
```

NOTE: the IZG_STATUS_ENDPOINT_URL must be an array of objects

For example:

```
[
 {
   "typeId":5,
   "desc":"dev",
   "url":"https://dev.izgateway.org/rest/statushistory"
 },
 {
   "typeId":2,
   "desc":"test",
   "url":"https://dev.izgateway.org:444/rest/statushistory"
   }
 ]
```

the .env file is needed for Prisma to connect and inspect the database schema in order to generate a prisma.schema and prisma client. The .env file only needs to contain the database url connection string.

```
DATABASE_URL="mysql:<database connection URL>"
```

### **Step 2: Install Dependencies**

Install dependencies by running

```
npm install
```

### **Step 3: Connect Prisma**

Create a Prisma client by running the following

```
npx prisma generate
```

YES - npX and not npM  
This will create the Prisma client using the connection info in the .env file.

### **Step 4: Start local application**

Prerequisite: Existing services running on port 3306, such as another database instance, must be stopped. Or, you can modify the port by creating a docker-compose.override.yml and setting a port value.

In a terminal window at the root of the project directory, run

```
npm run start:local-dev
```

This script executes the following:

```
"docker-compose -f docker-compose.local.yml up -d && npm run dev",
```

- Create and start an Nginx image configured to listen to port 80 and route incoming requests to the application running on port 3000
- Create and start a MySQL image loaded with dummy test data
- Runs 'npm run dev' to start the node application on port 3000

### **Step 5 (OPTIONAL): Create docker-compose.override.yml**

This step is needed if you want to run the config console application in a docker container along with the mysql and nginx containers..
The docker-compose.override.yml file must be created at the root of the project and configured with the following values:

```
version: '3'
services:
  config-console:
    build:
      context: .
      dockerfile: ./Dockerfile
    environment:
      - NEXTAUTH_URL=http://localhost
      - NEXTAUTH_URL_INTERNAL=http://localhost
      - NEXTAUTH_SECRET=<enter generated secret>
      - OKTA_CLIENT_ID=<enter client id>
      - OKTA_ISSUER=<the URL for the Okta service>
      - OKTA_CLIENT_SECRET=<Okta secret>
      - SHOW_SQL_IN_CONSOLE=true
      - DATABASE_URL="mysql://<url to your database>"
      - IZG_MAX_STATUS_HISTORY_RETURNED=20
      - IZG_ENDPOINT_CRT_PATH=<path/to/your/certificate.crt>
      - IZG_ENDPOINT_KEY_PATH=<path/to/your/key.key>
      - IZG_ENDPOINT_PASSCODE=<your certificate passcode>
      - NEXTAUTH_DEBUG=true
    volumes:
      - <full path to your certificate and key directory>:/usr/src/app/certs

```

### **After start**

Navigate to http://localhost in a browser and you should see the application prompt you for a keycloak login
