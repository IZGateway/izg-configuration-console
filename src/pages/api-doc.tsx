import { GetStaticProps, InferGetStaticPropsType } from 'next'
import { createSwaggerSpec } from 'next-swagger-doc'
import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'
import AdminGuard from '../components/AdminGuard'

const SwaggerUI = dynamic<{
  spec: any
}>(import('swagger-ui-react'), { ssr: false })

function ApiDoc({ spec }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <SwaggerUI spec={spec} />
}

export const getStaticProps: GetStaticProps = async () => {
  const spec: Record<string, any> = createSwaggerSpec({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Next Swagger API',
        version: '1.0',
      },
    },
    apis: ['src/pages/api/*/*.ts', 'src/pages/api/*/*/*.ts'],
  })

  return {
    props: {
      spec,
    },
  }
}

export default AdminGuard(ApiDoc)
