"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const screens = [
  { id: "login", title: "Login", desc: "Secure and seamless authentication." },
  { id: "onboarding", title: "Onboarding", desc: "Personalize your MindCare experience." },
  { id: "dashboard", title: "Dashboard", desc: "Your daily wellness overview at a glance." },
  { id: "chat", title: "AI Chat", desc: "Empathetic conversations anytime, anywhere." },
  { id: "voice", title: "Voice Chat", desc: "Talk naturally with your AI companion." },
  { id: "insights", title: "Mood Insights", desc: "Deep analytics into your emotional patterns." },
  { id: "report", title: "Daily Report", desc: "Comprehensive summary of your wellbeing." },
  { id: "safety", title: "Safety Circle", desc: "Connect with trusted contacts in emergencies." },
  { id: "profile", title: "Profile", desc: "Manage your preferences and data." },
];

export const Showcase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextScreen = () => setCurrentIndex((prev) => (prev + 1) % screens.length);
  const prevScreen = () => setCurrentIndex((prev) => (prev - 1 + screens.length) % screens.length);

  return (
    <section id="showcase" className="py-24 bg-background relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Experience <span className="text-gradient">MindCare</span></h2>
          <p className="text-lg text-text-secondary">A beautifully crafted interface designed to bring peace and clarity to your mind.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-24">
          
          {/* Text Content */}
          <div className="md:w-1/3 text-center md:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-2xl font-bold text-white mb-4">{screens[currentIndex].title}</h3>
                <p className="text-text-secondary text-lg">{screens[currentIndex].desc}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center md:justify-start gap-4 mt-8">
              <button 
                onClick={prevScreen}
                className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button 
                onClick={nextScreen}
                className="w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
            
            {/* Indicators */}
            <div className="flex items-center justify-center md:justify-start gap-2 mt-8">
              {screens.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`}
                />
              ))}
            </div>
          </div>

          {/* iPhone Mockup */}
          <div className="relative">
            <div className="w-[320px] h-[650px] rounded-[3rem] border-[12px] border-gray-900 bg-black relative overflow-hidden shadow-2xl shadow-primary/20">
              {/* Dynamic Notch */}
              <div className="absolute top-0 inset-x-0 h-7 bg-gray-900 rounded-b-3xl w-32 mx-auto z-50" />
              
              {/* Screen Content Container */}
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                    className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-black p-6 text-center"
                  >
                    <h4 className="text-white/50 font-medium text-sm tracking-widest uppercase mb-4">Screen Preview</h4>
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-center justify-center">
                      <span className="text-3xl">✨</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{screens[currentIndex].title}</h2>
                    <p className="text-sm text-gray-400">Image goes here</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
