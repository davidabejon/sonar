import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { GlobalStyles } from "./GlobalStyles";

export const metadata: Metadata = {
  title: "sonar - tu música, tu memoria",
  description: "Una app para calificar y recordar las canciones que escuchas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/sonar.png" />
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
        <GlobalStyles />
      </head>
      <body style={{ margin: 0, padding: 0, width: "100%", minHeight: "100svh" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
