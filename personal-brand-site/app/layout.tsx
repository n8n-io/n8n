import type { Metadata } from "next";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Linh Tran — Creative Designer & Brand Strategist",
  description:
    "Personal portfolio of Linh Tran — designing bold identities and motion-driven experiences for ambitious brands.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise font-sans bg-ink text-cream overflow-x-hidden">
        <PageTransition />
        <CustomCursor />
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
