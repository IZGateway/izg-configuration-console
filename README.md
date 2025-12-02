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
SSL_SOURCE=<Path to your certificates on local machine>
NEXTAUTH_URL=https://localhost
NEXTAUTH_SECRET=<enter generated secret>
OKTA_CLIENT_ID=<enter client id>
OKTA_ISSUER=<the URL for the Okta service>
OKTA_CLIENT_SECRET=<Okta secret>
SHOW_SQL_IN_CONSOLE=true
DATABASE_URL="mysql://<url to your database>"
IZG_MAX_STATUS_HISTORY_RETURNED=20
IZG_ENDPOINT_CRT_PATH=${SSL_SOURCE}/<Your Certificate filename>
IZG_ENDPOINT_KEY_PATH=${SSL_SOURCE}/<Your Key filename>
IZG_ENDPOINT_PASSCODE=<your certificate passcode>
NEXTAUTH_DEBUG=true
IZG_STATUS_ENDPOINT_URL=<statushistory endpoint>
AUTOMATED_TEST_RUN_DURATION=900000
JIRA_API_URL=<Jira url>
JIRA_API_AUTH_BASE64=<Jira auth>
JIRA_API_PROJECT_ID=<Jira project id>
JIRA_API_ISSUE_TYPE=<Jira issue type>
```

If you are going to send logs to Elastic for testing, you will also need these:

```
ELASTIC_ENV_TAG=<Environment code, likely dev if running locally>
ELASTIC_HOST=<Audacious Elastic URL>
ELASTIC_API_KEY=<API key used by filebeats and metricbeats to push logs to Elastic>
ELASTIC_INDEX=<Index to post application logs to: Something like izgw-config-console-dev>
ELASTIC_INDEX_NGINX=<Index to post nginx logs to, if running in Docker: izgw-config-console-nginx-dev>
```

NOTE: About certificates. There are a few environment variables in an attempt to make pulling certificates no matter if you are running the application locally or inside Docker.

- SSL_SOURCE - this should point to a directory on your local machine where your certificate files are located.

IZG_ENDPOINT_CRT_PATH and IZG_ENDPOINT_KEY_PATH can be configured to append a directory to the beginning.

Let's say, on you local machine, that you have your certificate and key in a /Users/moodya/izg/certs folder. You can set the SSL_SOURCE to that directory location. Then set your key and cert variables:

- IZG_ENDPOINT_CRT_PATH = ${SSL_SOURCE}/amoody_testing_izgateway_org.crt
- IZG_ENDPOINT_KEY_PATH = ${SSL_SOURCE}/amoody_testing_izgateway_org.key

This will allow for running the application locally and inside Docker and have your certificates work in both places.

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

```
DATABASE_URL="mysql:<database connection URL>"
```

### **Step 2: Install Dependencies**

Install dependencies by running

```
npm install
```

**PLEASE NOTE:** If you add any sensitive database connectivity information to an .env file that NEEDS TO BE REMOVED and not posted to Git.

### **Step 4: Start local application**

Prerequisite: Existing services running on port 3306, such as another database instance, must be stopped.

In a terminal window at the root of the project directory, run

```
npm run start:local-dev
```

This script executes the following:

```
docker compose -f ./local-docker/docker-compose.yml up -d && npm run dev && docker compose -f ./local-docker/docker-compose.yml down
```

- Create and start a Nginx image configured to listen to port 443 and route incoming requests to the application running on port 3000
- Create and start a MySQL image loaded with dummy test data
- Runs 'npm run dev' to start the node application on port 3000

### **Step 5: Run everything in Docker**

This will run the Docker image for IZG CC (which has Nginx and the application) as well as a MySQL image loaded with dummy test data.

```
npm run start:local-docker
```

Make sure you have your .env.local file setup properly. Please note that your .env.local file may be pointing to MySQL on _localhost_ if you have been running the application locally (as in the previoius step). As MySQL is running in the same docker compose you will need to change the host to mysql instead.

### **After start**

Navigate to https://localhost in a browser, and you should see the application prompt you for a keycloak login

### **End to End testing: Playwright set up**

Run npm install

```
Add .env.test file in project root folder which will include below values
OKTA_USERNAME=Username of the user
OKTA_PASSWORD=Password for the user
BASE_URL=URL of where you want to run these tests against
OKTA_NONADMIN_USERNAME=Username for the non-admin user
OKTA_NONADMIN_PASSWORD=Password for the non-admin user
OKTA_NONADMIN_EXPECTED_FULLNAME=The full name of the non-admin user, which shows after successful login. Comes from Okta
OKTA_NONADMIN_EXPECTED_DEST_IDS=A comma separate list of Destination Id's that will show in the first column for the non-admin user. Will only have rows for jurisdictions the user is configured for in Okta


```

Run npm run test:dev which will run tests in all 4 headed browsers. To run for specific browser use this command npm run test:dev --project=Chrome

