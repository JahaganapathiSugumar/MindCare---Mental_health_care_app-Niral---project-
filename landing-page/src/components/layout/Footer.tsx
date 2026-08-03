import React from "react";
import { Brain, Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-background pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-semibold tracking-tight text-white">MindCare</span>
            </a>
            <p className="text-text-secondary max-w-sm">
              AI-Powered Mental Wellness Companion. A calm, intelligent AI that helps you improve emotional wellbeing through personalized conversations and insights.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-medium mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#downloads" className="text-text-secondary hover:text-white transition-colors">Downloads</a></li>
              <li><a href="#faq" className="text-text-secondary hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-4">Connect</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-text-secondary hover:text-white transition-colors">GitHub</a></li>
              <li><a href="#" className="text-text-secondary hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-text-secondary hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-text-secondary text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500 fill-current" /> by the MindCare Team
          </p>
          <p className="text-text-secondary text-sm">
            © {new Date().getFullYear()} MindCare. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
