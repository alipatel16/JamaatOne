// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Mozilla+Text:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html, body, #root {
            min-height: 100%;
            background: #F7F8F6;
          }
          body, button, input, textarea {
            font-family: "Mozilla Text", Inter, system-ui, sans-serif;
          }
          * { box-sizing: border-box; }
        `}</style>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
