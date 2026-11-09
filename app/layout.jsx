import { Saira, Montserrat, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const saira = Saira({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  style: ["italic"],
  variable: "--f-sport",
  display: "swap",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--f-text",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
  variable: "--f-serif",
  display: "swap",
});

export const metadata = {
  title: "Chal Five — Faisons connaissance",
  description:
    "Futsal, terrasse, salon de thé et bien-être à Bonamoussadi. Prenez votre mi-temps !",
  icons: { icon: "/symbole.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0D0D",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${saira.variable} ${montserrat.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
