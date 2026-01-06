"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, BarChart2, Camera, Globe, Search, Users } from "lucide-react";

const features = [
    {
        title: "Automated Content Creation",
        subtitle: "Create Faster. Stay Consistent.",
        icon: Camera,
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-1 md:row-span-2",
        // Back content
        backTitle: "AUTOMATED CONTENT CREATION",
        backSubtitle: "Automated Content Creation",
        backBullets: ["AI Captions & Hashtags", "Auto Product Tagging", "Content Suggestions"],
        backCta: "Explore Tools"
    },
    {
        title: "Influencer x Brand Affiliation",
        subtitle: "Earn From Every Look You Share",
        icon: Users,
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-2 md:row-span-1",
        backTitle: "INFLUENCER X BRAND AFFILIATED MARKETING",
        backSubtitle: "Monetize Your Fashion Content Seamlessly With Built-In Affiliate Tools.",
        backBullets: ["Influencer X Brand Collaborations", "Smart Affiliate Links", "Auto-Tracking & Payouts", "Multi-Brand Integrations"],
        backCta: "Learn More"
    },
    {
        title: "Easy Product Discovery",
        subtitle: "Find The Right Products Instantly",
        icon: Search,
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-1 md:row-span-1",
        backTitle: "EASY PRODUCT DISCOVERY",
        backSubtitle: "Discover Fashion Products Matched To Your Style And Audience.",
        backBullets: ["AI-Curated Collections", "Trending Products", "Brand-Approved Catalogs"],
        backCta: "Discover Products"
    },
    {
        title: "Deep Analytics",
        subtitle: "Know What Truly Performs",
        icon: BarChart2,
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-2 md:row-span-1",
        backTitle: "DEEP ANALYTICS",
        backSubtitle: "Track Your Performance Across Products, Platforms, And Campaigns.",
        backBullets: ["Clicks & Conversions", "Revenue Insights", "Audience Behavior"],
        backCta: "View Insights"
    },
    {
        title: "Social Media Integration",
        subtitle: "One Platform. All Channels.",
        icon: Globe,
        image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-1 md:row-span-1",
        backTitle: "SOCIAL MEDIA INTEGRATION",
        backSubtitle: "Connect Your Social Accounts And Manage Everything In One Place.",
        backBullets: ["Instagram, YouTube & More", "Auto Link Insertion", "Unified Performance View"],
        backCta: "Connect Accounts"
    }
];

function FlipCard({ feature, index }: { feature: typeof features[0]; index: number }) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <motion.div
            className={`${feature.gridClass} relative group min-h-[250px] ${index === 0 ? 'min-h-[500px]' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            style={{ perspective: 1000 }}
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <div
                className="relative w-full h-full transition-transform duration-700 ease-in-out"
                style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                }}
            >
                {/* Front Side */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <div className="absolute inset-0 bg-black/30 z-10" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20" />
                    <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                    {/* Front Content */}
                    <div className="absolute bottom-0 left-0 p-8 z-30 w-full">
                        <h3 className="text-2xl font-bold text-white mb-2 leading-tight uppercase">
                            {feature.title}
                        </h3>
                        <div className="flex items-center gap-2 text-white/60">
                            <ArrowRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Back Side */}
                <div
                    className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden bg-charcoal text-white p-6 flex flex-col justify-between"
                    style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)"
                    }}
                >
                    <div className="overflow-y-auto flex-1">
                        <h3 className="text-base md:text-lg font-bold uppercase mb-1 leading-tight">
                            {feature.backTitle}
                        </h3>
                        <p className="text-white/60 text-xs mb-4 line-clamp-2">
                            {feature.backSubtitle}
                        </p>
                        <ul className="space-y-2">
                            {feature.backBullets.map((bullet, i) => (
                                <li key={i} className="flex items-center gap-2 text-white/90">
                                    <ArrowRight className="w-3 h-3 text-peach flex-shrink-0" />
                                    <span className="text-xs md:text-sm">{bullet}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex items-center gap-2 text-peach font-medium text-xs cursor-pointer hover:gap-3 transition-all mt-4 pt-2 border-t border-white/10">
                        <ArrowRight className="w-3 h-3" />
                        <span>{feature.backCta}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function FeaturesGrid() {
    return (
        <section id="features" className="py-24 bg-cream relative overflow-hidden">
            <div className="container mx-auto px-6">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-16 text-left"
                >
                    <span className="text-peach font-semibold tracking-wider text-sm uppercase">Our Features</span>
                    <h2 className="text-5xl md:text-6xl font-serif text-charcoal mt-3">
                        What we are building
                    </h2>
                </motion.div>

                {/* Bento Grid with Flip Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[250px]">
                    {features.map((feature, index) => (
                        <FlipCard key={index} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
