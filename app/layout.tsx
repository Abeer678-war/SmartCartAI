import { ClerkProvider } from "@clerk/nextjs";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import OpeningIntro from "../components/OpeningIntro";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700"] });
const body = Manrope({ subsets: ["latin"], variable: "--font-body" });

export const metadata = { title: "My Smart Cart", description: "Find the cheapest, best product from every store." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${display.variable} ${body.variable}`}>
        <body><OpeningIntro />{children}</body>
      </html>
    </ClerkProvider>
  );
}
