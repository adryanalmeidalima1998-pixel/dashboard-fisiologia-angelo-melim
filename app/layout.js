import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata = {
  title: "Ângelo Melim — Fisiologia & Performance",
  description: "Central de Fisiologia & Performance",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
