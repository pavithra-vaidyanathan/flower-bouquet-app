import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { FleurChrome } from "@/components/fleur/FleurChrome";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-jost",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "fleur — bouquet de fleurs",
  description: "When words fall short, send flowers with them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jost.variable} ${cormorant.variable}`}>
      <body className={jost.className}>
        <FleurChrome>{children}</FleurChrome>
      </body>
    </html>
  );
}
