# izg-configuration-console

This project contains the api and ui for the IZ Gateway Configuration Console. This is written using the following technologies:

- NodeJS 
- NextJS 
- Material UI
- GraphQL using Apollo
- Yarn 3 (monorepo)
- Docker Compose
- MySQL image
- Keycloak image


## Usage for local development
The following prerequisites must be met for the first-time install and run the application on a local environment
- Yarn 3 installed and active
- Docker compose installed

A certificate for connecting to an instance of IZ Gateway is not necessary, however the connection status feature will not function without a certificate. You will see errors in the console but they do not prevent the application from running.

### **Step 1: start docker**
Prerequisite: Existing services running on port 3306, such as another database instance, must be stopped. Or, you can modify the port by creating a docker-compose.override.yml and setting a port value.

In a terminal window at the root of the project directory, start the MySQL and Keycloak containers by running

```
yarn docker-dev:up
```
MySQL and Keycloak are configured to start with default test data and configurations.   
NOTE: MySQL container must be running before the next steps can be completed

### **Step 2: install dependencies**
With the MySQL and Keycloak images running, install the project's dependencies by running the following at the root of the project directory
```
yarn install
```

### **Step 3: create .env files**
NOTE: DO NOT MODIFY EXISTING .ENV FILES AS THESE ARE MEANT TO BE TEMPLATES

In the packages/ui directory, create a file named '.env.local'.
This .env.local file is ignored by git and will have all your configuration details for the ui project. Copy from the .env template and input the key values for your environment.      
Follow these steps to configure the next-auth values: https://next-auth.js.org/configuration/options#secret     

In the packages/api directory, create a file named '.env'.      
This .env file is ignored by git and will have all your configuration details for the api project. Copy the keys from the .env.template file and fill in the appropriate values.
### **Step 4: connect Prisma**
Change directory to the api project

```
cd packages/api
```
and run the following
```
yarn prisma generate
```
This will create the Prisma client using the connection info in the api's .env file.

### **Step 5: starting config console**
With the containers running and completing the prior steps, at the root of the project run

```
yarn dev
```

This will start the config console api and ui services. To open the application, go to the following URL in a browser:

`http://localhost:3000`

Running in development mode uses the concurrently package to start both the api graphql server and the ui nextjs server in development mode. Use the following credentials to log into the application when prompted:

Username: brian     
Password: test

### **After setup**
Now that the above steps are completed, the entire project can be started by running the following command at the root of the project

```
yarn docker-development:up
```

This command will start the docker containers and then start the config console project.

### **Stopping the application**
Use ctrl+c to stop the config console's api and ui services. Run the following command to stop the docker containers

```
yarn docker:down
```
