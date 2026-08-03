"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "../ui/GlassCard";
import { Button } from "../ui/Button";
import { ChevronDown, GraduationCap, Download, FileText, GitBranch } from "lucide-react";

export const TeamAndFAQ = () => {
  const team = [
    { name: "Jahaganapathi S", role: "Developer", image: "https://res.cloudinary.com/dyxu6ylng/image/upload/v1785742757/jahaganapathi.jpg" },
    { name: "Kajol Sushmitha K", role: "Developer", image: "" },
    { name: "Kamal Kishore V", role: "Developer", image: "https://res.cloudinary.com/dyxu6ylng/image/upload/v1785742914/kamal.jpg" },
  ];

  const faqs = [
    { q: "What is MindCare?", a: "MindCare is an AI-powered mental wellness application designed to help users track their mood, practice guided breathing, and converse with an intelligent, empathetic AI companion." },
    { q: "Is data secure?", a: "Yes, we use enterprise-grade encryption and secure database architecture (Firebase/Firestore) to ensure all your personal data and conversations remain completely private." },
    { q: "How is AI used?", a: "We utilize Gemini AI to power our conversational agent, analyze mood patterns from text, and provide personalized wellness recommendations." },
    { q: "Can I download reports?", a: "Yes, MindCare generates daily wellness reports that summarize your emotional trends and activities, which you can easily review." },
    { q: "How is privacy protected?", a: "Your data is anonymized and never shared with third parties. You have full control to delete your chat history and account data at any time." },
  ];

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="relative">
      {/* Team Section */}
      <section id="team" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Meet the <span className="text-gradient">Team</span></h2>
            <p className="text-lg text-text-secondary">The passionate minds behind MindCare.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {team.map((member, index) => (
              <GlassCard key={index} hoverEffect className="text-center">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/10 border-2 border-white/20 mb-6 overflow-hidden">
                   {member.image ? (
                     <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                   )}
                </div>
                <h3 className="text-xl font-bold text-white">{member.name}</h3>
                <p className="text-primary mt-1">{member.role}</p>
              </GlassCard>
            ))}
          </div>

          <div className="max-w-2xl mx-auto">
            <GlassCard variant="panel" className="flex flex-col md:flex-row items-center gap-8 p-8 border-accent/30">
              <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 shrink-0 flex items-center justify-center overflow-hidden">
                <img src="https://res.cloudinary.com/dyxu6ylng/image/upload/v1785742868/nshanthi.588b424e06457f65a78d_a3ifzj.webp" alt="Dr. N. Shanthi" className="w-full h-full object-cover" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-accent text-sm font-bold uppercase tracking-wider mb-2">Project Guide</p>
                <h3 className="text-2xl font-bold text-white">Dr. N. Shanthi</h3>
                <p className="text-text-secondary mt-1">Senior Professor & Dean</p>
                <p className="text-text-secondary">Department of Computer Science and Engineering</p>
                <p className="text-white font-medium mt-2">Kongu Engineering College</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-background/50 relative z-10">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-white/10 rounded-2xl overflow-hidden glass">
                <button
                  className="w-full px-6 py-4 flex items-center justify-between text-left text-white font-medium focus:outline-none"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <span className="text-lg">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${openFaq === index ? "rotate-180 text-primary" : "text-text-secondary"}`} />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-4 text-text-secondary leading-relaxed border-t border-white/5 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 rounded-[100%] blur-[120px] -z-10" />
        <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            Ready to experience <br className="hidden md:block" />
            <span className="text-gradient-primary">AI-powered mental wellness?</span>
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              <Download className="w-5 h-5" />
              <span>Download APK</span>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto border-white/10"
              onClick={() => window.open("https://github.com/JahaganapathiSugumar/MindCare---Mental_health_care_app-Niral---project-", "_blank")}
            >
              <GitBranch className="w-5 h-5" />
              <span>GitHub</span>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
