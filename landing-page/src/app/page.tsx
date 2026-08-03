import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Showcase } from "@/components/sections/Showcase";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Downloads } from "@/components/sections/Downloads";
import { TeamAndFAQ } from "@/components/sections/TeamAndFAQ";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
        <Hero />
        <Features />
        <Showcase />
        <HowItWorks />
        <Downloads />
        <TeamAndFAQ />
      </main>
      <Footer />
    </>
  );
}
