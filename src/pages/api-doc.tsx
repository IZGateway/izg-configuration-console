/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetStaticProps, InferGetStaticPropsType } from 'next'
import { createSwaggerSpec } from 'next-swagger-doc'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import 'swagger-ui-react/swagger-ui.css'
import AccessDenied from '../components/AccessDenied'
import useRoleAccess from '../lib/security/useRoleAccess'

const SwaggerUI = dynamic<{
  spec: any
}>(import('swagger-ui-react'), { ssr: false })

/**
 * The one page in this change that is **client-gated only** — and it is not
 * counted among the pages IGDD-3472 secures.
 *
 * It cannot be server-side gated: it exports `getStaticProps`, Next forbids
 * exporting both, and converting it would move `createSwaggerSpec` to request
 * time — where it would find nothing, because the Dockerfile runner stage does
 * not copy `src/`.
 *
 * So be precise about what this achieves: the *interface* is hidden after
 * hydration; the page shell is still reachable by any authenticated user and
 * the denial is not audited. What actually protects the documentation is
 * `/api/swaggerjson`, which is capability-gated and does audit. Without a spec
 * this is an empty Swagger UI.
 */
function ApiDoc({ spec }: InferGetStaticPropsType<typeof getStaticProps>) {
  const { status } = useSession()
  const { canViewApiDoc } = useRoleAccess('api-doc')

  // Explicit loading branch, rather than falling through to the denial: render
  // on true, never hide on false. useRoleAccess returns {} until the session
  // resolves, so the gate below is closed during loading either way — this
  // just avoids flashing a denial at a user who does have access.
  if (status === 'loading') return null

  // The same denial surface as every gated page, even though this one cannot
  // audit. Returning `null` here would leave a denied user staring at a blank
  // page — no worse for security, but strictly worse than telling them why,
  // and inconsistent with the four SSR-gated pages.
  if (!canViewApiDoc) return <AccessDenied title="API Documentation" />

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

export default ApiDoc
