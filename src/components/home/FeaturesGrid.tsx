"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart2, Camera, Search, Users, Globe } from "lucide-react";

const features = [
    {
        title: "Automated Content Creation",
        subtitle: "Create Faster. Stay Consistent.",
        icon: Camera,
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-1 md:row-span-2",
        backTitle: "AUTOMATED CONTENT CREATION",
        backBullets: ["AI Captions & Hashtags", "Auto Product Tagging", "Content Suggestions"],
        cta: "Explore Tools",
        ctaHref: "/influencer/dashboard",
        accent: "#FF8C69",
    },
    {
        title: "Influencer x Brand",
        subtitle: "Earn From Every Look You Share",
        icon: Users,
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-2 md:row-span-1",
        backTitle: "INFLUENCER X BRAND AFFILIATION",
        backBullets: ["Brand Collaborations", "Smart Affiliate Links", "Auto-Tracking & Payouts"],
        cta: "Learn More",
        ctaHref: "/about",
        accent: "#B4F056",
    },
    {
        title: "Product Discovery",
        subtitle: "Find The Right Products Instantly",
        icon: Search,
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-1 md:row-span-1",
        backTitle: "EASY PRODUCT DISCOVERY",
        backBullets: ["AI-Curated Collections", "Trending Products", "Brand-Approved Catalogs"],
        cta: "Discover",
        ctaHref: "/marketplace",
        accent: "#FF8C69",
    },
    {
        title: "Deep Analytics",
        subtitle: "Know What Truly Performs",
        icon: BarChart2,
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-2 md:row-span-1",
        backTitle: "DEEP ANALYTICS",
        backBullets: ["Clicks & Conversions", "Revenue Insights", "Audience Behavior"],
        cta: "View Insights",
        ctaHref: "/influencer/dashboard",
        accent: "#B4F056",
    },
    {
        title: "Social Integration",
        subtitle: "One Platform. All Channels.",
        icon: Globe,
        image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2000&auto=format&fit=crop",
        gridClass: "md:col-span-1 md:row-span-1",
        backTitle: "SOCIAL MEDIA INTEGRATION",
        backBullets: ["Instagram, YouTube & More", "Auto Link Insertion", "Unified Performance"],
        cta: "Connect",
        ctaHref: "/settings/profile",
        accent: "#FF8C69",
    },
];

function FlipCard({ feature, index }: { feature: (typeof features)[0]; index: number }) {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <motion.div
            className={`${feature.gridClass} relative min-h-[250px] ${index === 0 ? "min-h-[500px]" : ""}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1200 }}
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
        >
            <motion.div
                className="relative w-full h-full cursor-pointer"
                animate={{ scale: isFlipped ? 1.02 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
                {/* Back layer: normal 2D content (no mirroring possible) */}
                <motion.div
                    className={`absolute inset-0 w-full h-full rounded-xl border-[3px] border-black overflow-hidden bg-[#F9F8F4] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col justify-between ${isFlipped ? "z-20" : "z-0"}`}
                    initial={false}
                    animate={{ opacity: isFlipped ? 1 : 0 }}
                    transition={{ duration: 0.18, delay: isFlipped ? 0.26 : 0 }}
                    style={{ pointerEvents: isFlipped ? "auto" : "none" }}
                >
                    <div className="flex-1 overflow-y-auto">
                        <div
                            className="w-8 h-1 rounded-full mb-4"
                            style={{ backgroundColor: feature.accent }}
                        />
                        <h3 className="text-sm font-black uppercase text-black mb-3 tracking-tight">
                            {feature.backTitle}
                        </h3>
                        <ul className="space-y-2">
                            {feature.backBullets.map((bullet, i) => (
                                <li
                                    key={i}
                                    className="flex items-center gap-2 text-black/80 text-sm font-medium"
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: feature.accent }}
                                    />
                                    {bullet}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <Link
                        href={feature.ctaHref}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-black border-b-2 border-black pb-1 w-fit hover:bg-black hover:text-white px-2 -mx-2 py-1 rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {feature.cta}
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>

                {/* Front layer: 3D flip visual */}
                <div
                    className={`relative w-full h-full ${isFlipped ? "z-10" : "z-20"}`}
                    style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        transition: "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                >
                    <div
                        className="absolute inset-0 w-full h-full rounded-xl border-[3px] border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                        }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/30 z-10"
                            initial={false}
                            animate={{ opacity: isFlipped ? 0 : 1 }}
                            transition={{ duration: 0.2 }}
                        />
                        <img
                            src={feature.image}
                            alt={feature.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                            <h3 className="text-xl font-black text-white uppercase tracking-tight drop-shadow-sm">
                                {feature.title}
                            </h3>
                            <motion.div
                                className="flex items-center gap-2 text-white/90 mt-2 font-medium"
                                animate={{ x: [0, 4, 0] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <ArrowRight className="w-4 h-4" />
                                <span className="text-sm">Hover to explore</span>
                            </motion.div>
                        </div>
                        <div
                            className="absolute top-0 left-0 right-0 h-1 z-20"
                            style={{ backgroundColor: feature.accent }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function FeaturesGrid() {
    return (
        <section
            id="features"
            className="py-24 md:py-32 bg-[#F9F8F4] border-t-[3px] border-black relative overflow-hidden"
        >
            {/* Subtle gradient orbs for vibrancy */}
            <div
                className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #FF8C69 0%, transparent 70%)" }}
            />
            <div
                className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-20 pointer-events-none"
                style={{ background: "radial-gradient(circle, #B4F056 0%, transparent 70%)" }}
            />

            <div className="mx-auto max-w-7xl px-6 md:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="mb-14"
                >
                    <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-bold uppercase tracking-widest text-[#FF8C69]"
                    >
                        Our Features
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-black text-black mt-2 tracking-tighter"
                    >
                        What we are building
                    </motion.h2>
                </motion.div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[250px]"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={{
                        hidden: {},
                        visible: {
                            transition: { staggerChildren: 0.08, delayChildren: 0.1 },
                        },
                    }}
                >
                    {features.map((feature, index) => (
                        <FlipCard key={feature.title} feature={feature} index={index} />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
