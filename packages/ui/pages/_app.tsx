import * as React from "react";
import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";
import { ApolloProvider } from "@apollo/client";
import apolloClientFactory from "../lib/apollo-client";
import Layout from "../components/Layout";
import "@fontsource/ubuntu/300.css";
import "@fontsource/ubuntu/400.css";
import "@fontsource/ubuntu/500.css";
import "@fontsource/ubuntu/700.css";
import createEmotionCache from "../utility/createEmotionCache";
import lightThemeOptions from "../styles/theme/lightThemeOptions";
import { AppProvider } from "../contexts/app";
interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
  pageProps: { session: any; pageProps: any };
}

const clientSideEmotionCache = createEmotionCache();
const lightTheme = createTheme(lightThemeOptions);

const MyApp: React.FunctionComponent<MyAppProps> = (props) => {
  const [client, setClient] = React.useState(undefined);
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  React.useEffect(() => {
    const initApolloClient = async () => {
      const apolloClient = await apolloClientFactory();
      setClient(apolloClient);
    };
    initApolloClient().catch(console.error);
  }, []);

  if (!client) {
    return <h1>Initializing application...</h1>;
  }

  return (
    <SessionProvider session={pageProps.session}>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={lightTheme}>
          <CssBaseline />
          <ApolloProvider client={client}>
            <Layout>
              <AppProvider>
                <Component {...pageProps} />
              </AppProvider>
            </Layout>
          </ApolloProvider>
        </ThemeProvider>
      </CacheProvider>
    </SessionProvider>
  );
};

export default MyApp;
