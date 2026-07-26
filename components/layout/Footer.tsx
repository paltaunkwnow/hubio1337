"use client";
// xd

import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Users, Heart, Globe } from "lucide-react";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.includes('/pos') || pathname?.includes('/admin')) return null;

  return (
    <footer className="w-full bg-bg-secondary border-t border-border pt-16 md:pt-20 pb-8 relative overflow-hidden section-transition">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/[0.02] blur-[150px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12 mb-12 md:mb-16">
          {/* Brand */}
          <div className="flex flex-col gap-4 sm:col-span-2 md:col-span-1">
            <BrandLogo href="/" />
            <p className="text-gray-400 text-sm leading-relaxed">
              Donde los negocios se conectan. Publicidad, empleo y servicios comerciales en una sola plataforma.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <a href="https://www.instagram.com/hubio.lat" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-bg-tertiary/50 border border-border flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand/30 hover:bg-brand/5 transition-all duration-300">
                <svg className="h-4 w-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="https://github.com/fernandocastedo" target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg bg-bg-tertiary/50 border border-border flex items-center justify-center text-gray-400 hover:text-brand hover:border-brand/30 hover:bg-brand/5 transition-all duration-300">
                <svg className="h-4 w-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </a>
            </div>
          </div>

          {/* Links: Módulos */}
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Módulos</h4>
            {[
              { href: "/anuncios", label: "Hubio Ads" },
              { href: "/servicios", label: "Hubio Services" },
              { href: "/empleos", label: "Hubio Jobs" },
              { href: "/herramientas", label: "Hubio Tools" },
              { href: "/asistente", label: "Asistente IA" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-gray-400 text-sm hover:text-brand transition-colors duration-300 py-1 hover:translate-x-1 transform transition-transform">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Links: Plataforma */}
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Plataforma</h4>
            {[
              { href: "/precios", label: "Planes y Precios" },
              { href: "/inversores", label: "Inversores" },
              { href: "/por-que-hubio", label: "Por qué Hubio" },
              { href: "/faq", label: "Preguntas Frecuentes" },
              { href: "/nosotros", label: "Nosotros" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-gray-400 text-sm hover:text-brand transition-colors duration-300 py-1 hover:translate-x-1 transform transition-transform">
                {link.label}
              </Link>
            ))}
          </div>

          {/* Links: Legal */}
          <div className="flex flex-col gap-2">
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Legal</h4>
            {[
              { href: "/terminos", label: "Términos y Condiciones" },
              { href: "/privacidad", label: "Política de Privacidad" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="text-gray-400 text-sm hover:text-brand transition-colors duration-300 py-1 hover:translate-x-1 transform transition-transform">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm flex items-center gap-2">
            © {new Date().getFullYear()} Hubio. Construido con <Heart className="h-3 w-3 text-brand/50" /> en Latinoamérica.
          </p>
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <Globe className="h-3.5 w-3.5 text-brand/30" />
            <span>Disponible en 15 países</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
