import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { I18nProvider } from "@/components/i18n-provider";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lumatheorie.nl"),
  title: "LumaRijschool · Leer slimmer. Slaag sneller.",
  description:
    "Het slimste theorieplatform van Nederland. Meer dan 2.000 oefenvragen, CBR-stijl examens, AI-uitleg en een studieplanner. Slaag in één keer.",
  keywords: [
    "LumaRijschool",
    "theorie examen",
    "CBR",
    "rijbewijs",
    "verkeersregels",
    "Nederland",
    "AI tutor",
  ],
  authors: [{ name: "LumaRijschool" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "LumaRijschool · Leer slimmer. Slaag sneller.",
    description:
      "Meer dan 2.000 oefenvragen, CBR-stijl examens en AI-uitleg bij elke fout.",
    siteName: "LumaRijschool",
    type: "website",
    url: "https://lumatheorie.nl",
  },
  twitter: {
    card: "summary_large_image",
    title: "LumaRijschool · Leer slimmer. Slaag sneller.",
    description: "Meer dan 2.000 oefenvragen, CBR-stijl examens en AI-uitleg bij elke fout.",
  },
  alternates: {
    canonical: "https://lumatheorie.nl",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <body
        className={`${bricolage.variable} ${jakarta.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <I18nProvider>{children}</I18nProvider>
        </Providers>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </body>
    </html>
  );
}
