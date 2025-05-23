// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="pt-BR">
        <Head>
          {/* Meta Tags Open Graph */}
          <meta property="og:title" content="Título da Página" />
          <meta property="og:description" content="Descrição da página" />
          <meta property="og:image" content="URL_da_imagem" />
          <meta property="og:url" content="https://www.seusite.com" />
          <meta property="og:type" content="website" />

          {/* Favicon */}
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
