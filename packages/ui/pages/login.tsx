import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import styles from "../styles/Login.module.css";

const Login = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Next-Auth SAML Example</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Login</h1>

        <div className={styles.grid}>
          <Link href="/api/auth/login/saml">
            <a className={styles.card}>
              <Image height={32} width={64} src="/ssplogo-fish-only.jpg" />
              Login with SimpleSAMLPHP
            </a>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Login;
