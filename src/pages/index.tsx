import Container from '../components/Container'
import type { NextPage } from 'next'
import HomeComponent from '../components/Home'
const HomePage: NextPage = () => {
  return (
    <Container title="IZ Gateway Configuration Console">
      <HomeComponent></HomeComponent>
    </Container>
  )
}

export default HomePage
