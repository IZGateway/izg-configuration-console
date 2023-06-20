import { ApolloClient, InMemoryCache } from '@apollo/client'

const uri = process.env.GRAPHQL_URL

const apolloClientFactory = async () => {
  const cache = new InMemoryCache()
  console.log(
    'DEBUG ---> environment is ' +
      process.env.NODE_ENV +
      ' and using URL ' +
      uri +
      ' to connect to the GraphQL API',
  )
  const apolloClient = new ApolloClient({
    uri,
    cache,
  })

  return apolloClient
}

ApolloClient.

export default apolloClientFactory
