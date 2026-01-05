import Hero from "@/components/home/Hero";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import PlatformSection from "@/components/home/PlatformSection";
import ValuesSection from "@/components/home/ValuesSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Hero />
      <FeaturesGrid />
      <PlatformSection />
      <ValuesSection />
      <CTASection />
      <Footer />
    </main>
  );
}
