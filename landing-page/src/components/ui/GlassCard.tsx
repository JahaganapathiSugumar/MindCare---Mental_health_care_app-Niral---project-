import { cn } from "@/lib/utils";
import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  variant?: "base" | "panel";
  hoverEffect?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, variant = "base", hoverEffect = false, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={hoverEffect ? { y: -5, boxShadow: "0 10px 40px rgba(59,130,246,0.15)" } : undefined}
        className={cn(
          "rounded-3xl p-6 lg:p-8 overflow-hidden relative",
          variant === "base" ? "glass" : "glass-panel",
          className
        )}
        {...props}
      >
        {/* Subtle inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        {children}
      </motion.div>
    );
  }
);
GlassCard.displayName = "GlassCard";
