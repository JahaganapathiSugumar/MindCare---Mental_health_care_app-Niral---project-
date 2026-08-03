"use client";

import React from "react";
import { motion } from "framer-motion";
import { UserPlus, Settings, MessageSquare, BarChart, FileText, Sparkles } from "lucide-react";

export const HowItWorks = () => {
  const steps = [
    { icon: <UserPlus className="w-6 h-6" />, title: "Sign Up", delay: 0 },
    { icon: <Settings className="w-6 h-6" />, title: "Personalize", delay: 0.1 },
    { icon: <MessageSquare className="w-6 h-6" />, title: "AI Chat", delay: 0.2 },
    { icon: <BarChart className="w-6 h-6" />, title: "Mood Analysis", delay: 0.3 },
    { icon: <FileText className="w-6 h-6" />, title: "Daily Report", delay: 0.4 },
    { icon: <Sparkles className="w-6 h-6" />, title: "Wellness Journey", delay: 0.5 },
  ];

  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">How It Works</h2>
          <p className="text-lg text-text-secondary">A simple, seamless journey to better mental wellbeing.</p>
        </div>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: step.delay }}
                className="flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300 border border-white/10 relative">
                  <div className="text-white relative z-10">{step.icon}</div>
                </div>
                <h4 className="text-white font-medium text-sm md:text-base">{step.title}</h4>
                
                {/* Mobile Connector */}
                {index < steps.length - 1 && index % 2 === 0 && (
                  <div className="md:hidden absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
