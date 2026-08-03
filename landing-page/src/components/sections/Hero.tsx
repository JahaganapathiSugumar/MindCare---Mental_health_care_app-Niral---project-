"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Play, Apple, FileText, GitBranch, ChevronDown, Sparkles, Brain } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] mix-blend-screen animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 w-full grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Text Content */}
        <div className="flex flex-col items-start gap-6 pt-12 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-primary/30 text-primary text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            <span>Introducing MindCare 1.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Meet <span className="text-gradient-primary">MindCare</span>
          </motion.h1>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl md:text-3xl font-medium text-text-secondary"
          >
            AI-Powered Mental Wellness Companion
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-text-secondary/80 max-w-xl"
          >
            A calm, intelligent AI companion that helps users improve emotional wellbeing through personalized conversations, mood insights, guided breathing, and daily wellness reports.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap gap-4 mt-4"
          >
            <Button variant="primary" size="lg">
              <Play className="w-5 h-5 fill-current" />
              <span>Download Android APK</span>
            </Button>
            <Button variant="glass" size="lg" className="opacity-50 cursor-not-allowed">
              <Apple className="w-5 h-5 fill-current" />
              <span>Coming Soon on iOS</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap gap-4 mt-2"
          >
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/10 text-text-secondary hover:text-white hover:border-white/30 hover:bg-white/5"
              onClick={() => window.open("https://github.com/JahaganapathiSugumar/MindCare---Mental_health_care_app-Niral---project-", "_blank")}
            >
              <GitBranch className="w-4 h-4" />
              <span>GitHub Repository</span>
            </Button>
          </motion.div>
        </div>

        {/* Right Visuals - Phone Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative lg:h-[700px] flex items-center justify-center lg:justify-end"
        >
          {/* Mockup Container */}
          <div className="relative w-[300px] h-[600px] rounded-[3rem] border-8 border-gray-900 bg-background overflow-hidden shadow-2xl shadow-primary/20 z-10">
            {/* Notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 rounded-b-2xl w-40 mx-auto z-20" />
            
            {/* Screen Content - Placeholder for App Demo */}
            <div className="absolute inset-0 bg-gradient-to-br from-card to-background flex flex-col items-center justify-center p-6 text-center">
               <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-32 h-32 rounded-full bg-primary/20 blur-xl absolute"
               />
               <Brain className="w-16 h-16 text-primary mb-6 relative z-10" />
               <h3 className="text-xl font-medium text-white relative z-10">Hello, I'm Nova.</h3>
               <p className="text-text-secondary mt-2 text-sm relative z-10">How are you feeling today?</p>
            </div>
          </div>
          
          {/* Floating UI Elements */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute top-1/4 -left-12 glass p-4 rounded-2xl z-20 shadow-xl border border-white/10 hidden md:block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
