"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { 
  Brain, 
  Activity, 
  Heart, 
  MessageSquare, 
  Mic, 
  LineChart, 
  Wind, 
  Calendar, 
  BookOpen, 
  ShieldCheck, 
  Globe, 
  Lightbulb 
} from "lucide-react";

export const Features = () => {
  const whyMindCare = [
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: "AI Companion",
      description: "A highly intelligent, empathetic AI that listens, understands, and responds to your emotional needs 24/7."
    },
    {
      icon: <Activity className="w-8 h-8 text-accent" />,
      title: "Mood Intelligence",
      description: "Advanced analytics that track your emotional patterns and provide actionable insights for better mental health."
    },
    {
      icon: <Heart className="w-8 h-8 text-pink-500" />,
      title: "Personalized Wellness",
      description: "Tailored exercises, guided breathing, and CBT-inspired techniques customized just for you."
    }
  ];

  const coreFeatures = [
    { icon: <MessageSquare className="w-6 h-6" />, title: "AI Chat", color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: <Mic className="w-6 h-6" />, title: "Voice Conversation", color: "text-purple-400", bg: "bg-purple-400/10" },
    { icon: <LineChart className="w-6 h-6" />, title: "Mood Detection", color: "text-green-400", bg: "bg-green-400/10" },
    { icon: <Calendar className="w-6 h-6" />, title: "Daily Reports", color: "text-orange-400", bg: "bg-orange-400/10" },
    { icon: <Wind className="w-6 h-6" />, title: "Guided Breathing", color: "text-teal-400", bg: "bg-teal-400/10" },
    { icon: <Activity className="w-6 h-6" />, title: "Wellness Streak", color: "text-red-400", bg: "bg-red-400/10" },
    { icon: <BookOpen className="w-6 h-6" />, title: "Reflection Journal", color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { icon: <ShieldCheck className="w-6 h-6" />, title: "Safety Circle", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { icon: <Globe className="w-6 h-6" />, title: "Multilingual Support", color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { icon: <Lightbulb className="w-6 h-6" />, title: "Explainable AI", color: "text-cyan-400", bg: "bg-cyan-400/10" },
    { icon: <Brain className="w-6 h-6" />, title: "CBT-inspired Guidance", color: "text-pink-400", bg: "bg-pink-400/10" },
    { icon: <Heart className="w-6 h-6" />, title: "Privacy Controls", color: "text-rose-400", bg: "bg-rose-400/10" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="features" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Why MindCare */}
        <div className="mb-32">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Why <span className="text-gradient-primary">MindCare?</span></h2>
            <p className="text-lg text-text-secondary">Designed with empathy and powered by advanced AI to provide a safe space for your mental wellness journey.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {whyMindCare.map((item, index) => (
              <GlassCard key={index} hoverEffect className="text-center group">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{item.title}</h3>
                <p className="text-text-secondary leading-relaxed">{item.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Core Features */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Everything you need</h2>
            <p className="text-lg text-text-secondary">A comprehensive suite of tools designed to support every aspect of your mental wellbeing.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {coreFeatures.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <GlassCard hoverEffect variant="panel" className="p-6 flex flex-col items-center justify-center text-center group h-full">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300`}>
                    <div className={feature.color}>{feature.icon}</div>
                  </div>
                  <h4 className="text-white font-medium">{feature.title}</h4>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
};
