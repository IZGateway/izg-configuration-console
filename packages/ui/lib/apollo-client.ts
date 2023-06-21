import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

const apolloClientFactory = async () => {
  const uri = process.env.GRAPHQL_URL
  const cache = new InMemoryCache()
  console.info(
    'DEBUG ---> environment is ' +
      process.env.NODE_ENV +
      ' and using URL ' +
      uri +
      ' to connect to the GraphQL API',
  )
  const apolloClient = new ApolloClient({
    ssrMode: true,
    link: createHttpLink({
      uri,
      credentials: 'same-origin',
    }),
    cache,
  })

  return apolloClient
}

export default apolloClientFactory
