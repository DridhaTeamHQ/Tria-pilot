import HeroTryOn from "@/components/brutal/HeroTryOn";
import Section from "@/components/brutal/Section";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F9F8F4] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] text-black overflow-x-hidden selection:bg-[#FF8C69] selection:text-black">
      {/* Hero Section - Extra top padding for fixed navbar */}
      <Section
        size="lg"
        maxWidth="full"
        className="pt-28 md:pt-36 lg:pt-40"
      >
        <HeroTryOn />
      </Section>

      {/* Spacer for scroll rhythm before footer */}
      <div className="h-20 md:h-32" />

      {/* Footer */}
      <footer className="border-t-[3px] border-black bg-[#F9F8F4]">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
          <Footer />
        </div>
      </footer>
    </main>
  );
}

