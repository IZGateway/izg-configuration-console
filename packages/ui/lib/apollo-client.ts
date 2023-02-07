import { ApolloClient, InMemoryCache } from "@apollo/client";

const uri = process.env.GRAPHQL_URL;

const apolloClientFactory = async () => {
  const isBrowser = typeof window !== "undefined";
  const isDevelopment = process.env.NODE_ENV === "development";

  const cache = new InMemoryCache();
  console.log("DEBUG ---> environment is " + process.env.NODE_ENV);
  const apolloClient = new ApolloClient({
    uri: isDevelopment
      ? "http://localhost:4000"
      : isBrowser
      ? "http://localhost:4000"
      : "http://api:4000",
    cache,
  });

  return apolloClient;
};

export default apolloClientFactory;
