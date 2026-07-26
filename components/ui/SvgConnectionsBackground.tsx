"use client";

import { motion } from "framer-motion";

export function SvgConnectionsBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none">
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.05" />
          </linearGradient>
          
          <linearGradient id="line-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>

          <pattern id="dot-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#2563EB" fillOpacity="0.15" />
          </pattern>
        </defs>

        {/* Base Grid */}
        <rect width="100%" height="100%" fill="url(#dot-grid)" />

        {/* Animated Constellation Lines */}
        {/* Connection 1 */}
        <motion.path
          d="M 100 200 L 300 150 L 450 350"
          stroke="url(#grid-grad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        
        {/* Connection 2 */}
        <motion.path
          d="M 800 100 L 950 250 L 1100 150"
          stroke="url(#grid-grad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 5, delay: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />

        {/* Connection 3 */}
        <motion.path
          d="M 200 600 L 400 700 L 600 550"
          stroke="url(#grid-grad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 6, delay: 0.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />

        {/* Connection 4 */}
        <motion.path
          d="M 1200 500 L 1350 700 L 1500 550"
          stroke="url(#grid-grad)"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 4.5, delay: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />

        {/* Data pulses flowing on lines */}
        <path
          d="M 100 200 L 300 150 L 450 350"
          stroke="url(#line-glow)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="80 150"
          className="animate-scanline"
          style={{
            animation: "pulseFlow 6s linear infinite",
          }}
        />
        
        <path
          d="M 800 100 L 950 250 L 1100 150"
          stroke="url(#line-glow)"
          strokeWidth="3"
          fill="none"
          strokeDasharray="60 120"
          style={{
            animation: "pulseFlow 8s linear infinite reverse",
          }}
        />

        {/* Glowing Nodos */}
        <motion.circle
          cx="300"
          cy="150"
          r="4"
          fill="#3B82F6"
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="450"
          cy="350"
          r="5"
          fill="#2563EB"
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: [0.8, 1.6, 0.8], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 4, delay: 1, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="950"
          cy="250"
          r="4"
          fill="#3B82F6"
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="400"
          cy="700"
          r="5"
          fill="#2563EB"
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: [0.8, 1.6, 0.8], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 4.2, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="1350"
          cy="700"
          r="4.5"
          fill="#3B82F6"
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 3.8, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
      <style jsx global>{`
        @keyframes pulseFlow {
          0% {
            stroke-dashoffset: 230;
          }
          100% {
            stroke-dashoffset: -230;
          }
        }
      `}</style>
    </div>
  );
}
