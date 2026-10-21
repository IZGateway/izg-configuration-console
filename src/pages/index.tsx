import Container from '../components/Container'
import type { PageWithFooter } from '../components/Layout'
import HomeComponent from '../components/Home'
const HomePage: PageWithFooter = () => {
  return (
    <Container title="IZ Gateway Configuration Console">
      <HomeComponent />
    </Container>
  )
}

HomePage.showFooter = true

export default HomePage
