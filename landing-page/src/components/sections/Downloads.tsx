"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { Download, GitBranch } from "lucide-react";

export const Downloads = () => {
  return (
    <section id="downloads" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Downloads Section */}
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Get Started Today</h2>
          <p className="text-lg text-text-secondary mb-12">Download the MindCare application and begin your journey towards better mental wellness.</p>

          <div className="grid md:grid-cols-3 gap-6">
            <GlassCard hoverEffect variant="panel" className="flex flex-col items-center p-8 border-primary/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl">Latest</div>
              <Download className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-xl font-bold text-white mb-2">Android APK</h3>
              <p className="text-sm text-text-secondary mb-6">v1.0.0 • 45MB • Android 10+</p>
              <Button variant="primary" className="w-full">Download Now</Button>
            </GlassCard>

            <GlassCard className="flex flex-col items-center p-8 opacity-70">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <span className="text-2xl">🍎</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">iOS App</h3>
              <p className="text-sm text-text-secondary mb-6">Currently in development</p>
              <Button variant="glass" className="w-full" disabled>Coming Soon</Button>
            </GlassCard>

            <GlassCard hoverEffect className="flex flex-col items-center p-8">
              <GitBranch className="w-12 h-12 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-2">Source Code</h3>
              <p className="text-sm text-text-secondary mb-6">View on GitHub</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open("https://github.com/JahaganapathiSugumar/MindCare---Mental_health_care_app-Niral---project-", "_blank")}
              >
                View Repository
              </Button>
            </GlassCard>
          </div>
        </div>

      </div>
    </section>
  );
};
