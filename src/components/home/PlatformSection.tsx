"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BarChart2, CheckCircle, ShoppingBag, Users } from "lucide-react";

export default function PlatformSection() {
    const [activeTab, setActiveTab] = useState<"brands" | "influencers">("influencers");

    return (
        <section className="py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6">

                {/* Header */}
                <div className="text-center mb-16">
                    <span className="text-peach font-semibold tracking-wider text-sm uppercase">Our Platform</span>
                    <h2 className="text-5xl md:text-6xl font-serif text-charcoal mt-3 mb-8">
                        Everything We Give You
                    </h2>

                    {/* Custom Toggle */}
                    <div className="inline-flex items-center p-1.5 bg-cream rounded-full border border-charcoal/5">
                        <button
                            onClick={() => setActiveTab("brands")}
                            className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === "brands"
                                ? "bg-charcoal text-white shadow-lg"
                                : "text-charcoal/60 hover:text-charcoal"
                                }`}
                        >
                            For Brands
                        </button>
                        <button
                            onClick={() => setActiveTab("influencers")}
                            className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === "influencers"
                                ? "bg-charcoal text-white shadow-lg"
                                : "text-charcoal/60 hover:text-charcoal"
                                }`}
                        >
                            For Influencers
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="bg-cream/50 rounded-[3rem] p-8 md:p-16 border border-charcoal/5">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.4 }}
                            className="grid md:grid-cols-2 gap-12 items-center"
                        >
                            {/* Text Content */}
                            <div className="space-y-8">
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border border-charcoal/10"
                                >
                                    {activeTab === "brands" ? <ShoppingBag className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                    <span className="text-xs font-semibold uppercase tracking-wide">
                                        {activeTab === "brands" ? "For Brands" : "For Influencers"}
                                    </span>
                                </motion.div>

                                <h3 className="text-4xl md:text-5xl font-serif text-charcoal leading-tight">
                                    {activeTab === "brands"
                                        ? "Reach Gen-Z Authentically"
                                        : "Turn Your Influence Into Income"}
                                </h3>

                                <p className="text-lg text-charcoal/70 leading-relaxed font-light">
                                    {activeTab === "brands"
                                        ? "Connect with verified influencers, launch powerful campaigns, and track real-time performance with our comprehensive analytics suite."
                                        : "Join thousands of creators earning through AI-powered Try-Ons, branded collaborations, and high-commission affiliate links."}
                                </p>

                                {/* Features List */}
                                <div className="space-y-4">
                                    {(activeTab === "brands" ? [
                                        "Access Thousands Of Verified Gen-Z Influencers",
                                        "AI-Powered Content Moderation And Brand Protection",
                                        "Real-Time Insights And Performance Tracking"
                                    ] : [
                                        "AI Virtual Try-On Without Ordering Physical Items",
                                        "Earn Up To 10% – 30% Per Sale",
                                        "Share Directly To Your Social Feeds"
                                    ]).map((item, i) => (
                                        <motion.div
                                            key={item}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + (i * 0.1) }}
                                            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-charcoal/5 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-peach/10 flex items-center justify-center text-peach">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                            <span className="text-charcoal/80 font-medium">{item}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                <Link href={activeTab === "brands" ? "/register?role=brand" : "/register?role=influencer"}>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="px-8 py-4 bg-charcoal text-white rounded-full font-medium inline-flex items-center gap-2 mt-4 hover:bg-black transition-colors"
                                    >
                                        {activeTab === "brands" ? "Join as Brand" : "Join as Influencer"}
                                        <ArrowRight className="w-4 h-4" />
                                    </motion.button>
                                </Link>
                            </div>

                            {/* Image Visual */}
                            <div className="relative h-[600px] w-full bg-charcoal rounded-[2rem] overflow-hidden shadow-2xl">
                                <img
                                    src={activeTab === "brands"
                                        ? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop"
                                        : "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2000&auto=format&fit=crop"
                                    }
                                    alt="Platform Preview"
                                    className="w-full h-full object-cover opacity-80"
                                    loading="lazy"
                                    decoding="async"
                                />

                                {/* Overlay UI Mockups (Decorative) */}
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.6 }}
                                    className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/20" />
                                            <div>
                                                <div className="h-2 w-24 bg-white/40 rounded-full mb-1" />
                                                <div className="h-2 w-16 bg-white/20 rounded-full" />
                                            </div>
                                        </div>
                                        <BarChart2 className="text-peach" />
                                    </div>
                                    <div className="h-24 w-full bg-white/5 rounded-xl flex items-end justify-between px-2 pb-2 gap-2">
                                        {[40, 70, 50, 90, 60, 80, 50].map((h, i) => (
                                            <div key={i} className="w-full bg-peach/80 rounded-t-sm" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
