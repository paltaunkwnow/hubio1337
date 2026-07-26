// xd
// Hubio — Digital business platform (root layout, SEO, shell)
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Providers } from "@/components/layout/Providers";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Zap } from "lucide-react";


const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["600", "700", "800"] });
const dmMono = DM_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-mono" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hubio.lat";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hubio | Donde los negocios se conectan",
    template: "%s | Hubio",
  },
  description:
    "Conectamos empresas, profesionales y propietarios de espacios en una única plataforma para publicidad, empleo y servicios comerciales.",
  applicationName: "Hubio",
  keywords: [
    "Hubio",
    "marketplace",
    "publicidad",
    "empleos",
    "servicios freelance",
    "Latinoamérica",
  ],
  authors: [{ name: "Hubio" }],
  creator: "Hubio",
  openGraph: {
    type: "website",
    locale: "es_LA",
    url: siteUrl,
    siteName: "Hubio",
    title: "Hubio | Donde los negocios se conectan",
    description:
      "Publicidad, empleo y servicios comerciales en una sola plataforma.",
    images: [{ url: "/logo/hubio.png", width: 512, height: 512, alt: "Hubio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hubio | Donde los negocios se conectan",
    description:
      "Donde los negocios se conectan. Publicidad, empleo y servicios en Latinoamérica.",
    images: ["/logo/hubio.png"],
  },
  icons: {
    icon: [{ url: "/logo/hubio.png", type: "image/png" }],
    shortcut: "/logo/hubio.png",
    apple: "/logo/hubio.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let config = null;
  if (process.env.DATABASE_URL) {
    try {
      config = await prisma.globalConfig.findUnique({ where: { id: "singleton" } });
    } catch (error) {
      console.error("Failed to load global config in RootLayout:", error);
    }
  }
  let session = null;
  let isAdmin = false;
  try {
    session = await getServerSession(authOptions);
    isAdmin = (session?.user as any)?.roles?.includes("ADMIN");
  } catch (error) {
    console.error("Failed to load session in RootLayout:", error);
  }

  if (config?.maintenanceMode && !isAdmin) {
    return (
      <html lang="es" className="dark" suppressHydrationWarning>
        <body className="bg-black text-white flex flex-col items-center justify-center min-h-screen p-4 text-center font-sans">
           <div className="h-20 w-20 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-8 animate-pulse">
              <Zap className="h-10 w-10" />
           </div>
           <h1 className="text-4xl font-display font-black mb-4 uppercase tracking-tighter">Mantenimiento en Curso</h1>
           <p className="text-gray-500 max-w-md mx-auto leading-relaxed mb-8">
             {config?.maintenanceMessage || "Estamos optimizando el ecosistema HUBIO. Volveremos en unos minutos con mejoras significativas."}
           </p>
           <div className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
              Operación Administrativa Activa
           </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="es" className={cn("font-sans dark", jakarta.variable, outfit.variable, dmMono.variable)} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const theme = localStorage.getItem('hubio-theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
              }
            } catch(e) {}
          `
        }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <AnnouncementBar />
          <Header />
          <main className="flex-1 w-full flex flex-col">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
