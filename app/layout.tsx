import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
      <body style={{ margin: 0, padding: 0, width: "100%", height: "100vh" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
