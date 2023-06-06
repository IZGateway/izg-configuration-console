import Head from 'next/head'

export interface ContainerProps {
  title: string
  children: React.ReactNode
}

const Container = ({ title, children }: ContainerProps) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="IZ Gateway Configuratoin Console" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {children}
    </>
  )
}

export default Container
