import Hero from "@/components/home/Hero";
import FeaturesGrid from "@/components/home/FeaturesGrid";
import ValuesSection from "@/components/home/ValuesSection";
import PlatformSection from "@/components/home/PlatformSection";
import CTASection from "@/components/home/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
    return (
        <main className="min-h-screen bg-[#F9F8F4] text-black overflow-x-hidden selection:bg-[#FF8C69] selection:text-black">
            {/* Hero - Where Fashion Meets AI */}
            <Hero />

            {/* Features - flip cards */}
            <FeaturesGrid />

            {/* Values - what we stand for */}
            <ValuesSection />

            {/* Platform - for brands / for influencers */}
            <PlatformSection />

            {/* CTA - Ready to Transform Fashion? */}
            <CTASection />

            {/* Footer */}
            <footer className="border-t-[3px] border-black bg-[#F9F8F4]">
                <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
                    <Footer />
                </div>
            </footer>
        </main>
    );
}
