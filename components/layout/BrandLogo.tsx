"use client";
// Hubio — shared logo / wordmark (animated inline SVG)
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type BrandLogoProps = {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  iconSize?: number;
  href?: string;
};

export function BrandLogo({
  className,
  showWordmark = true,
  wordmarkClassName,
  iconSize = 32,
  href = "/",
}: BrandLogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2 group", className)}>
      <div 
        style={{ width: iconSize, height: iconSize }}
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-tr from-brand to-brand-light shadow-md shadow-brand/20 overflow-hidden group-hover:scale-105 transition-transform duration-300"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 512 512" 
          fill="none"
          className="w-4/5 h-4/5"
        >
          {/* Animated SVG Path for Hubio Logo */}
          <motion.path 
            d="M128 96v320"
            stroke="#FFFFFF" 
            strokeWidth="48" 
            strokeLinecap="square" 
            strokeLinejoin="miter"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.path 
            d="M128 256h208"
            stroke="#FFFFFF" 
            strokeWidth="48" 
            strokeLinecap="square" 
            strokeLinejoin="miter"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          />
          <motion.path 
            d="M176 208l48-48v128a104 104 0 0 0 208 0V96"
            stroke="#FFFFFF" 
            strokeWidth="48" 
            strokeLinecap="square" 
            strokeLinejoin="miter"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.6, ease: "easeInOut" }}
          />
        </svg>
      </div>
      {showWordmark && (
        <span
          className={cn(
            "font-display font-black text-2xl tracking-wider text-foreground transition-colors duration-300 group-hover:text-brand",
            wordmarkClassName
          )}
        >
          HUBIO
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}

