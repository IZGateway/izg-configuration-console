import { withSwagger } from 'next-swagger-doc'

const swaggerHandler = withSwagger({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NextJS Swagger',
      version: '0.1.0',
    },
  },
  apiFolder: 'pages/api',
  apis: ['src/pages/api/*/*.ts', 'src/pages/api/*/*/*.ts'],
})
export default swaggerHandler()
